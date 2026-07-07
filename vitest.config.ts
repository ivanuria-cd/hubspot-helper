import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // §11.7: deprecado en Vitest 2.1+; migrar a `projects` (o directiva por fichero) antes de
    // subir a Vitest 3. Se mantiene mientras la versión fijada lo soporte.
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
    // Informe 2026-07-02 §11.4: unión de los alias de tsconfig.main + tsconfig.renderer (Vitest
    // ejecuta ambos procesos con una sola config). El typecheck por proceso sigue siendo la
    // fuente de verdad: un spec que use un alias del otro proceso compila aquí pero falla en
    // `npm run typecheck` — mantener ambos en verde.
    alias: {
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/renderer/shared'),
    },
  },
});
