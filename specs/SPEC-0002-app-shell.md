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
- `<TopBar>` muestra breadcrumb del contexto actual + nombre del proyecto activo + indicador de update.

---

## 3. Interfaz de Usuario

### Pantalla de Bienvenida (`/`)

```
┌─────────────────────────────────────────────────────────┐
│  [DARK #090017]                                         │
│                                                         │
│  RevOps Assistant          [Cloud District logo]        │
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
│  S   │  TopBar: [Breadcrumb]  [Proyecto: X]  [🔔]     │
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
12. **Commit** — `feat(shell): app shell con bienvenida, proyectos y menú lateral`

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
- [ ] Todos los tests del SPEC en verde — _tests escritos; ejecutar `npm install` + `npm run test` en local para verificar_
- [ ] PR creada, revisada y mergeada en `main`

---

## 9. Estado de Implementación (2026-06-09)

Implementado en esta iteración:

- **Modelo y contrato** — `shared/types/project.ts` (`Project`, `NewProjectInput`); canales `projects:list|create|update|delete|set-active` añadidos a `shared/types/ipc.ts`, `preload/index.ts` y registrados en `main/index.ts`.
- **Persistencia main** — `main/projects.ts`: servicio CRUD puro sobre `ProjectsStorage` inyectable + backend `electron-store`; `id` con `crypto.randomUUID()`; validación de nombre (requerido, máx. 80).
- **Estado del shell** — `renderer/app/store/shell-store.ts` (Zustand): proyecto activo, sidebar colapsado, estado de update.
- **Bienvenida** — `WelcomeScreen`, `ProjectCard` (badge lima), `NewProjectDialog` (validación), contenedor `WelcomeRoute` con `useProjects`.
- **Layout** — `Sidebar` (Drawer permanent + rail mode + grupos + indicador lima), `TopBar` (breadcrumb + proyecto activo + badge de update), `MainLayout` (carga el proyecto activo vía IPC), `UpdateBanner`.
- **Router** — `renderer/app/router.tsx` con memory router: `/`, `/project/:projectId/*` (dashboard, crm, crm/maps, reporting, config) y fallback.
- **i18n** — claves `welcome|dialog|sidebar|topbar|update|sections` en los cuatro locales (es, ca, eu, en).
- **Tests** — unitarios `projects.spec.ts`, `shell-store.spec.ts`, `WelcomeScreen.spec.tsx`, `NewProjectDialog.spec.tsx`; funcionales `welcome-flow.spec.ts`, `project-switch.spec.ts`. Vitest configurado con `jsdom` para `.tsx`.
- **Dependencias** — añadidas `react-router-dom`, `@mui/icons-material`, y dev: `@testing-library/{react,jest-dom,user-event}`, `jsdom`. `onlyBuiltDependencies: [electron, esbuild]` en `pnpm-workspace.yaml` (ubicación que pnpm v11 lee en proyectos workspace) para autorizar de forma explícita y versionada solo esos dos scripts de build (pnpm los ignora por defecto; ambos requieren su binario nativo). Alineado con SPEC-0000 §11.

Pendiente (entorno local): ejecutar `npm install` y `npm run typecheck && npm run test`, y abrir la PR. No se pudo correr la batería completa en el sandbox de generación (instalación de Electron/Playwright no viable bajo sus límites).
