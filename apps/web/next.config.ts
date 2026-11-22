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
    // Production uses Caddy unless a build explicitly opts into the API proxy.
    const apiProxyUrl =
      process.env.API_PROXY_URL ??
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000'
        : undefined);
    return Promise.resolve(
      apiProxyUrl
        ? [
            {
              source: '/api/:path*',
              destination: `${apiProxyUrl}/api/:path*`,
            },
          ]
        : [],
    );
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
