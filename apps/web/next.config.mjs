import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/config.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mawaqie/shared'],
  // Lint is run separately in CI — don't fail production builds on ESLint.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Brand logo assets are local, trusted SVGs
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'localhost:3003', 'localhost:3006'] },
  },
};

export default withNextIntl(nextConfig);
