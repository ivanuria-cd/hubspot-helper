import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/functional',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  // Informe 2026-07-02 §10.10: artefactos de diagnóstico en fallos (los e2e de Electron son
  // difíciles de depurar sin trace) y un reintento para absorber flakes de arranque.
  retries: 1,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
