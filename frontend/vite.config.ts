import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    css: true,

    // Vitest should only run frontend unit/component tests.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
    ],

    // Do not let Vitest run Playwright E2E tests.
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e/**',
      'playwright-report/**',
      'test-results/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
        '**/vite-env.d.ts',
      ],
    },
  },
});