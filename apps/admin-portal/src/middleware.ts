import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────────
 *  PRE-LAUNCH MODE
 *  Set to `true` to lock ALL public pages to /coming-soon.
 *  When you're ready to launch, flip this to `false`.
 * ──────────────────────────────────────────────── */
const PRE_LAUNCH_MODE = true;

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

function addCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.headers.set('Vary', 'Origin');
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = !origin || configuredOrigins(request).has(origin);
  if (!allowed) return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });

  const { pathname } = request.nextUrl;

  // Always allow: API routes, static assets, Next.js internals, coming-soon page
  const isPassthrough =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/coming-soon';

  if (isPassthrough) {
    const response = request.method === 'OPTIONS'
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();
    if (origin) addCorsHeaders(response, origin);
    return response;
  }

  // PRE-LAUNCH: redirect every other page to /coming-soon
  if (PRE_LAUNCH_MODE) {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // Normal mode: pass through with CORS
  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  if (origin) addCorsHeaders(response, origin);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
