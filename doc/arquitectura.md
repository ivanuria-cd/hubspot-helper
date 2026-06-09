# Arquitectura

RevOps Assistant es una aplicación de escritorio Electron con tres procesos, según SPEC-0000 y SPEC-0001.

## Procesos

- **main** (`src/main/`) — proceso principal Node. Crea la ventana (`window.ts`), gestiona el ciclo de vida, registra los handlers IPC y la lógica de auto-actualización (`updater.ts`).
- **preload** (`src/preload/`) — puente seguro. Expone vía `contextBridge` únicamente la API definida en el contrato IPC (`window.api`). Sin acceso directo a Node desde el renderer.
- **renderer** (`src/renderer/`) — UI React + MUI con el tema Cloud District. Arranca en `main.tsx`, providers en `app/App.tsx`.

## Seguridad

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` en todas las ventanas.
- `webSecurity: true` y CSP restrictiva aplicada en producción.
- Los secrets nunca llegan al renderer; viven en el proceso main / keychain del SO.

## Contrato IPC

Definido en `src/renderer/shared/types/ipc.ts` y compartido entre preload, main y renderer.

| Canal | Dirección | Descripción |
|-------|-----------|-------------|
| `app:get-version` | renderer → main | Versión actual de la app |
| `updater:check` | renderer → main | Fuerza comprobación de updates |
| `updater:status` | main → renderer | Estado del update (evento) |
| `settings:get-language` | renderer → main | Idioma persistido (electron-store) |
| `settings:set-language` | renderer → main | Persiste el idioma elegido |

## Internacionalización (i18n)

Configuración en `src/renderer/i18n/` con **i18next** + **react-i18next**. Idiomas soportados: castellano (`es`, por defecto), catalán (`ca`), euskera (`eu`) e inglés (`en`). Traducciones en `src/renderer/locales/<locale>/common.json`, organizadas por namespace.

El idioma se detecta del SO al primer arranque (`i18next-browser-languagedetector`) y la preferencia del usuario se persiste vía electron-store (canales `settings:*`). `LanguageSwitcher` (en `shared/components/`) cambia el idioma en caliente, sin reiniciar. Ningún componente usa texto literal: siempre claves de traducción.

## Accesibilidad (a11y)

Objetivo WCAG 2.1 AA. HTML semántico, roles ARIA donde MUI no los provea, operabilidad por teclado y `aria-label` en elementos interactivos. El atributo `lang` del documento se sincroniza con el idioma activo. La verificación se automatiza con `@axe-core/playwright` (`tests/functional/a11y-baseline.spec.ts`).

## Tema Cloud District

`src/renderer/theme/` mapea los tokens de marca CD a los slots de MUI (`palette`, `typography`, `shape`, `components`). Ningún componente usa colores MUI por defecto. El acento lima (`#AFFC41`) solo se usa como fondo de badge con texto deep navy.

## Conectores

`connectors/hubspot/` y `connectors/google-drive/` se ejecutan en el proceso main (SPEC-0003 y SPEC-0004).

## Build y distribución

electron-vite empaqueta los tres procesos; electron-builder genera los instaladores (DMG / NSIS / AppImage) y electron-updater gestiona las actualizaciones automáticas.
