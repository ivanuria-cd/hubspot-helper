# SPEC-0017 — Compilación y Publicación de Releases (CI/CD)

**Estado:** VALIDADO
**Branch:** feat/spec-0017-ci-release
**Fecha:** 2026-07-23
**Depende de:** SPEC-0001

---

## 1. Objetivo

Automatizar la compilación de los instaladores de **Windows (nsis)** y **macOS (dmg)** y su publicación como *release* de GitHub, habilitando el auto-updater (`electron-updater`). Resuelve la imposibilidad de generar el `.dmg` de macOS desde Windows delegando la compilación de macOS a GitHub Actions con un runner nativo.

---

## 2. Contexto y Decisiones de Diseño

### Restricción que motiva el SPEC
- El target `dmg` requiere `hdiutil`, que **solo existe en macOS**. No hay cross-compilación posible desde Windows.
- El proyecto usa el módulo nativo `keytar` (node-gyp): sus binarios se compilan por plataforma/arquitectura; no son portables entre SO.
- Conclusión: cada plataforma debe compilarse en un runner de su mismo SO.

### Base ya existente
- `electron-builder.yml` configurado: `win: nsis`, `mac: dmg`, `publish: github` (`ivanuria-cd/hubspot-helper`), `buildResources: build` (iconos ya presentes).
- `package.json` tiene `release:win` / `release:mac` (`electron-builder --<plataforma> --publish always`).
- `.github/workflows/ci.yml` solo hace unit/typecheck/lint en `ubuntu-latest`; no compila ni publica.

### Decisión de arquitectura — Opción A (VALIDADA 2026-07-23)

Todo en Actions con matriz. Un único workflow `release.yml` con matriz `[windows-latest, macos-latest]`, disparado por push de tag `v*` (y `workflow_dispatch` manual). Cada runner: `npm ci` → `npm run build` → `electron-builder --<plataforma> --publish always`.
- Ventajas: release único y consistente, reproducible, **sin `GH_TOKEN` en la máquina del usuario** (usa el `GITHUB_TOKEN` de Actions), un solo disparo produce ambos instaladores.
- **`max-parallel: 1`** en la matriz: los jobs corren en serie para evitar la carrera del *draft* del release (dos jobs creando el mismo release a la vez → posible 422/draft duplicado). El primer job crea el draft; el segundo añade sus artefactos. Coste: ~el doble de tiempo, aceptable para releases.

*(Descartada la Opción B — Windows local + macOS en Actions — por requerir `GH_TOKEN` local y publicar desde dos orígenes.)*

### Firma de código — SIN FIRMA (VALIDADO 2026-07-23)
- Windows (nsis sin firmar): SmartScreen mostrará advertencia de editor desconocido.
- macOS (dmg sin firmar): Gatekeeper bloqueará la app («desarrollador no identificado» / «dañada»). Apertura: clic derecho → *Abrir*, o `xattr -dr com.apple.quarantine "/Applications/RevOps Assistant.app"`.
- En el runner de macOS se fija `CSC_IDENTITY_AUTO_DISCOVERY=false` para que electron-builder **no intente firmar y falle**.
- Firma + notarización real (Apple Developer ID, cert. Windows) queda **fuera de alcance** (SPEC futuro).

### Versionado y publicación
- `electron-updater` compara contra `version` de `package.json` (hoy `1.0.0`).
- El *release* se crea en **borrador (draft)**; se revisa y se publica manualmente en GitHub.
- Trigger recomendado: push de tag `v1.0.0`. El tag debe coincidir con la `version` de `package.json`.

---

## 3. Interfaz de Usuario

No aplica — infraestructura de build. No añade pantallas ni toca el runtime de la app.

---

## 4. Modelo de Datos / Contratos

### Disparadores del workflow
- `push` de tag que case `v*` (p. ej. `v1.0.0`).
- `workflow_dispatch` (ejecución manual desde la pestaña Actions).

### Artefactos publicados en el release (draft)
| Plataforma | Instalador | Metadatos updater |
|-----------|-----------|-------------------|
| Windows | `RevOps Assistant Setup <version>.exe` | `latest.yml` |
| macOS | `RevOps Assistant-<version>.dmg` + `.zip` | `latest-mac.yml` |

