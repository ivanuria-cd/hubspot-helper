# SPEC-0000 — Normas del Proyecto

**Estado:** VALIDADO  
**Branch:** _(meta-spec, no genera branch propio)_  
**Fecha:** 2026-06-09

---

## 1. Propósito

Este documento define las reglas que rigen **todos** los demás SPECs y el desarrollo del proyecto. Es la fuente de verdad para convenciones, flujo de trabajo y decisiones de arquitectura transversales.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Runtime desktop | Electron (última estable) | Multiplataforma macOS / Windows / Linux |
| Lenguaje | TypeScript (strict) | Tipado fuerte, mejor DX |
| UI framework | React 18+ | Ecosistema, rendimiento |
| UI components | MUI v5 (Material UI) | Componentes accesibles, theming robusto |
| Bundler | Vite + electron-vite | Build rápido, HMR |
| Testing unitario | Vitest | Integración nativa con Vite |
| Testing funcional | Playwright (Electron) | E2E con mocks |
| Gestión de estado | Zustand | Ligero, atómico |
| Persistencia local | electron-store | Configuración por proyecto |
| Auto-update | electron-updater (electron-builder) | Actualizaciones automáticas multiplataforma |

---

## 3. Accesibilidad e Internacionalización

### Accesibilidad (a11y)
- Toda interfaz gráfica debe cumplir **WCAG 2.1 nivel AA** como mínimo.
- Uso obligatorio de HTML semántico y roles ARIA donde los componentes MUI no los provean por defecto.
- Todos los elementos interactivos deben ser operables por teclado (foco visible, orden lógico de tabulación).
- Imágenes e iconos informativos deben tener `alt` o `aria-label` descriptivos.
- El contraste de color cumple los ratios de la guía CD (ver SPEC-0000 §4).
- Las pruebas de accesibilidad se incluirán en los tests funcionales de cada característica (herramienta: `axe-core` vía `@axe-core/playwright`).

### Internacionalización (i18n)
- Toda cadena de texto visible en la interfaz debe externalizarse — **prohibido texto hardcodeado** en componentes.
- Idiomas soportados: **castellano (`es`)**, **catalán (`ca`)**, **euskera (`eu`)**, **inglés (`en`)**.
- El idioma por defecto es castellano; el usuario puede cambiarlo en ajustes y la preferencia se persiste.
- Librería: **`i18next`** + **`react-i18next`**. Los ficheros de traducción son JSON organizados por `locale/feature`.
- Las fechas, números y monedas se formatean con la API nativa `Intl` según el locale activo.
- Ningún SPEC de característica puede usar texto literal en componentes React — debe referenciar siempre la clave de traducción.
- **Nombres de idioma en selectores (autónimos):** en cualquier desplegable de selección de idioma, el nombre de cada idioma se muestra **SIEMPRE en su propio idioma objetivo** (autónimo), nunca traducido al idioma activo de la interfaz. Valores canónicos: `es` → «Castellano», `ca` → «Català», `eu` → «Euskara», `en` → «English». La **etiqueta** del campo selector (p. ej. «Idioma» / «Language») sí se traduce al idioma activo; las **opciones** no. Los autónimos son una única fuente de verdad (constante compartida), no claves de traducción por locale.

---

## 4. Identidad Visual

Se aplica la guía de marca **Cloud District** en su totalidad. Resumen de restricciones críticas:

- Paleta: `#090017` (dark), `#FFFFFF` (light), `#14072B` (deep navy), `#AFFC41` (accent lime), `#C7C2D3` (secondary), `#7F7790` (tertiary)
- **Prohibido verde lima (`#AFFC41`) sobre fondo oscuro (`#090017`) como color de ningún elemento** — usar solo como fondo de badge/indicador con texto `#14072B`
- Fuentes: Poppins (light 300 para títulos grandes, semibold 600 para énfasis) + Libre Baskerville Italic para palabras o grupos semánticos importantes en los títulos principales (usar con mucha moderación)
- Ritmo dark/light obligatorio en transiciones de sección
- Sin bullet points: usar em dashes (`—`) o numeración con badge lima
- MUI theme personalizado con tokens CD — ningún componente usará colores MUI por defecto
- **Contraste del tono apagado (`#7F7790`, tertiary)**: sobre fondo claro `#FFFFFF` su ratio es 4.24:1, que **no** cumple AA para texto normal (≥4.5:1) pero **sí** para texto grande (≥3:1). Regla: `#7F7790` solo se usa en texto grande (≥24px, o ≥18.66px en negrita) o en elementos decorativos/bordes. Para texto pequeño secundario se usa `#14072B` (deepNavy / `text.primary`). Así se concilian la marca (§4) y la accesibilidad AA (§3).

---

## 5. Estructura de Carpetas

