# Instalación y desarrollo

## Requisitos

- Node.js 20 LTS o superior
- pnpm 9+ (`npm install -g pnpm`)
- Git

## Puesta en marcha

```cmd
pnpm install
pnpm dev
```

`pnpm dev` arranca electron-vite en modo desarrollo (HMR en el renderer) y abre la ventana de la aplicación.

## Variables de entorno

Copia `.env.example` a `.env` y rellena las claves necesarias. El fichero `.env` está en `.gitignore` y nunca se versiona. Las credenciales sensibles se almacenan en el keychain del sistema operativo (no en texto plano).

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Arranca la app en modo desarrollo |
| `pnpm build` | Typecheck + build de los tres procesos |
| `pnpm package` | Build + empaquetado con electron-builder |
| `pnpm package:win` | Empaquetado solo para Windows (NSIS) |
| `pnpm package:mac` | Empaquetado solo para macOS (DMG) |
| `pnpm test:unit` | Tests unitarios (Vitest) |
| `pnpm test:e2e` | Tests funcionales (Playwright) |
| `pnpm test` | Todos los tests |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Comprobación de tipos sin emitir |

## Auto-actualización

La aplicación comprueba actualizaciones al arrancar contra el canal de releases de GitHub configurado en `electron-builder.yml`. Para publicar releases se necesita `GH_TOKEN` con permiso sobre el repositorio.
