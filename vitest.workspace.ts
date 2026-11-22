import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          include: ['packages/shared/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'api-unit',
          include: ['apps/api/test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'api-integration',
          include: ['apps/api/test/integration/**/*.test.ts'],
          globalSetup: ['apps/api/test/helpers/global-setup.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