```
revops-app/
├── src/
│   ├── main/                  # Proceso principal Electron
│   │   ├── index.ts
│   │   └── updater.ts
│   ├── preload/               # Scripts de preload (contextBridge)
│   │   └── index.ts
│   ├── renderer/              # Proceso renderer (React)
│   │   ├── app/               # Shell, router, tema
│   │   ├── features/          # Una carpeta por característica (atómica)
│   │   │   └── <feature>/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── store/
│   │   │       ├── api/       # Llamadas al proceso principal o a APIs externas
│   │   │       └── tests/
│   │   ├── shared/            # Componentes, hooks y utils compartidos
│   │   └── theme/             # MUI theme con tokens CD
│   └── mcp/                   # Servidor MCP saliente
│       └── server.ts
├── connectors/
│   ├── hubspot/               # Cliente HubSpot (proceso principal)
│   └── google-drive/          # Cliente Google Drive (proceso principal)
├── specs/                     # Todos los SPECs del proyecto
├── doc/                       # Documentación extensa (instalación, uso, arquitectura)
├── sandbox/                   # Pruebas de API reales — en .gitignore
├── tests/
│   ├── unit/
│   └── functional/
├── .env.example
├── electron-builder.yml
└── package.json
```

Cada carpeta con lógica relevante tendrá su `README.md`.

---

## 6. Convenciones de Código

### Generales
- TypeScript strict mode (`"strict": true` en tsconfig)
- ESLint + Prettier con configuración del proyecto
- Imports absolutos via path aliases (`@renderer`, `@main`, `@shared`, etc.)
- Archivos: `kebab-case.ts`, componentes React: `PascalCase.tsx`
- Exports: named exports preferidos; default export solo en componentes React principales

### Comentarios
- Solo comentarios contextuales donde el "por qué" no es obvio
- Sin comentarios didácticos ni JSDoc en código interno
- Los contratos públicos (IPC, API MCP) sí llevan JSDoc mínimo

### Atomicidad de características
- Cada feature en `renderer/features/<feature>/` es autónoma
- No importar directamente entre features — comunicación vía store global o eventos IPC
- Los tipos compartidos van en `shared/types/`

---

## 7. Flujo Git

```
main  ←─── PR (squash merge) ←─── feat/spec-XXXX-<descripcion>
```

| Acción | Regla |
|--------|-------|
| Rama principal | `main` |
| Branch por SPEC | `feat/spec-XXXX-<nombre-corto>` |
| Commits | Convencional: `feat:`, `fix:`, `test:`, `docs:`, `chore:` |
| Merge | PR con squash merge; borrar rama tras merge |
| Remote | Si existe remote configurado: `git pull` antes de crear rama, `git push` después de cada commit significativo |
| Pull request | Una PR por SPEC, creada cuando el SPEC esté completamente implementado y tests en verde |

### Commit message format
```
<tipo>(scope): <descripción imperativa en español>

[cuerpo opcional — qué y por qué, no cómo]
```

---

## 8. Reglas de Testing

### Tests unitarios
- Framework: **Vitest**
- Ubicación: `src/renderer/features/<feature>/tests/` y `tests/unit/`
- Los tests cubren **comportamiento real**, no se escriben para ser fáciles de pasar
- **Prohibido modificar tests unitarios** una vez aprobados sin un SPEC específico de modificación con validación humana
- Cobertura mínima objetivo: 80% de líneas por feature
- Mocking: solo dependencias externas (IPC, APIs); nunca mockear la lógica bajo test

### Tests funcionales
- Framework: **Playwright** con Electron
- Datos: exclusivamente mocks (fixtures en `tests/functional/fixtures/`)
- Cubren flujos de usuario completos end-to-end
- Se ejecutan en CI antes de merge

### Ejecución
```bash
npm run test:unit       # Vitest
npm run test:e2e        # Playwright
npm run test            # Ambos
```

---

## 9. Formato de SPEC

Cada SPEC sigue esta estructura:

```markdown
# SPEC-XXXX — <Título>

**Estado:** BORRADOR | VALIDADO | IMPLEMENTADO
**Branch:** feat/spec-XXXX-<nombre>
**Fecha:** YYYY-MM-DD
**Depende de:** SPEC-XXXX (si aplica)

---

## 1. Objetivo
## 2. Contexto y decisiones de diseño
## 3. Interfaz de usuario (si aplica)
## 4. Modelo de datos / contratos de API
## 5. Implementación — tareas atómicas
## 6. Tests requeridos
## 7. Scopes / permisos necesarios (HubSpot, Google, etc.)
## 8. Consideraciones de seguridad
## 9. Documentación de usuario
## 10. Criterios de aceptación
```

---

## 10. Documentación de Usuario (Tutoriales)

Toda característica de la aplicación — empezando por los conectores (HubSpot, Google Drive) y las features de negocio (comenzando por SPEC-0006) — debe incluir documentación de usuario en forma de tutoriales paso a paso.

### Reglas

