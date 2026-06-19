# SPEC-0002 — App Shell

**Estado:** IMPLEMENTADO — pendiente de ejecutar la batería de tests en local  
**Branch:** `feat/spec-0002-app-shell`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0001

---

## 1. Objetivo

Implementar la estructura visual y de navegación completa de la aplicación: pantalla de bienvenida, selector de proyectos, menú lateral de capacidades y layout principal que actuará de contenedor para todas las características futuras.

---

## 2. Contexto y Decisiones de Diseño

### Router
- **React Router v6** (modo memory — no hay URLs reales en Electron).
- Las rutas de primer nivel corresponden a proyectos; las rutas de segundo nivel a capacidades dentro del menú lateral.

### Gestión de estado del shell
- **Zustand** con un store `shellStore`: proyecto activo, menú colapsado/expandido, estado de notificaciones de update.
- Los proyectos se persisten con `electron-store` (proceso main, vía IPC).

### Pantalla de bienvenida
- Se muestra al abrir la app si no hay proyecto seleccionado (o si el usuario accede vía ruta `/`).
- Ritmo dark/light de marca CD: hero dark con logo, sección light con lista de proyectos.

### Proyectos
- Un proyecto = un conjunto de configuración (nombre, portal HubSpot asociado, carpeta Google Drive, etc.).
- Se almacenan localmente; en el futuro podrán sincronizarse.
- Máximo razonable inicial: sin límite hard (lista scrollable).

### Menú lateral
- Basado en MUI `Drawer` (variant `permanent` en escritorio).
- Colapsable a iconos (rail mode) para maximizar el espacio de trabajo.
- Grupos de capacidades con separador visual.
- Indicador de elemento activo con accent lima.

### Layout principal
- Tres zonas: `<Sidebar>` | `<TopBar>` | `<MainContent>`.
- `<TopBar>` muestra breadcrumb del contexto actual + nombre del proyecto activo + **selector de idioma global** + indicador de update.

### Selección de idioma
- El selector de idioma (`LanguageSwitcher`, definido en SPEC-0001) es **global** y vive en el header de la ventana, no en la configuración del proyecto.
- Se monta en el `<TopBar>` (todas las pantallas dentro de un proyecto) y en el hero de la pantalla de bienvenida (variante `onDark`), de modo que está disponible en todo el programa, incluido el primer arranque sin proyecto.
- Cambia el idioma en caliente (sin reiniciar) y persiste la preferencia vía electron-store.

---

## 3. Interfaz de Usuario

### Pantalla de Bienvenida (`/`)

```
┌─────────────────────────────────────────────────────────┐
│  [DARK #090017]                                         │
│                                                         │
│  RevOps Assistant       [Idioma▾]  [Cloud District]     │
│  *Herramienta de operaciones de revenue.*               │
│                                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT #FFFFFF]                                        │
│                                                         │
│  Proyectos recientes           [+ Nuevo proyecto]       │
│  ─────────────────────────────────────────────          │
│  [01] Nombre Proyecto A        Cliente X  →             │
│  [02] Nombre Proyecto B        Cliente Y  →             │
│  ─────────────────────────────────────────────          │
│  ¿Primer uso? Configura tu primer proyecto.             │
└─────────────────────────────────────────────────────────┘
```

- Los números `[01]`, `[02]` usan el badge lima (Deep Navy sobre `#AFFC41`).
- Botón "+ Nuevo proyecto" abre un diálogo de creación.

### Diálogo "Nuevo Proyecto"
Campos: Nombre del proyecto, Descripción (opcional). La configuración de conectores se realiza dentro del proyecto, no aquí.

### Layout Principal (tras seleccionar proyecto)

```
┌──────┬────────────────────────────────────────────────┐
│  S   │  TopBar: [Breadcrumb]  [Proyecto: X] [Idioma▾] [🔔] │
│  I   ├────────────────────────────────────────────────┤
│  D   │                                                │
│  E   │              <MainContent />                   │
│  B   │                                                │
│  A   │                                                │
│  R   │                                                │
└──────┴────────────────────────────────────────────────┘
```

### Menú Lateral — Grupos (placeholder, se amplía por SPEC de cada feature)

```
╔══════════╗
║  [Logo]  ║  ← Clic colapsa/expande
╠══════════╣
║ Dashboard║
╠══════════╣
║ CRM      ║
║  — Mapas ║
╠══════════╣
║ Reporting║
╠══════════╣
║ ─────    ║
║ Config   ║
╚══════════╝
```

Estado colapsado: solo iconos con tooltips.

### Sección Ayuda (tutoriales in-app)

Conforme a SPEC-0000 §10, los tutoriales de usuario deben poder verse desde la interfaz. El shell expone una sección **Ayuda** en el pie del menú lateral (junto a Configuración):

