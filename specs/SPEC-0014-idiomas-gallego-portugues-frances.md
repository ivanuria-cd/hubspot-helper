# SPEC-0014 — Idiomas Gallego, Portugués y Francés

**Estado:** IMPLEMENTADO (2026-06-24; paridad y JSON verificados en sandbox; typecheck/test/e2e + PR en máquina)
**Branch:** `feat/spec-0014-idiomas-gl-pt-fr`
**Fecha:** 2026-06-24
**Depende de:** SPEC-0000 (§3 i18n, §10 tutoriales), SPEC-0002 (selector de idioma, sección Ayuda), SPEC-0009 (mecanismo multidioma de tutoriales)

---

## 1. Objetivo

Añadir tres idiomas a la aplicación — **gallego (`gl`)**, **portugués (`pt`)** y **francés (`fr`)** — con soporte de punta a punta:

- Cadenas de la interfaz (`common.json`) traducidas en los tres idiomas.
- Tutoriales de usuario (`doc/tutoriales/`) traducidos en los tres idiomas.
- Cierre del gap previo: `crm` y `dashboard` solo existen en `es`; se llevan a **paridad total** en los siete idiomas.
- Nuevo tutorial `hubspot/scopes-hubspot.md` (creación del PAT con enlaces + scopes por característica + conjunto agrupado), en los siete idiomas. Añadido a petición del usuario en esta misma iteración.

Resultado: `SUPPORTED_LANGUAGES = ['es', 'ca', 'eu', 'en', 'gl', 'pt', 'fr']`.

---

## 2. Contexto y decisiones de diseño

### Situación actual

- `SUPPORTED_LANGUAGES = ['es', 'ca', 'eu', 'en']` en `src/renderer/shared/i18n/languages.ts`, con `LANGUAGE_AUTONYMS` e `isSupportedLanguage`.
- `src/renderer/i18n/index.ts` importa y registra cuatro `common.json` (uno por locale).
- Tutoriales: 28 slugs en `es`; 26 en cada uno de `ca`/`eu`/`en` (faltan `crm` y `dashboard`). Total 106 ficheros.
- El selector (`LanguageSwitcher.tsx`) y la validación de preferencia (`main/settings.ts`) ya iteran sobre la constante compartida, así que admiten idiomas nuevos sin cambios de lógica.
- `scripts/check-tutorial-parity.mjs` tiene `LOCALES` hardcodeado a `['es', 'ca', 'eu', 'en']`.
- `src/renderer/i18n/config.spec.ts` afirma que la lista es **exactamente** `['es', 'ca', 'eu', 'en']` (test que este SPEC autoriza a modificar; ver §6 y §11).

### Gap previo de `crm` y `dashboard` (errata de datos, no se "arregla" en silencio)

`crm` y `dashboard` tienen únicamente la versión `es`; nunca se tradujeron a `ca`/`eu`/`en`. Conforme a lo acordado, este SPEC los lleva a paridad total (los siete idiomas), cerrando también el gap heredado de SPEC-0009.

### Autónimos (SPEC-0000 §i18n)

Los nombres se muestran **siempre en su propio idioma**, nunca traducidos:

| locale | autónimo |
|--------|----------|
| `gl` | Galego |
| `pt` | Português |
| `fr` | Français |

### Por qué un SPEC nuevo

La ampliación del conjunto de idiomas modifica una norma transversal (SPEC-0000 §3 fija "cuatro idiomas") y el mecanismo de paridad de SPEC-0009. Se aísla en SPEC-0014 para no reabrir SPEC-0000 ni SPEC-0009; este SPEC **enmienda la redacción** de SPEC-0000 §3 y SPEC-0009 (lista de idiomas y conteo de paridad) en lugar de crear specs de corrección.

### Calidad de traducción

`es` es la fuente canónica. Las traducciones son fieles al castellano, mantienen las claves i18n y la estructura de tutoriales de SPEC-0000 §10. La terminología de producto (HubSpot, Drive, MCP) y los nombres propios no se traducen. Los autónimos del selector no se traducen.

---

## 3. Interfaz de usuario

