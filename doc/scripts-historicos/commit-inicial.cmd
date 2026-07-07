@echo off
REM === Commit inicial SPEC-0001 (Windows cmd) ===
REM Ejecutar desde la raiz del proyecto.

REM 1) Inicializar repo
git init
git branch -M main
git config user.name "Ivan Uria"
git config user.email "ivan.uria@clouddistrict.com"

REM 2) Anadir SOLO los ficheros tocados en SPEC-0001
git add .gitignore .env.example .eslintrc.cjs .prettierrc.json README.md CLAUDE.md
git add package.json package-lock.json tsconfig.json tsconfig.main.json tsconfig.renderer.json
git add electron-builder.yml electron.vite.config.ts vitest.config.ts playwright.config.ts
git add specs/README.md specs/SPEC-0001-fundacion-del-proyecto.md
git add doc/instalacion.md doc/arquitectura.md
git add connectors/README.md connectors/hubspot/README.md connectors/google-drive/README.md
git add src/main/index.ts src/main/window.ts src/main/updater.ts src/main/updater.spec.ts src/main/settings.ts
git add src/preload/index.ts src/preload/index.d.ts
git add src/renderer/index.html src/renderer/main.tsx src/renderer/app/App.tsx
git add src/renderer/theme src/renderer/i18n src/renderer/locales
git add src/renderer/shared/README.md src/renderer/shared/components/LanguageSwitcher.tsx
git add src/renderer/shared/i18n/languages.ts src/renderer/shared/types/ipc.ts
git add tests/unit/README.md tests/functional/README.md tests/functional/app-launch.spec.ts tests/functional/a11y-baseline.spec.ts
git add scripts/setup.cmd scripts/commit-inicial.cmd

REM 3) Commit
git commit -m "feat(foundation): scaffolding inicial Electron + React + MUI CD theme, i18n (es/ca/eu/en) y base a11y"

REM 4) Revisar lo que ha quedado sin anadir (ficheros de SPEC-0002, etc.)
git status