- Entrada `Ayuda` en el sidebar (footer) → ruta `help` dentro del proyecto.
- La pantalla de Ayuda lista los tutoriales disponibles **agrupados por característica** (carpeta de `doc/tutoriales/<feature>/`) y renderiza el Markdown seleccionado dentro de la app.
- Los ficheros `.md` se cargan en tiempo de build con `import.meta.glob('…/doc/tutoriales/**/*.md', { query: '?raw', eager: true })`, de modo que se empaquetan con el renderer; no requiere IPC ni acceso a disco en runtime.
- El renderizado de Markdown lo realiza un componente propio `MarkdownView` (sin dependencias externas) que soporta encabezados, párrafos, listas, énfasis y código en línea.
- Cada nueva característica solo añade sus `.md` en `doc/tutoriales/<feature>/<locale>/`; aparecen automáticamente en Ayuda sin tocar el shell.
- **Multidioma (SPEC-0009)**: el visor es consciente del idioma activo de i18next. Carga la variante del tutorial en el idioma activo y, si no existe, cae a la versión castellana mostrando un aviso (`help.fallbackNotice`). La selección de tutorial (`feature/slug`) se mantiene al cambiar de idioma; solo cambia el contenido renderizado. La lógica de resolución vive en `tutorials.ts` (`resolveContent`, `resolveTitle`).

---

## 4. Modelo de Datos

### Tipo `Project`
```typescript
interface Project {
  id: string;           // uuid
  name: string;
  description?: string;
  createdAt: string;    // ISO 8601
  lastOpenedAt: string;
  connectors: {
    hubspot?: { portalId: string };
    googleDrive?: { folderId: string };
  };
}
```

### IPC Channels nuevos
| Canal | Dirección | Descripción |
|-------|-----------|-------------|
| `projects:list` | renderer → main | Devuelve `Project[]` |
| `projects:create` | renderer → main | Crea proyecto, devuelve `Project` |
| `projects:update` | renderer → main | Actualiza proyecto |
| `projects:delete` | renderer → main | Elimina proyecto |
| `projects:set-active` | renderer → main | Establece proyecto activo en sesión |

---

## 5. Implementación — Tareas Atómicas

1. **Instalar dependencias** — `react-router-dom`, `@mui/icons-material`
2. **Crear `shellStore`** (Zustand) — proyecto activo, sidebar collapsed, notificaciones
3. **IPC handler `projects:*`** en proceso main — CRUD con electron-store
4. **Componente `<WelcomeScreen />`** — hero dark + lista de proyectos light
5. **Componente `<ProjectCard />`** — ítem de lista con badge lima
6. **Diálogo `<NewProjectDialog />`** — form controlado con validación
7. **Componente `<Sidebar />`** — MUI Drawer permanent + rail mode + grupos
8. **Componente `<TopBar />`** — AppBar con breadcrumb, proyecto activo, update badge
9. **Componente `<MainLayout />`** — wrapper con Sidebar + TopBar + Outlet
10. **Configurar React Router** — rutas `/`, `/project/:id/*`, layout anidado
11. **Componente `<UpdateBanner />`** — banner no intrusivo cuando hay update disponible (consume evento IPC de SPEC-0001)
12. **Sección Ayuda** — feature `help` (`tutorials.ts` con `import.meta.glob`, `MarkdownView`, `HelpSection`), ítem `Ayuda` en el sidebar (footer) y ruta `help`
13. **Commit** — `feat(shell): app shell con bienvenida, proyectos y menú lateral`

---

## 6. Tests Requeridos

### Unitarios
- `shellStore.spec.ts` — transiciones de estado (cambiar proyecto activo, colapsar menú)
- `projects-ipc.spec.ts` — handlers IPC de proyectos (CRUD correcto en store)
- `WelcomeScreen.spec.tsx` — renderiza lista de proyectos, muestra estado vacío
- `NewProjectDialog.spec.tsx` — validación del formulario (nombre requerido, longitud)

### Funcionales
- `welcome-flow.spec.ts` — flujo completo: abrir app → crear proyecto → entrar al proyecto → sidebar visible
- `project-switch.spec.ts` — cambiar de proyecto desde el menú o botón de retorno
- `help-section.spec.ts` — abrir Ayuda desde el sidebar, ver la lista de tutoriales y renderizar uno (añadido al ampliar el shell con la sección Ayuda)

---

## 7. Consideraciones de Seguridad

- El `id` de proyecto se genera con `crypto.randomUUID()` en el proceso main.
- Los datos de proyecto no contienen credenciales — solo referencias (portalId, folderId).

---

## 8. Criterios de Aceptación

- [x] Pantalla de bienvenida se muestra si no hay proyecto activo (ruta `/` → `WelcomeRoute`)
- [x] Se puede crear, seleccionar y eliminar proyectos (IPC `projects:*` + `useProjects`)
- [x] El sidebar se colapsa a rail mode y se expande correctamente (`Sidebar` + `shellStore`)
- [x] La navegación entre rutas funciona sin recargas (React Router memory)
- [x] El banner de update aparece cuando hay una versión nueva disponible (`UpdateBanner`)
- [x] Los colores y tipografía respetan la guía CD (sin verde lima sobre fondo oscuro; lima solo en badge/Chip e indicador de activo)
- [x] El selector de idioma está en el header global (`TopBar` + hero de bienvenida) y cambia el idioma en todo el programa sin reiniciar
- [x] La sección **Ayuda** del sidebar lista los tutoriales de `doc/tutoriales/` y los renderiza dentro de la app (SPEC-0000 §10)
- [x] Todos los tests del SPEC en verde — `npm run typecheck` y `npm run test:unit` pasan en local
- [ ] PR creada, revisada y mergeada en `main`

