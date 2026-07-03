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
      // Informe 2026-07-02 §10.9: el objetivo del 80 % (SPEC-0000 §8) pasa a ser verificable.
      // Umbral inicial conservador (60) para no romper mientras se cierra la deuda de tests;
      // subir hacia 80 conforme crezca la cobertura.
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
      },
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
