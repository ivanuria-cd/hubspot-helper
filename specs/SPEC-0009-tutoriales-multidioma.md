# SPEC-0009 — Tutoriales Multidioma

**Estado:** VALIDADO — implementado (typecheck/test/e2e + PR pendientes en máquina)
**Branch:** `feat/spec-0009-tutoriales-multidioma`
**Fecha:** 2026-06-17
**Depende de:** SPEC-0000 (§3 i18n, §10 tutoriales), SPEC-0002 (sección Ayuda)

---

## 1. Objetivo

Dotar a los tutoriales de usuario de **versiones en los cuatro idiomas soportados** (`es`, `ca`, `eu`, `en`) y hacer que la sección **Ayuda** muestre cada tutorial en el idioma activo de la interfaz, con **fallback a castellano** cuando una traducción no exista todavía.

En esta iteración se entrega además la **traducción completa** de los 24 tutoriales existentes a catalán, euskera e inglés (alcance acordado: "mecanismo + traducir todo").

---

## 2. Contexto y decisiones de diseño

### Situación actual

- 24 tutoriales en `doc/tutoriales/<feature>/<slug>.md`, todos en castellano.
- `src/renderer/features/help/tutorials.ts` carga los `.md` con `import.meta.glob('../../../../doc/tutoriales/**/*.md', { query: '?raw', eager: true })` y los agrupa por `feature`, derivando `feature`/`slug` de los dos últimos segmentos de la ruta.
- `HelpSection.tsx` muestra la lista agrupada y renderiza el `.md` seleccionado. **No** tiene en cuenta el idioma activo de i18next.
- SPEC-0000 §10 ya prevé: *"Los tutoriales se escriben en castellano como idioma base; el resto de idiomas se añaden cuando el texto de la UI esté traducido"*. La UI ya está traducida en los cuatro locales, por lo que la condición se cumple.

### Convención de ficheros (decisión: subcarpeta por idioma)

```
doc/tutoriales/<feature>/<locale>/<slug>.md
```

Ejemplo:

```
doc/tutoriales/propiedades/es/anadir-propiedad.md   ← base canónica
doc/tutoriales/propiedades/ca/anadir-propiedad.md
doc/tutoriales/propiedades/eu/anadir-propiedad.md
doc/tutoriales/propiedades/en/anadir-propiedad.md
```

- `locale ∈ { es, ca, eu, en }` (constante compartida `SUPPORTED_LANGUAGES`).
- **`es` es la versión canónica y siempre debe existir** para todo `slug`. El resto de idiomas son opcionales a nivel de mecanismo (aunque esta iteración los completa todos).
- El `slug` (nombre de fichero) **se mantiene idéntico en todos los idiomas** — es el identificador estable del tutorial. No se traduce el nombre del fichero; el título traducido vive dentro del `.md` (encabezado `# `).

### Migración de los ficheros actuales

Los 24 ficheros pasan de `doc/tutoriales/<feature>/<slug>.md` a `doc/tutoriales/<feature>/es/<slug>.md`. Es un movimiento sin cambio de contenido (la versión castellana es la base).

### Modelo de carga y selección

- El loader pasa a indexar por **`feature/slug`**, agregando un mapa `content: Record<SupportedLanguage, string>` por tutorial.
- La identidad del tutorial en la UI es `feature/slug` (independiente del idioma): al cambiar de idioma **no** se pierde la selección actual; solo cambia el contenido renderizado.
- **Fallback**: si el idioma activo no tiene `.md` para ese `slug`, se muestra el de `es`. Cuando esto ocurra, el visor muestra un aviso no intrusivo ("Este tutorial aún no está disponible en <idioma>; se muestra en castellano"), traducido a su vez.
- La lista de la izquierda muestra el **título en el idioma activo** (o el de `es` si falta), tomado del encabezado `# ` del `.md` correspondiente.

### Por qué un SPEC nuevo y no ampliar SPEC-0002

El visor de Ayuda (mecánica de carga y render) lo define SPEC-0002, pero la **internacionalización del contenido de tutoriales** es una preocupación transversal nueva (afecta a la convención de SPEC-0000 §10 y al loader). Se aísla en SPEC-0009 para no reabrir SPEC-0002. Este SPEC modifica la documentación de SPEC-0000 §10 y SPEC-0002 §3 (sección Ayuda) para reflejar la nueva convención.

---

## 3. Interfaz de usuario

