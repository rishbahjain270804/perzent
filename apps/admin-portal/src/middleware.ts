import { NextRequest, NextResponse } from 'next/server';

function configuredOrigins(request: NextRequest) {
  const values = [
    request.nextUrl.origin,
    process.env.NEXT_PUBLIC_EMPLOYEE_APP_URL,
    process.env.NEXT_PUBLIC_OWNER_ADMIN_URL,
  ].filter(Boolean) as string[];
  return new Set(values.map((value) => {
    try { return new URL(value).origin; } catch { return value; }
  }));
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = !origin || configuredOrigins(request).has(origin);
  if (!allowed) return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });

  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export const config = { matcher: '/api/:path*' };