- Los tutoriales se guardan en `doc/tutoriales/<feature>/<locale>/`, con una subcarpeta por idioma (`es`, `ca`, `eu`, `en`). El **castellano (`es`) es la versión canónica** y siempre debe existir para cada tarea (ver SPEC-0009).
- Cada tutorial es un fichero Markdown con el nombre de la tarea que describe (ej: `conectar-hubspot.md`, `crear-mapa-de-propiedades.md`). **El `slug` (nombre de fichero) es el mismo en todos los idiomas** — es el identificador estable del tutorial; el título traducido vive en el encabezado `# ` del propio `.md`.
- El lenguaje es claro, orientado a usuarios de negocio (RevOps), sin jerga técnica innecesaria.
- Cada paso va numerado e incluye, si aplica, una descripción de qué esperar ver en la pantalla.
- Si la tarea tiene prerrequisitos (ej: "debes tener configurado el conector HubSpot"), se indican al inicio.
- Los tutoriales se escriben en castellano como idioma base; el resto de idiomas (`ca`, `eu`, `en`) se mantienen traducidos en su subcarpeta de idioma. El visor de Ayuda muestra cada tutorial en el idioma activo de la interfaz y **cae a castellano con un aviso** si falta la traducción (SPEC-0009).
- Cada SPEC de característica debe listar en su sección §9 los tutoriales que genera y su ruta en `doc/tutoriales/`.
- **Visibilidad en la app**: los tutoriales son para el usuario final de la aplicación y **deben poder verse desde la interfaz**, no solo como ficheros Markdown del repositorio. Se exponen en una sección **Ayuda** accesible desde el menú lateral, que lista los tutoriales por característica y los renderiza dentro de la app. El visor de Ayuda (componente, ruta y carga de los `.md`) queda definido en **SPEC-0002 (App Shell)**; cada SPEC de característica solo aporta sus ficheros en `doc/tutoriales/<feature>/` y se muestran automáticamente.

### Estructura de un tutorial

```markdown
# <Título de la tarea>

**Prerrequisitos:** ...
**Tiempo estimado:** ...

## Pasos

1. ...
2. ...
3. ...

## Resultado esperado

...

## Preguntas frecuentes

...
```

---

## 11. Seguridad en la Cadena de Suministro npm

Los ataques de cadena de suministro sobre paquetes npm son una amenaza activa y documentada (ref: [campaña Miasma, Microsoft Security Blog, 2026-06-02](https://www.microsoft.com/en-us/security/blog/2026/06/02/preinstall-persistence-inside-red-hat-npm-miasma-credential-stealing-campaign/)). El vector principal son hooks `preinstall`/`postinstall` que se ejecutan automáticamente al hacer `npm install` y pueden robar credenciales, propagarse y destruir entornos.

### Reglas obligatorias al añadir dependencias

- **Antigüedad mínima de 10 días**: antes de añadir o actualizar un paquete, verificar en [npmjs.com](https://www.npmjs.com) que la versión específica tiene al menos 10 días de publicación. Las versiones recién publicadas no han tenido tiempo de revisión por la comunidad.
- **Auditoría previa**: ejecutar `npm audit` y revisar el resultado antes de hacer commit de cualquier cambio en `package.json` o `package-lock.json`.
- **Lockfile obligatorio**: `package-lock.json` siempre versionado. Nunca instalar sin lockfile en CI.
- **Scripts de instalación**: evaluar la necesidad de hooks `preinstall`/`postinstall` en cualquier dependencia nueva. Si un paquete legítimo no los necesita y los tiene, es señal de alerta.
- **Alcance de scopes desconocidos**: desconfiar de paquetes bajo scopes de organizaciones conocidas (ej: `@redhat-cloud-services`, `@aws-sdk`) publicados recientemente sin historial largo de versiones.

### Verificación periódica (mensual)

- Ejecutar `npm audit` (o `npm audit fix`) y revisar el reporte completo.
- Comprobar que ningún paquete en el árbol de dependencias haya publicado versiones en los últimos 10 días sin que el equipo lo haya decidido explícitamente.
- Revisar el [GitHub Advisory Database](https://github.com/advisories) y el [npm security advisories](https://www.npmjs.com/advisories) en busca de alertas sobre paquetes en uso.
- Verificar que el `package-lock.json` no haya sido modificado fuera del flujo de PR (indica posible compromiso del entorno).

### En CI/CD

- Instalar siempre con `npm ci` para garantizar reproducibilidad a partir del `package-lock.json`.
- No ejecutar `npm install` con permisos elevados.
- Rotar tokens npm y de GitHub periódicamente y nunca exponerlos en logs.

---

## 12. Gestión de Secrets y Entorno

- `.env` en `.gitignore`; `.env.example` versionado con todas las claves sin valor
- Claves API almacenadas con `electron-store` en el keychain del SO (vía `keytar`)
- Nunca exponer secrets al renderer directamente — solo vía IPC controlado

---

## 13. Dependencias de los SPECs

```
SPEC-0000 (Normas)
    └── SPEC-0001 (Fundación)
            ├── SPEC-0002 (App Shell)
            │       ├── SPEC-0003 (HubSpot Connector)
            │       ├── SPEC-0004 (Google Drive Connector)
            │       └── SPEC-0005 (Capa MCP/API)
            └── [futuros SPECs de características]
```

---

## 14. Criterios de Aceptación de este SPEC

- [ ] Equipo revisa y valida convenciones
- [ ] Stack aprobado
- [ ] Estructura de carpetas acordada
- [ ] Reglas de testing aceptadas
