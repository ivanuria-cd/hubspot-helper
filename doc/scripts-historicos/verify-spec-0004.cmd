@echo off
REM === SPEC-0004 - Conector Google Drive: verificacion (Windows cmd) ===
REM Ejecutar desde la raiz del proyecto.
REM Requisito previo: haber ejecutado scripts\setup-gdrive-deps.cmd (instala googleapis/keytar).

REM 1) Situarse en la rama del SPEC (crear si no existe)
git checkout feat/spec-0004-conector-google-drive 2>nul || git checkout -b feat/spec-0004-conector-google-drive

REM 2) Comprobacion de tipos (main + renderer)
call npm run typecheck

REM 3) Tests unitarios (Vitest): auth, token-store, client, sync, cover-template
call npm run test:unit

REM 4) Build necesario para los tests funcionales
call npm run build

REM 5) Tests funcionales (Playwright + Electron)
call npm run test:e2e

REM 6) Arranque en desarrollo para validar el flujo OAuth + Picker manualmente
REM    (requiere GOOGLE_CLIENT_ID y GOOGLE_API_KEY en .env)
call npm run dev
