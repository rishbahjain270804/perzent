/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@perzent/shared-types', '@perzent/location-engine', '@perzent/database'],
  reactStrictMode: true,
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