Sin cambios estructurales en la pantalla de Ayuda. Diferencias de comportamiento:

- El contenido del tutorial y los títulos de la lista se muestran en el **idioma activo** del selector global (TopBar / hero de bienvenida).
- Al cambiar de idioma con un tutorial abierto, el panel se actualiza en caliente manteniendo la selección.
- Si la traducción no existe, se renderiza la versión castellana precedida de un aviso (MUI `Alert` `severity="info"`, sin verde lima sobre fondo oscuro; respeta la guía CD).

---

## 4. Modelo de datos / contratos

### `tutorials.ts` — nuevo modelo

```typescript
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type SupportedLanguage } from '@renderer/shared/i18n/languages';

export interface TutorialEntry {
  id: string;        // `${feature}/${slug}` — estable entre idiomas
  feature: string;
  slug: string;
  /** Título por idioma (encabezado `# ` del .md), con fallback resuelto en la UI. */
  titles: Partial<Record<SupportedLanguage, string>>;
  /** Contenido Markdown por idioma. `es` siempre presente. */
  content: Partial<Record<SupportedLanguage, string>>;
}

/** Resuelve contenido para un idioma con fallback a `es` (DEFAULT_LANGUAGE). */
export function resolveContent(entry: TutorialEntry, lang: SupportedLanguage): {
  content: string;
  isFallback: boolean;
  shownLanguage: SupportedLanguage;
};

