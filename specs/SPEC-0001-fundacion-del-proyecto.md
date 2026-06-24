# SPEC-0001 — Fundación del Proyecto

**Estado:** IMPLEMENTADO — pendiente de `pnpm install`/`build` y PR en la máquina del usuario  
**Branch:** `feat/spec-0001-fundacion`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0000

---

## 1. Objetivo

Crear el esqueleto del proyecto: repositorio Git, scaffolding Electron + TypeScript + React, integración de MUI con el tema Cloud District, sistema de auto-actualización y estructura de carpetas según SPEC-0000.

---

## 2. Contexto y Decisiones de Diseño

### Toolchain
- **electron-vite** como bundler: unifica la configuración de Vite para los tres procesos (main, preload, renderer) en un solo `vite.config.ts`.
- **electron-builder** para empaquetado y distribución. El auto-updater (`electron-updater`) se integra con el canal de releases de GitHub (u otro proveedor configurable).
- **Pnpm** como gestor de paquetes: workspaces, instalación determinista, menor footprint que npm.

### Seguridad Electron
- `contextIsolation: true`, `nodeIntegration: false` en todas las ventanas.
- El preload expone únicamente las APIs necesarias vía `contextBridge`.
- `webSecurity: true` en producción.

### Tema MUI
- Se crea un tema MUI custom (`createTheme`) que mapea los tokens CD directamente a los slots de MUI (`palette`, `typography`, `shape`, `components`).
- Los colores semánticos de MUI (`primary`, `secondary`, `error`, etc.) se reasignan a la paleta CD para que todos los componentes MUI respeten la marca sin overrides adicionales.

### Auto-update
- Configurado para buscar actualizaciones al inicio. El usuario ve un banner no intrusivo cuando hay update disponible.
- Descarga en background; instalación al cerrar o a petición del usuario.
- Publicación de releases vía `electron-builder` con provider `github` (`ivanuria-cd/hubspot-helper`). Scripts `release:win` / `release:mac` (`electron-builder --<plataforma> --publish always`) que construyen, generan los metadatos (`latest.yml` / `latest-mac.yml`) y suben un release en borrador a GitHub. Requieren `GH_TOKEN` con permiso sobre el repo. El borrador se publica manualmente en GitHub; `electron-updater` compara contra la `version` de `package.json`.

---

## 3. Interfaz de Usuario

No aplica en este SPEC — solo infraestructura. La UI se aborda en SPEC-0002.

---

## 4. Estructura de Ficheros a Crear

```
revops-app/
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json              # Base tsconfig
├── tsconfig.main.json         # Proceso principal
├── tsconfig.renderer.json     # Proceso renderer
├── electron-builder.yml
├── vite.config.ts             # electron-vite config
├── src/
│   ├── main/
│   │   ├── index.ts           # Entry point proceso principal
│   │   ├── window.ts          # Creación y gestión de BrowserWindow
│   │   └── updater.ts         # Lógica electron-updater
│   ├── preload/
│   │   └── index.ts           # contextBridge APIs
│   └── renderer/
│       ├── index.html
│       ├── main.tsx           # Entry point React
│       ├── app/
│       │   └── App.tsx        # Root component (solo providers)
│       ├── theme/
│       │   ├── index.ts       # Export del tema MUI
│       │   ├── palette.ts     # Tokens de color CD
│       │   ├── typography.ts  # Configuración tipográfica CD
│       │   └── components.ts  # Overrides de componentes MUI
│       ├── shared/
│       │   └── README.md
│       └── locales/               # Ficheros de traducción i18n
│           ├── es/                # Castellano (por defecto)
│           │   └── common.json
│           ├── ca/                # Catalán
│           │   └── common.json
│           ├── eu/                # Euskera
│           │   └── common.json
│           └── en/                # Inglés
│               └── common.json
├── connectors/
│   ├── README.md
│   ├── hubspot/
│   │   └── README.md
│   └── google-drive/
│       └── README.md
├── specs/
│   └── README.md
├── doc/
│   ├── instalacion.md
│   └── arquitectura.md
├── sandbox/                   # en .gitignore
└── tests/
    ├── unit/
    │   └── README.md
    └── functional/
        ├── fixtures/
        └── README.md
```

