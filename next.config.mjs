/** @type {import('next').NextConfig} */
/**
 * `next build` / `next start` use `.next`. Local `next dev` uses `.next-dev` when `NEXT_DIST_DEV=1`
 * (see `package.json`). Sharing one output folder between production builds and the dev server can
 * leave dev returning 404 HTML for `/_next/static/css/app/*.css` and core chunks — browsers then
 * report MIME type errors (`text/html` instead of CSS/JS).
 */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DEV === '1' ? '.next-dev' : '.next',
  transpilePackages: ['three'],
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/nocturnal-labs-logo.png' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