Sin cambios estructurales. El selector global de idioma (`LanguageSwitcher`) muestra automáticamente las tres nuevas opciones (Galego, Português, Français) por iterar sobre `SUPPORTED_LANGUAGES`. El visor de Ayuda muestra los tutoriales en el idioma activo con el fallback a `es` ya existente (SPEC-0009).

---

## 4. Modelo de datos / contratos

### `languages.ts`

```typescript
export const SUPPORTED_LANGUAGES = ['es', 'ca', 'eu', 'en', 'gl', 'pt', 'fr'] as const;

export const LANGUAGE_AUTONYMS: Record<SupportedLanguage, string> = {
  es: 'Castellano',
  ca: 'Català',
  eu: 'Euskara',
  en: 'English',
  gl: 'Galego',
  pt: 'Português',
  fr: 'Français',
};
```

`SupportedLanguage`, `DEFAULT_LANGUAGE` (`es`) e `isSupportedLanguage` no cambian de forma.

### `i18n/index.ts`

Importa `gl/pt/fr` de `common.json` y los añade a `resources`. `supportedLngs`/`fallbackLng` se derivan de la constante; sin cambios de lógica.

### Ficheros de locale

`src/renderer/locales/{gl,pt,fr}/common.json` — espejo del conjunto de claves canónico de `es` (incluida la clave preexistente `_fallbackProbe`, que se mantiene tal cual; norma: las claves de diccionarios no se corrigen).

### Tutoriales

`doc/tutoriales/<feature>/{gl,pt,fr}/<slug>.md`, slug idéntico en todos los idiomas (SPEC-0009). Estructura de SPEC-0000 §10.

---

## 5. Implementación — tareas atómicas

1. **`languages.ts`** — ampliar `SUPPORTED_LANGUAGES` y `LANGUAGE_AUTONYMS` con `gl`/`pt`/`fr`.
2. **`i18n/index.ts`** — importar y registrar los tres `common.json` nuevos.
3. **`locales/gl|pt|fr/common.json`** — traducir el conjunto canónico de claves de `es` (~836 líneas) en los tres idiomas.
4. **Tutoriales `gl`/`pt`/`fr`** — traducir los 28 slugs en los tres idiomas.
5. **Cierre de gap** — crear `crm` y `dashboard` en `ca`/`eu`/`en` (y en `gl`/`pt`/`fr` por el paso 4), llevando los 28 slugs a los 7 idiomas.
6. **`scripts/check-tutorial-parity.mjs`** — `LOCALES` pasa a los 7 idiomas.
7. **`config.spec.ts`** — actualizar las aserciones de la lista de idiomas (de 4 a 7) y el conteo. *Modificación de test autorizada por este SPEC (SPEC-0000 §8).*
8. **Documentación** — enmendar SPEC-0000 §3 (lista de idiomas) y SPEC-0009 (paridad y conteo); añadir SPEC-0014 a las tablas de `CLAUDE.md`.

### Volumen de ficheros de tutoriales

Incluye el nuevo slug `hubspot/scopes-hubspot.md`, por lo que la base pasa de 28 a **29 slugs**.

| | es | ca | eu | en | gl | pt | fr | total |
|---|---|---|---|---|---|---|---|---|
| Antes de este SPEC | 28 | 26 | 26 | 26 | 0 | 0 | 0 | 106 |
| Objetivo (29 slugs × 7) | 29 | 29 | 29 | 29 | 29 | 29 | 29 | **203** |
| Nuevos | +1 | +3 | +3 | +3 | +29 | +29 | +29 | **+97** |

Más 3 `common.json` nuevos.

---

## 6. Tests requeridos

- **`config.spec.ts`** (modificado): la lista soportada es `['es','ca','eu','en','gl','pt','fr']`; `createI18n` carga los siete bundles; el fallback a `es` sigue resolviendo `_fallbackProbe`; `t('language.label')` resuelve en al menos un idioma nuevo (p. ej. `fr`).
- **Paridad de tutoriales**: `node scripts\check-tutorial-parity.mjs` en verde con 29 × 7 = 203 ficheros.
- **i18n estructural** (opcional, recomendado): test que verifica que `gl`/`pt`/`fr` tienen el mismo conjunto de claves de primer nivel que `es` (sin claves faltantes ni sobrantes).
- Sin cambios en tests de `tutorials.ts`/`HelpSection.tsx` (el mecanismo no cambia).