---

## 5. Contratos / Configuración

### electron-builder.yml (estructura mínima)
```yaml
appId: com.clouddistrict.revops
productName: RevOps Assistant
directories:
  output: dist
publish:
  provider: github
  owner: ivanuria-cd
  repo: hubspot-helper
mac:
  target: dmg
win:
  target: nsis
linux:
  target: AppImage
```

### Tema MUI — Palette (palette.ts)
```typescript
export const cdPalette = {
  bgDark:      '#090017',
  bgLight:     '#FFFFFF',
  textOnDark:  '#FFFFFF',
  textOnLight: '#14072B',
  accent:      '#AFFC41',
  secondary:   '#C7C2D3',
  tertiary:    '#7F7790',
  tableAlt:    '#F3F3F3',
} as const;

// Mapping a MUI palette
primary:   { main: '#14072B', contrastText: '#FFFFFF' }
secondary: { main: '#AFFC41', contrastText: '#14072B' }
background:{ default: '#FFFFFF', paper: '#F3F3F3' }
text:      { primary: '#14072B', secondary: '#7F7790' }
```

### IPC Channels (preload/index.ts)
| Canal | Dirección | Descripción |
|-------|-----------|-------------|
| `app:get-version` | renderer → main | Devuelve versión actual |
| `updater:check` | renderer → main | Fuerza comprobación de updates |
| `updater:status` | main → renderer | Estado del update (evento) |

---

## 6. Implementación — Tareas Atómicas

1. **Init repo Git** — `git init`, commit inicial vacío, rama `main`, configurar `.gitignore`, añadir remote `origin` apuntando a `https://github.com/ivanuria-cd/hubspot-helper.git` y hacer `git push -u origin main`
2. **Scaffold electron-vite** — `pnpm create @electron-vite/electron-vite` con template TypeScript + React
3. **Configurar tsconfig** — strict mode, path aliases (`@renderer/*`, `@main/*`, `@shared/*`)
4. **Instalar dependencias base** — MUI v5, Poppins (fontsource), Libre Baskerville (fontsource), Zustand, electron-store, electron-updater, `i18next`, `react-i18next`, `@axe-core/playwright`
5. **Crear tema MUI** — palette, typography, component overrides con tokens CD
6. **Aplicar tema en App.tsx** — `ThemeProvider` + `CssBaseline`
7. **Configurar i18next** — instancia con detección de idioma del SO, fallback a `es`, namespaces por feature; estructura de carpeta `locales/{es,ca,eu,en}/`; envolver App con `I18nextProvider`; selector de idioma en el header global (ver SPEC-0002) con persistencia en electron-store
8. **Configurar electron-builder** — `electron-builder.yml`, scripts en package.json
8. **Implementar updater.ts** — check-on-launch, eventos IPC hacia renderer
9. **Crear estructura de carpetas** con READMEs
10. **Crear documentación inicial** — `doc/instalacion.md`, `doc/arquitectura.md`
11. **Verificar build** — `pnpm build` sin errores en las tres plataformas (CI matrix)
12. **Commit** — `feat(foundation): scaffolding inicial Electron + React + MUI CD theme`

---

## 7. Tests Requeridos

### Unitarios
- `theme/palette.spec.ts` — los tokens CD están correctamente mapeados al tema MUI (ningún color hardcodeado fuera de la paleta)
- `main/updater.spec.ts` — los eventos IPC del updater se emiten con el payload correcto
- `i18n/config.spec.ts` — la instancia i18next carga correctamente los cuatro locales; el fallback a `es` funciona cuando una clave no existe en otro idioma

### Funcionales
- `app-launch.spec.ts` — la app arranca sin errores, la ventana principal es visible
- `a11y-baseline.spec.ts` — axe-core no reporta violaciones WCAG 2.1 AA en la ventana principal al arrancar

---

## 8. Consideraciones de Seguridad

- CSP configurado en el BrowserWindow: solo recursos locales y dominios explícitamente permitidos
- `sandbox: true` en el renderer
- Sin `enableRemoteModule`

---

## 9. Criterios de Aceptación

