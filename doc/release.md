# Publicación de releases (SPEC-0017)

Compilación y publicación de los instaladores de Windows y macOS mediante GitHub Actions (`.github/workflows/release.yml`).

## Cómo cortar una versión

1. Actualizar `version` en `package.json` (p. ej. `1.0.1`). `electron-updater` compara contra este valor.
2. Mergear a `main` (el workflow debe existir en `main`).
3. Crear un tag `vX.Y.Z` **igual** que la `version` y empujarlo. El push del tag dispara el workflow.
4. El workflow compila en `windows-latest` y `macos-latest` (en serie) y sube los artefactos a un **release en borrador** de `ivanuria-cd/hubspot-helper`.
5. Revisar el borrador en GitHub → *Releases* y **publicarlo** manualmente.

Alternativa sin tag: pestaña *Actions* → *Release* → *Run workflow* (`workflow_dispatch`).

## Artefactos

| Plataforma | Instalador | Metadatos updater |
| ---------- | ---------- | ----------------- |
| Windows | `RevOps Assistant Setup <version>.exe` | `latest.yml` |
| macOS | `RevOps Assistant-<version>.dmg` (+ `.zip`) | `latest-mac.yml` |

## Sin firma de código

Esta configuración **no firma** los binarios (decisión SPEC-0017 §2). Consecuencias:

- **Windows / SmartScreen:** al ejecutar el `.exe` aparece «Windows protegió su PC». El usuario pulsa *Más información* → *Ejecutar de todas formas*.
- **macOS / Gatekeeper:** el `.dmg` no está firmado ni notarizado. Al abrir la app macOS la bloquea. Para abrirla: clic derecho sobre la app → *Abrir*, o en terminal:

  ```
  xattr -dr com.apple.quarantine "/Applications/RevOps Assistant.app"
  ```

Firmar quitaría estos avisos (Apple Developer para macOS; Azure Trusted Signing para Windows) y se aborda en un SPEC futuro.

## Arquitectura del .dmg

`macos-latest` es Apple Silicon (arm64) → el `.dmg` sale **arm64** y **no** corre nativo en Macs Intel. Para cubrir Intel/universal habría que ajustar el target (`--x64` / `--universal` en `release:mac`), pendiente de una iteración posterior.

## Token

El workflow usa `secrets.GITHUB_TOKEN` (permiso `contents: write` sobre el propio repo). No requiere crear ni configurar ningún secret adicional.