---

## 7. Scopes / permisos necesarios

Ninguno. No toca HubSpot, Google Drive ni MCP. Solo ficheros de renderer y documentación.

---

## 8. Consideraciones de seguridad

Sin cambios en la superficie de seguridad: contenido estático empaquetado en build (igual que SPEC-0002/0009).

---

## 9. Documentación de usuario

Este SPEC **es** documentación de usuario (traduce los tutoriales) y multiplica los existentes por idioma. Añade además el tutorial `hubspot/scopes-hubspot.md` (creación del PAT con enlaces oficiales + scopes por característica + conjunto agrupado), canónico en `es` y traducido a los seis idiomas restantes. Enmienda SPEC-0000 §3, §10 y SPEC-0009 (lista de idiomas y conteo de paridad).

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

- [x] `SUPPORTED_LANGUAGES` y `LANGUAGE_AUTONYMS` incluyen `gl`/`pt`/`fr`; selector muestra Galego/Português/Français.
- [x] `locales/gl|pt|fr/common.json` con el conjunto de claves canónico de `es` (759 claves, 0 faltantes/extra).
- [x] `i18n/index.ts` registra los siete locales.
- [x] 203 ficheros de tutoriales (29 × 7), paridad verificada; `crm`, `dashboard` y `scopes-hubspot` presentes en los 7 idiomas.
- [x] `check-tutorial-parity.mjs` actualizado y en verde.
- [x] `config.spec.ts` actualizado (asserts de 7 idiomas + resolución `fr`).
- [x] SPEC-0000 §3/§10 y SPEC-0009 enmendados; SPEC-0014 en las tablas de `CLAUDE.md`.
- [ ] `typecheck`, `test:unit`, `test:e2e` en verde (pendiente en máquina).
- [ ] PR creada (comandos entregados, no ejecutados).

## 12. Paridad de `common.json` y cierre del gap ca/eu/en (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 6.1–6.3.

### 12.1 76 claves ausentes en `ca`/`eu`/`en` (§6.1)

`ca`/`eu`/`en` tenían 76 claves menos que `es` (75 reales + `_fallbackProbe`, que es intencional solo-es):
`common.loading/retry/loadError` y los bloques `properties.wizard.*`, `properties.newProp.*`,
`properties.kinds.*`, `properties.fieldTypes.*`, `properties.entry.*`, `properties.panel.applyTitle/Hint/applied`
y `properties.originsModal.*`. El EntryWizard y media pantalla de Propiedades caían a castellano en silencio.
Traducidas las 75 claves × 3 idiomas (los otros 3 ya estaban a paridad). Paridad verificada: 704 claves en los
6 locales contra 705 de `es` (la sonda).

### 12.2 Script de paridad de locales

`scripts/check-locale-parity.mjs` (nuevo): compara las claves aplanadas de cada `common.json` contra `es`
(canónico; `_fallbackProbe` exento) y sale con código 1 si hay faltantes o sobrantes. Scripts npm nuevos:
`check:locales` y `check:tutoriales` (este último cablea el script de SPEC-0014 §7 que no tenía entrada en
`package.json`).

### 12.3 Textos y formatos hardcodeados (§6.2, §6.3)

- Eliminado `defaultValue: 'Cargando…'` en `EntryWizard` y en el compartido `LoadingState` (enmascaraba la
  ausencia de `common.loading`, ahora presente en los 7 locales).
- `GoogleDriveConnectorScreen`: la fecha de `gdrive.lastSync` se formatea con
  `Intl.DateTimeFormat(i18n.language)` (antes `toLocaleString()` con el idioma del SO), conforme a SPEC-0000 §3.

### 12.4 Estado

IMPLEMENTADO (2026-07-02). `check:locales` en verde en sandbox (6/6 a paridad); originales verificados sanos vía
lectura directa (acentos correctos). Requiere rebuild de la app; typecheck/test en la máquina del usuario.
Revisión lingüística humana de `eu`/`ca` recomendada.