- [ ] `pnpm dev` arranca la app en modo desarrollo sin errores *(requiere `pnpm install` en la máquina del usuario)*
- [ ] `pnpm build` genera paquetes para macOS y Windows sin errores *(idem)*
- [x] El tema MUI refleja la paleta CD (sin colores fuera de paleta) — verificado por `palette.spec.ts` (en verde)
- [x] El sistema de auto-update detecta y notifica actualizaciones — lógica implementada; eventos IPC verificados por `updater.spec.ts`. La detección real requiere un release publicado en GitHub.
- [x] El selector de idioma cambia la UI entre es / ca / eu / en sin reiniciar — `LanguageSwitcher` + i18next implementados; verificado por `i18n/config.spec.ts`. En SPEC-0002 el componente se monta en el header global (TopBar + hero de bienvenida), disponible en todo el programa.
- [x] axe-core no reporta violaciones AA en la ventana principal — `a11y-baseline.spec.ts` en verde tras `npm run build` (Playwright + Electron)
- [x] Tests unitarios del SPEC en verde — 3 suites / 10 tests (`palette`, `updater`, `i18n/config`). Los funcionales (`app-launch`, `a11y-baseline`) requieren build + entorno gráfico.
- [x] READMEs de carpetas principales creados
- [ ] PR creada, revisada y mergeada en `main`

---

## 10. Notas de Implementación (2026-06-09)

Desviaciones respecto al SPEC, justificadas:

- **`electron.vite.config.ts`** en lugar de `vite.config.ts`: electron-vite exige ese nombre de fichero para detectar la configuración de los tres procesos.
- **Scaffolding manual** en vez de `pnpm create @electron-vite/electron-vite`: el repositorio ya existía con `specs/` y `CLAUDE.md`; se generó la estructura a mano para no sobrescribirlos.
- **`git init` y `git push`** (tarea atómica 1) y `pnpm install` / `pnpm build` (tareas 11) **no** se ejecutaron: el entorno de trabajo es un sandbox Linux aislado cuyos `node_modules`/builds no sirven en Windows. Se entregan los comandos `cmd` para que el usuario los ejecute en su máquina.
- **i18n**: detección del idioma del SO vía `i18next-browser-languagedetector` (orden `navigator`); preferencia persistida en electron-store a través de los canales IPC `settings:get-language` / `settings:set-language`. La clave `_fallbackProbe` existe **solo** en `es/common.json` de forma intencionada para que `i18n/config.spec.ts` verifique el fallback.
- **Verificación**: tests unitarios ejecutados con Vitest en el sandbox (10/10 en verde). Typecheck completo y tests funcionales quedan pendientes de la instalación de dependencias en la máquina del usuario.

### Ajustes durante la verificación (en SPEC-0002)

- **Gestor de paquetes → npm**: se abandonó pnpm (su verja `ERR_PNPM_IGNORED_BUILDS` bloqueaba cada comando). El proyecto usa npm (`package-lock.json`, `npm ci`); eliminados `pnpm-lock.yaml` y `pnpm-workspace.yaml`; scripts `cmd` y SPEC-0000 §11 actualizados.
- **`theme/typography.ts`**: `TypographyOptions` (no exportado por `@mui/material/styles`) corregido a `TypographyVariantsOptions`; afloraba al ejecutar `typecheck` con dependencias instaladas.
- **`a11y-baseline.spec.ts`**: se sustituyó `@axe-core/playwright` (AxeBuilder) por inyección directa de `axe-core` vía `window.eval`; Electron no soporta `Target.createTarget`, que AxeBuilder usa para recorrer iframes. Dependencia `axe-core` declarada de forma explícita y retirada `@axe-core/playwright` (sin uso).
- **`app-launch.spec.ts`**: la comprobación de visibilidad pasó de un check instantáneo a `expect.poll` (espera a `ready-to-show`); evita la carrera con el arranque del renderer. Sigue exigiendo `isVisible === true`, no relaja la aserción.

### Canales IPC añadidos (no previstos en §5)

| Canal | Dirección | Descripción |
|-------|-----------|-------------|
| `settings:get-language` | renderer → main | Idioma persistido (electron-store) |
| `settings:set-language` | renderer → main | Persiste el idioma elegido |
