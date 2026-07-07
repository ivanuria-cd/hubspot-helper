# tests/functional

Tests funcionales end-to-end con **Playwright** sobre Electron. Flujos 100 % locales (sin portal HubSpot ni
Drive conectados); todos los launch fuerzan `--lang=es` y un `--user-data-dir` temporal (SPEC-0002 §26).

Ejecutar: `npm run test:e2e` (compila antes vía `pretest:e2e`).
