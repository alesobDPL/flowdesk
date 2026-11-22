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
          name: 'api',
          include: ['apps/api/test/**/*.test.ts'],
          globalSetup: ['apps/api/test/helpers/global-setup.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
