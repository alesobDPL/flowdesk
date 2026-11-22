import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  transpilePackages: ['@flowdesk/shared'],
  headers() {
    // Next's hydration uses inline scripts; production does not need eval.
    const developmentScripts =
      process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentScripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]);
  },
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
