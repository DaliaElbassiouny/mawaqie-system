import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/config.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cdc/shared'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'localhost:3003', 'localhost:3006'] },
  },
};

export default withNextIntl(nextConfig);