---

## 9. Estado de Implementación (2026-06-09)

Implementado en esta iteración:

- **Modelo y contrato** — `shared/types/project.ts` (`Project`, `NewProjectInput`); canales `projects:list|create|update|delete|set-active` añadidos a `shared/types/ipc.ts`, `preload/index.ts` y registrados en `main/index.ts`.
- **Persistencia main** — `main/projects.ts`: servicio CRUD puro sobre `ProjectsStorage` inyectable + backend `electron-store`; `id` con `crypto.randomUUID()`; validación de nombre (requerido, máx. 80).
- **Estado del shell** — `renderer/app/store/shell-store.ts` (Zustand): proyecto activo, sidebar colapsado, estado de update.
- **Bienvenida** — `WelcomeScreen`, `ProjectCard` (badge lima), `NewProjectDialog` (validación), contenedor `WelcomeRoute` con `useProjects`. Logo de marca (`shared/assets/cloud-district-logo.svg`) arriba a la izquierda del hero; selector de idioma a la derecha.
- **Layout** — `Sidebar` (Drawer permanent + rail mode + grupos + indicador lima), `TopBar` (breadcrumb + proyecto activo + badge de update), `MainLayout` (carga el proyecto activo vía IPC), `UpdateBanner`.
- **Router** — `renderer/app/router.tsx` con memory router: `/`, `/project/:projectId/*` (dashboard, crm, crm/maps, reporting, config) y fallback.
- **i18n** — claves `welcome|dialog|sidebar|topbar|update|sections` en los cuatro locales (es, ca, eu, en).
- **Ayuda (tutoriales in-app)** — feature `renderer/features/help/`: `tutorials.ts` carga los `.md` de `doc/tutoriales/**` con `import.meta.glob('?raw', eager)` y los agrupa por característica; `MarkdownView` renderiza el Markdown sin dependencias externas; `HelpSection` muestra la lista + visor. Ítem `Ayuda` en el footer del sidebar (`nav-items.ts`) y ruta `help` en el router. Claves i18n `sidebar.help` y `help.*` añadidas a los cuatro locales. Cumple SPEC-0000 §10 (visibilidad en la interfaz).
- **Selector de idioma global** — el `LanguageSwitcher` se trasladó al header: se monta en `TopBar` y en el hero de `WelcomeScreen` (variante `onDark`), y se retiró de `ConfigSection` (ahora placeholder). Disponible en todo el programa, incluido el arranque sin proyecto. La preferencia sigue persistiéndose vía electron-store (`settings:*`).
- **Tests** — unitarios `projects.spec.ts`, `shell-store.spec.ts`, `WelcomeScreen.spec.tsx`, `NewProjectDialog.spec.tsx`; funcionales `welcome-flow.spec.ts`, `project-switch.spec.ts`. Vitest configurado con `jsdom` para `.tsx`.
- **Dependencias** — añadidas `react-router-dom`, `@mui/icons-material`, y dev: `@testing-library/{react,jest-dom,user-event}`, `jsdom`.

Arreglos durante la verificación:

- **Gestor de paquetes → npm** — se abandona pnpm: su verja de aprobación de scripts de build (`ERR_PNPM_IGNORED_BUILDS`) bloqueaba cada comando. El proyecto usa **npm**: `package-lock.json` versionado, `npm install` / `npm ci`; eliminados `pnpm-lock.yaml` y `pnpm-workspace.yaml`. Scripts CMD (`setup.cmd`, `verify-spec-0002.cmd`, `commit-inicial.cmd`) y SPEC-0000 §11 actualizados.
- **Bug de tipado heredado de SPEC-0001** — `theme/typography.ts` importaba `TypographyOptions` (no exportado por `@mui/material/styles`); corregido a `TypographyVariantsOptions`. Aflora al ejecutar `npm run typecheck` por primera vez con dependencias instaladas.

- **Contraste AA del texto secundario** — `a11y-baseline.spec.ts` (ya operativo) detectó que el tono apagado `#7F7790` sobre blanco no cumple AA para texto normal (4.24:1). Aplicada la regla de SPEC-0000 §4: el estado vacío de bienvenida se sube a texto grande (24px) y el resto de texto secundario pequeño (descripciones de tarjeta, breadcrumb/topbar, placeholders de sección) pasa a `text.primary` (deepNavy).

Estado: `npm run typecheck`, `npm run test:unit` y `npm run test:e2e` (4 funcionales, incluido a11y) en verde. Pendiente solo: abrir la PR.
