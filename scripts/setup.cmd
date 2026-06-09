@echo off
REM === SPEC-0001 — puesta en marcha (Windows cmd) ===
REM Ejecutar desde la raiz del proyecto: C:\Users\IvanUria\Documents\Claude\Projects\HubSpotHelper

REM 1) Gestor de paquetes
call npm install -g pnpm

REM 2) Dependencias
call pnpm install

REM 3) Repositorio Git + remote (tarea atomica 1 del SPEC)
git init
git branch -M main
git add .
git commit -m "feat(foundation): scaffolding inicial Electron + React + MUI CD theme + i18n/a11y"
git remote add origin https://github.com/ivanuria-cd/hubspot-helper.git
git push -u origin main

REM 4) Verificacion
call pnpm typecheck
call pnpm test:unit

REM 5) Arranque en desarrollo
call pnpm dev