### Ficheros afectados
- **Nuevo:** `.github/workflows/release.yml`.
- **Nuevo (doc de desarrollo):** `doc/release.md` — cómo cortar una versión.
- `electron-builder.yml`: sin cambios obligatorios (el `env` de firma se pasa desde el workflow).

---

## 5. Implementación — Tareas Atómicas

1. **Crear `.github/workflows/release.yml`**:
   - `permissions: contents: write`.
   - `on: push (tags: v*)` + `workflow_dispatch`.
   - `strategy.matrix.os: [windows-latest, macos-latest]`, `fail-fast: false`, `max-parallel: 1`.
   - `actions/checkout@v4`, `actions/setup-node@v4` (node 20, `cache: npm`), `npm ci`.
   - Paso de empaquetado condicionado al SO: `npm run release:win` (Windows) / `npm run release:mac` (macOS).
   - `env`: `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; en macOS además `CSC_IDENTITY_AUTO_DISCOVERY: false`.
2. **`doc/release.md`**: pasos para publicar (bump de versión, tag, push, revisar draft en GitHub, publicar) + notas SmartScreen/Gatekeeper y arquitectura del `.dmg`.
3. **Comandos para la máquina del usuario** (cmd de Windows): rama + commit + push (PR); y tras el merge, tag `v1.0.0` + push (dispara el workflow), y/o `workflow_dispatch`.
4. **Verificación del YAML**: parseo válido en el sandbox antes de entregar.

> **Arquitectura del `.dmg`:** `macos-latest` es Apple Silicon (arm64), por lo que el `.dmg` sale **arm64**. No corre nativo en Macs Intel. Si se necesita cobertura Intel/universal se ajustará el target (`--x64`/`--universal`) en una iteración posterior; se documenta en `doc/release.md`.

---

## 6. Tests Requeridos

No hay lógica de negocio. Verificación:
- **Parseo/validez del YAML** del workflow (en sandbox).
- **Ejecución real del workflow** en GitHub: build verde en ambos runners y artefactos presentes en el release *(en tu cuenta)*.
- **Smoke de instalación**: el `.exe` y el `.dmg` arrancan la app *(en cada plataforma, en tu máquina)*.
- **Auto-updater**: con el release publicado, una versión anterior detecta la nueva *(manual)*.

---

## 7. Scopes / Permisos Necesarios

- GitHub Actions: `contents: write` (crear/editar releases del propio repo) vía `secrets.GITHUB_TOKEN`. No requiere crear PAT si el repo destino es `ivanuria-cd/hubspot-helper`.
- Sin scopes de HubSpot ni Google.
- **(Opción B)** `GH_TOKEN` local con permiso sobre el repo para `release:win`.

---

## 8. Consideraciones de Seguridad

- SPEC-0000 §11: `npm ci` (reproducible desde lockfile); no exponer tokens en logs; `GITHUB_TOKEN` por `secrets`, nunca en texto.
- Empaquetado: `electron-builder.yml` `files` limita a `out/**` + `package.json`; **no** se empaqueta `.env` ni secretos.
- Sin firma → SmartScreen (Windows) y Gatekeeper (macOS); mitigación documentada en `doc/release.md`. Firma real diferida.
- `permissions` mínimo (`contents: write`); sin otros scopes del token de Actions.

---

## 9. Documentación de Usuario

No genera tutorial de `doc/tutoriales/` (esos son para el usuario final de la app, no para quien compila). Se añade **documentación de desarrollo** en `doc/release.md` con el procedimiento de corte de versión y las notas de SmartScreen/Gatekeeper.

---

## 10. Criterios de Aceptación

- [ ] `release.yml` parsea y es válido.
- [ ] Push de tag `v*` dispara el workflow y compila Windows + macOS sin error.
- [ ] El release (draft) contiene `.exe` + `latest.yml` y `.dmg` + `latest-mac.yml`.
- [ ] Los instaladores arrancan la app (smoke) en cada plataforma.
- [ ] El auto-updater detecta la versión publicada.
- [ ] `doc/release.md` creado.
