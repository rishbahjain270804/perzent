/** @type {import('next').NextConfig} */

// Defence-in-depth headers for every response. No CSP yet: Leaflet tiles, Google Fonts and the
// inline theme-boot script would need a nonce/hash pass first — tracked as follow-up work.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  transpilePackages: ['@perzent/shared-types', '@perzent/location-engine', '@perzent/database'],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: '/owner-admin',
        destination: '/dashboard',
      },
      {
        source: '/owner-admin/:path*',
        destination: '/dashboard/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
