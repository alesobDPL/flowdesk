import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@flowdesk/shared'],
  // shared uses NodeNext .js specifiers that point to TypeScript source.
  webpack(config: {
    resolve?: { extensionAlias?: Record<string, string | string[]> };
  }) {
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        ...config.resolve?.extensionAlias,
        '.js': ['.ts', '.tsx', '.js'],
      },
    };
    return config;
  },
  rewrites() {
    return Promise.resolve(
      process.env.NODE_ENV === 'development'
        ? [
            {
              source: '/api/:path*',
              destination: 'http://localhost:4000/api/:path*',
            },
          ]
        : [],
    );
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