/** Resuelve título para un idioma con fallback a `es`. */
export function resolveTitle(entry: TutorialEntry, lang: SupportedLanguage): string;
```

- El glob no cambia de patrón (`doc/tutoriales/**/*.md` ya es recursivo); cambia el **parseo de la ruta**: `slug = parts[-1] sin .md`, `locale = parts[-2]`, `feature = parts[-3]`.
- Si `parts[-2]` no es un locale soportado (fichero legacy sin subcarpeta de idioma), se trata como `es` y se registra un aviso en consola en desarrollo.

### Claves i18n nuevas (`common.json`, los 4 locales)

- `help.fallbackNotice` — texto del aviso, con interpolación `{{language}}` (autónimo del idioma objetivo, no traducido).

---

## 5. Implementación — tareas atómicas

1. **Migrar** los 24 `.md` actuales a `doc/tutoriales/<feature>/es/<slug>.md` (mover, sin editar contenido).
2. **Crear** las traducciones `ca`, `eu`, `en` de los 24 tutoriales en sus subcarpetas (`doc/tutoriales/<feature>/<locale>/<slug>.md`). Traducción fiel del castellano, manteniendo la estructura de SPEC-0000 §10 (Prerrequisitos, Tiempo estimado, Pasos, Resultado esperado, Preguntas frecuentes) y los nombres de UI según las claves i18n ya traducidas (coherencia con `common.json`).
3. **Reescribir `tutorials.ts`** — nuevo parseo de ruta (feature/locale/slug), agregación por `feature/slug`, `resolveContent`, `resolveTitle`, `tutorialFeatures()` intacto.
4. **Actualizar `HelpSection.tsx`** — usar `i18n.language`, resolver título y contenido por idioma, mostrar `Alert` de fallback cuando proceda, mantener selección al cambiar idioma.
5. **Claves i18n** — añadir `help.fallbackNotice` a `es`, `ca`, `eu`, `en`.
6. **Actualizar documentación de SPECs** — SPEC-0000 §10 (nueva convención de carpetas por idioma + regla de fallback) y SPEC-0002 §3 (sección Ayuda: consciente del idioma); añadir SPEC-0009 a las tablas de `CLAUDE.md`.
7. **Tests** (ver §6).

---

## 6. Tests requeridos

### Unitarios (Vitest)

- `tutorials.spec.ts` —
  - Agrupa correctamente varios idiomas del mismo `slug` en un único `TutorialEntry`.
  - `resolveContent` devuelve la traducción cuando existe y `isFallback=false`.
  - `resolveContent` cae a `es` con `isFallback=true` cuando falta la traducción.
  - `resolveTitle` aplica el mismo fallback.
- `HelpSection.spec.tsx` —
  - Renderiza el contenido en el idioma activo.
  - Muestra el `Alert` de fallback cuando el idioma activo carece de traducción.
  - Mantiene el tutorial seleccionado al cambiar el idioma.

### Funcionales (Playwright)

- Ampliar `help-section.spec.ts`: abrir Ayuda, cambiar el idioma desde el TopBar y verificar que el tutorial renderizado cambia de idioma.

### Cobertura de contenido

- Script de verificación (Node, ejecución local) que comprueba que **todo `slug` con versión `es` tiene además `ca`, `eu` y `en`** (paridad 24×4 = 96 ficheros). Se documenta el comando CMD en §10.

---

## 7. Scopes / permisos necesarios

Ninguno. No toca HubSpot, Google Drive ni MCP. Solo ficheros de documentación y renderer.

---

## 8. Consideraciones de seguridad

- El contenido se empaqueta en build (sin acceso a disco en runtime); sin cambios en la superficie de seguridad respecto a SPEC-0002.
- `MarkdownView` ya sanea/renderiza sin dependencias externas; el contenido traducido es estático del repositorio.

---

## 9. Documentación de usuario

Este SPEC **es** documentación de usuario (traduce los tutoriales). No genera tutoriales nuevos; multiplica los existentes por idioma. Actualiza además SPEC-0000 §10 y SPEC-0002 §3 con la nueva convención.

---

## 10. Verificación local (CMD Windows)

```cmd
npm run typecheck
npm run test:unit
npm run test:e2e
node scripts\check-tutorial-parity.mjs
```

---

## 11. Criterios de aceptación

- [x] Convención `doc/tutoriales/<feature>/<locale>/<slug>.md` aplicada; 24 ficheros `es` migrados.
- [x] Existen `ca`, `eu`, `en` para los 24 tutoriales (96 ficheros en total, paridad verificada con `scripts/check-tutorial-parity.mjs`).
- [x] La sección Ayuda muestra el tutorial en el idioma activo y cambia en caliente (`HelpSection.tsx`).
- [x] Fallback a castellano con aviso cuando falta una traducción (`resolveContent`, `Alert` + `help.fallbackNotice`).
- [x] La selección de tutorial se mantiene al cambiar de idioma (identidad `feature/slug`).
- [x] `help.fallbackNotice` presente en los 4 locales.
- [x] SPEC-0000 §10 y SPEC-0002 §3 actualizados; SPEC-0009 añadido a las tablas de `CLAUDE.md`.
- [ ] `npm run typecheck`, `test:unit` y `test:e2e` en verde (pendiente en máquina).
- [ ] PR creada (comandos entregados al usuario, no ejecutados).

---

## 12. Estado de implementación (2026-06-17)

- **Migración** — los 24 `.md` movidos a `doc/tutoriales/<feature>/es/<slug>.md`.
- **Traducciones** — 72 ficheros nuevos (`ca`, `eu`, `en`) en sus subcarpetas, usando la terminología de UI de cada `common.json`. Paridad 24×4=96 verificada.
- **Loader** — `tutorials.ts` reescrito: indexa por `feature/slug` con `content`/`titles` por idioma; `resolveContent`/`resolveTitle` con fallback a `es`; aviso en consola (DEV) si una ruta no trae subcarpeta de idioma.
- **Visor** — `HelpSection.tsx` usa `i18n.language`, resuelve título/contenido por idioma, muestra `Alert severity="info"` en fallback y mantiene la selección.
- **i18n** — `help.fallbackNotice` añadida a `es`, `ca`, `eu`, `en`.
- **Tests** — `tutorials.spec.ts` (pure functions + catálogo), `HelpSection.spec.tsx` (idioma activo, fallback, cambio en caliente con módulo mockeado), `help-section.spec.ts` ampliado (cambio de idioma e2e), `scripts/check-tutorial-parity.mjs`.
- **Nota** — el locale `es` contiene una clave preexistente y ajena a este SPEC, `_fallbackProbe`, que no se ha modificado (norma: las claves de diccionarios no se arreglan, solo se señalan).

### Iteración (2026-06-17, fix de tests)

- `HelpSection.spec.tsx`: la factory de `vi.mock('../tutorials')` referenciaba constantes de nivel superior (`full`/`onlyEs`); al hoistarse el mock fallaba con `ReferenceError: Cannot access 'full' before initialization`. Solucionado moviendo las entradas de tutorial mockeadas **dentro** de la factory (sin variables externas).
- `HelpSection.spec.tsx`: el título del tutorial aparece dos veces (botón de la lista y encabezado `# ` renderizado en el contenido), por lo que `getByText('Demo EN')` encontraba múltiples nodos. Solucionado afinando la aserción a `getByRole('button', { name: 'Demo EN' })`.
