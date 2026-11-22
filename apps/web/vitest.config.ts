import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [react()],
  test: {
    name: 'web',
    include: ['apps/web/test/**/*.test.{ts,tsx}'],
    exclude: ['apps/web/e2e/**'],
    environment: 'jsdom',
  },
});
