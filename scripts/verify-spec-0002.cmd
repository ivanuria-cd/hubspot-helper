@echo off
REM === SPEC-0002 — App Shell: instalacion y verificacion (Windows cmd) ===
REM Ejecutar desde la raiz del proyecto: C:\Users\IvanUria\Documents\Claude\Projects\HubSpotHelper

REM 1) Crear la rama del SPEC
git checkout -b feat/spec-0002-app-shell

REM 2) Instalar dependencias (incluye react-router-dom, @mui/icons-material y testing-library)
call npm install

REM 3) Typecheck (main + renderer)
call npm run typecheck

REM 4) Tests unitarios (Vitest)
call npm run test:unit

REM 5) Build necesario para los tests funcionales
call npm run build

REM 6) Tests funcionales (Playwright + Electron)
call npm run test:e2e

REM 7) Arranque en desarrollo para validacion visual
call npm run dev
