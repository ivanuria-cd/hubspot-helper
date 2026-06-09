import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['**/*.spec.tsx', 'jsdom']],
    setupFiles: ['tests/unit/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'tests/unit/**/*.spec.{ts,tsx}'],
    exclude: ['tests/functional/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/renderer/shared'),
    },
  },
});
