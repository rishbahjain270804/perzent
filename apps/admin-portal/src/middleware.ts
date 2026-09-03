import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────────
 *  PRE-LAUNCH MODE
 *  While enabled, marketing pages redirect to /coming-soon. Auth, dashboard, kiosk,
 *  the Play-declared legal pages and the APK download stay reachable — locking those
 *  breaks logins for testers and the privacy/account-deletion URLs filed with Google.
 *  Disable by setting NEXT_PUBLIC_PRE_LAUNCH=false (no code change needed).
 * ──────────────────────────────────────────────── */
const PRE_LAUNCH_MODE = process.env.NEXT_PUBLIC_PRE_LAUNCH !== 'false';

const PRE_LAUNCH_EXEMPT_PAGES = new Set([
  '/coming-soon',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/account-deletion',
  '/support',
  '/faq',
  '/download',
]);
const PRE_LAUNCH_EXEMPT_PREFIXES = ['/dashboard', '/kiosk', '/operator'];

const STATIC_FILE = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|txt|xml|json|webmanifest|apk|css|js|map|mp4|pdf)$/i;

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

  const isPassthrough =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    STATIC_FILE.test(pathname);

  const isPreLaunchExempt =
    PRE_LAUNCH_EXEMPT_PAGES.has(pathname) ||
    PRE_LAUNCH_EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isPassthrough && PRE_LAUNCH_MODE && !isPreLaunchExempt) {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  if (origin) addCorsHeaders(response, origin);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
