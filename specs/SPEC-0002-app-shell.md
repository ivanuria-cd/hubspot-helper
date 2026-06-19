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

---

## 10. Feedback global — Snackbar (IMPLEMENTADO, 2026-06-19)

**Origen:** Informe de revisión UX 2026-06-19, hallazgo #1. El feedback de éxito hoy es inline y fugaz (p. ej. "Copiado" desaparece a los 2 s en MCP; el feedback se borra al cambiar de pestaña en el conector HubSpot; un guardado correcto solo limpia el input sin confirmar). No existe un mecanismo transversal de notificación.

### 10.1 Objetivo

Proveer un sistema de notificaciones efímeras (toasts) **global y reutilizable** por cualquier feature, montado una sola vez en el shell, que confirme acciones (éxito) y reporte errores transitorios de forma accesible y consistente.

### 10.2 Diseño

- Componente `SnackbarProvider` + hook `useSnackbar()` en `renderer/shared/components/feedback/`.
- Se monta en `app/App.tsx`, dentro del `ThemeProvider` y por encima del router, para estar disponible en todo el árbol del renderer.
- API del hook:
  ```typescript
  const { notify } = useSnackbar();
  notify({
    message: string,                       // texto YA traducido por el llamador
    severity?: 'success' | 'info' | 'warning' | 'error',  // default 'success'
    autoHideMs?: number | null,            // null = persistente hasta cierre manual
  });
  ```
- Una notificación visible a la vez; las siguientes se encolan (FIFO).
- Render con MUI `Snackbar` + `Alert` con la paleta CD (sin verde lima sobre fondo oscuro; §4 de SPEC-0000).
- Posición `bottom-center` para no tapar paneles laterales ni CTAs superiores.
- Auto-cierre por defecto: `success`/`info` a 4000 ms; `warning` a 6000 ms; `error` **persistente** (`autoHideMs: null`) con botón de cierre obligatorio.

### 10.3 i18n

El provider **no traduce**: recibe el `message` ya resuelto. Cada feature usa sus propias claves i18n. Se añade una clave común `common:snackbar.close` para el `aria-label` del botón de cierre.

### 10.4 Accesibilidad

- El `Alert` usa `role="alert"` y `aria-live` (`polite` para no-error, `assertive` para `error`).
- No roba el foco; el botón de cierre tiene `aria-label` (`snackbar.close`).
- Cerrable con la tecla Escape cuando está enfocado.

### 10.5 Relación con los `Alert` existentes

Los `Alert` **estáticos** que reportan errores de carga de página o estado persistente (p. ej. error al cargar propiedades) **se mantienen**: no son transitorios. El Snackbar cubre confirmaciones de acción y errores puntuales de operación (guardar, copiar, sincronizar, regenerar).

### 10.6 Tareas atómicas

1. `SnackbarProvider` + `useSnackbar` con cola en `renderer/shared/components/feedback/`.
2. Montaje en `app/App.tsx`.
3. Clave i18n `snackbar.close` en los cuatro locales.
4. README de la carpeta `feedback/`.

### 10.7 Tests

- Unit: `useSnackbar` encola y muestra en orden; auto-hide respeta severidad; error es persistente.
- Unit: render con `role="alert"` y `aria-live` correcto por severidad.
- La adopción por feature se prueba en cada SPEC de feature (no aquí).

### 10.8 Criterios de aceptación

- [ ] `useSnackbar().notify(...)` muestra un toast accesible desde cualquier feature.
- [ ] Éxito auto-cierra; error permanece hasta cierre manual.
- [ ] Cumple AA (contraste, `aria-live`, foco) y marca CD.

---

## 11. Confirmación de acciones destructivas — ConfirmDialog (IMPLEMENTADO, 2026-06-19)

**Origen:** Informe de revisión UX 2026-06-19, hallazgo #2. Acciones destructivas a un clic, sin confirmación: borrar propiedad (SPEC-0006), borrar origen (SPEC-0006), borrar/archivar objeto custom (SPEC-0007), regenerar token MCP —invalida toda sesión— (SPEC-0005), descartar cambios pendientes (SPEC-0008).

### 11.1 Objetivo

Proveer un diálogo de confirmación **compartido y consistente**, basado en promesa, que cualquier feature deba usar antes de una acción destructiva o irreversible.

### 11.2 Diseño

- Componente `ConfirmDialog` + hook `useConfirm()` en `renderer/shared/components/feedback/`.
- Provider montado en `app/App.tsx` junto al de Snackbar.
- API basada en promesa:
  ```typescript
  const confirm = useConfirm();
  const ok = await confirm({
    title: string,            // YA traducido
    body: string,             // YA traducido
    confirmLabel?: string,    // default common:confirm.accept
    cancelLabel?: string,     // default common:confirm.cancel
    tone?: 'default' | 'danger',  // 'danger' pinta el botón confirmar en color error
  });
  if (!ok) return;            // usuario canceló
  ```
- Render con MUI `Dialog`. En `tone: 'danger'` el botón de confirmar usa `color="error"`.

### 11.3 Accesibilidad

- `Dialog` con `aria-labelledby` (título) y `aria-describedby` (cuerpo); focus-trap nativo de MUI.
- **Foco inicial en Cancelar** (acción segura). Escape = cancelar. Enter activa el botón enfocado.

### 11.4 i18n

Claves comunes `common:confirm.accept` y `common:confirm.cancel`. Título y cuerpo los aporta cada feature con sus propias claves.

### 11.5 Adopción (obligatoria en las features)

Toda acción que borre, archive, regenere o descarte cambios **debe** pasar por `useConfirm()`. Los SPECs afectados añaden su sección de adopción listando los call sites concretos (SPEC-0003 §13, 0004 §16, 0005 §12, 0006 §23, 0007 §17, 0008 §17).

### 11.6 Tareas atómicas

1. `ConfirmDialog` + `useConfirm` (promise-based) en `renderer/shared/components/feedback/`.
2. Montaje del provider en `app/App.tsx`.
3. Claves i18n `confirm.accept`, `confirm.cancel` en los cuatro locales.

### 11.7 Tests

- Unit: `confirm()` resuelve `true` al aceptar y `false` al cancelar/Escape.
- Unit: foco inicial en Cancelar; `tone:'danger'` aplica `color="error"`.

### 11.8 Criterios de aceptación

- [ ] `await confirm(...)` bloquea la acción hasta decisión del usuario.
- [ ] Foco seguro por defecto y operable por teclado (AA).
- [ ] Las features destructivas lo adoptan (verificado en sus SPECs).

---

## 12. Registro de implementación (2026-06-19) — §10 y §11

- **Primitivas** en `renderer/shared/components/feedback/`: `SnackbarProvider`/`useSnackbar` (cola FIFO, auto-hide por severidad, error persistente, `role`/`aria-live`), `ConfirmProvider`/`useConfirm` (promesa, foco en Cancelar, `tone:'danger'`), barrel `index.ts` y `README.md`.
- **Montaje** en `app/App.tsx`: `<SnackbarProvider><ConfirmProvider>` dentro de `ThemeProvider`/`I18nextProvider`.
- **i18n**: `snackbar.close`, `confirm.accept`, `confirm.cancel` en los cuatro locales.
- **Tests**: `SnackbarProvider.spec.tsx` (4) y `ConfirmDialog.spec.tsx` (4) en verde.
- **Verificación**: `npm run typecheck` (node + web) en verde. Suite unitaria completa pendiente de ejecutar en máquina (límite de tiempo del sandbox); los specs nuevos pasan en local.

---

## 13. Retirada temporal de «Mapas» y «Reporting» del menú (IMPLEMENTADO, 2026-06-19)

**Origen:** decisión de producto — no exponer secciones sin funcionalidad ni SPEC.

Mientras no existan sus SPECs, se retiran del menú lateral las entradas **Mapas** (`crm/maps`) y **Reporting** (`reporting`), hoy `SectionPlaceholder` vacíos.

- `nav-items.ts`: eliminar los ítems `crm/maps` y `reporting`. El separador de grupo (`endsGroup`) pasa al último ítem de CRM (Formularios).
- `router.tsx`: eliminar las rutas `crm/maps` y `reporting` (quedarían sin enlace; el fallback `*` ya redirige a `/`).
- i18n: las claves `sidebar.maps` y `sidebar.reporting` se conservan (se reutilizarán al reintroducirlas); no se borran.
- Cuando se aprueben sus SPECs se vuelven a añadir ítem + ruta + pantalla.

---

## 14. Consistencia de UI — componentes y constantes compartidas (IMPLEMENTADO, 2026-06-19)

**Origen:** Informe de revisión UX 2026-06-19, hallazgo #6 (consistencia, impacto medio). Cada feature reinventa estados vacíos, badges de estado y anchos de panel; falta convención de botón de acción.

### 14.1 Objetivo

Extraer a `renderer/shared/components/` un pequeño conjunto de primitivas de presentación reutilizables y unas constantes de layout, y adoptarlas en las features para homogeneizar la UI sin cambiar comportamiento.

### 14.2 Piezas

1. **`EmptyState`** — estado vacío estándar (icono opcional + texto + acción opcional). Sustituye los `Typography`/`Alert` sueltos que hoy hacen de empty state (p. ej. propiedades, formularios, objetos, ayuda, drive). API: `{ message: string; action?: ReactNode; icon?: ReactNode }`.
2. **`StatusBadge` unificado** — hoy existen `property-management/StatusBadge`, `custom-objects/ObjectStatusBadge` y `forms/CoverageBadge` por separado. Se unifica en `shared/components/StatusBadge` con un mapa de tono (`success|warning|error|default`) → color CD + etiqueta i18n. Las variantes por feature pasan a ser wrappers finos o se reemplazan.
3. **Constantes de layout** — `shared/components/layout-constants.ts` con `SIDE_PANEL_WIDTH` (unifica 420/460 → un único valor, p. ej. 440) usado por `EntryPanel`, `FormPanel`, `ObjectPanel`.
4. **Convención de botón de acción** — documentar y aplicar: acción **primaria** de una pantalla/diálogo = `variant="contained"`; secundarias = `outlined`/`text`; destructivas = `color="error"`. Se corrige donde diverge (p. ej. el CTA principal de propiedades en `outlined`).

### 14.3 Alcance y no-alcance

- Refactor de presentación; **no** cambia lógica ni textos (salvo unificar claves de badge si procede, documentándolo).
- No toca las primitivas de feedback (§10/§11) ni el Dashboard (SPEC-0010).
- Adopción feature a feature; cada cambio es sustitución 1:1 verificable por typecheck/tests existentes.

### 14.4 Tareas atómicas

1. `EmptyState`, `StatusBadge`, `layout-constants.ts` en `shared/components/` (+ tests unitarios mínimos y README).
2. Adoptar `EmptyState` en propiedades, objetos, formularios, ayuda y drive.
3. Unificar badges: reemplazar `StatusBadge`/`ObjectStatusBadge`/`CoverageBadge` por el compartido (wrappers donde haya semántica propia).
4. Aplicar `SIDE_PANEL_WIDTH` en los tres paneles laterales.
5. Revisar variantes de botón primario/secundario por pantalla y alinear a la convención.

### 14.5 Tests

- Unit de `EmptyState` y `StatusBadge` (render por tono/props, a11y).
- Los tests existentes de cada feature deben seguir en verde tras la sustitución (no se reescriben salvo que cambie un texto, con su nota).

### 14.6 Criterios de aceptación

- [ ] Un único `EmptyState` y un único `StatusBadge` en `shared/components/`, adoptados por las features.
- [ ] Ancho de panel lateral unificado por constante.
- [ ] Convención de botón aplicada y documentada.
- [ ] `npm run typecheck` y `npm run test:unit` en verde.

---

## 15. Registro de implementación (2026-06-19) — §13 y §14

- **§13 (nav):** `nav-items.ts` sin `crm/maps` ni `reporting` (separador de grupo movido a Formularios); `router.tsx` sin esas rutas. Claves `sidebar.maps`/`sidebar.reporting` conservadas.
- **§14 (consistencia):** nuevos `shared/components/StatusBadge.tsx` (por tono: positive/warning/negative/neutral, colores CD), `EmptyState.tsx` y `layout-constants.ts` (`SIDE_PANEL_WIDTH = 440`). Adopción: `property-management/StatusBadge` y `custom-objects/ObjectStatusBadge` reconvertidos a wrappers del compartido; `EntryPanel`/`ObjectPanel`/`FormPanel` usan `SIDE_PANEL_WIDTH`; `EmptyState` adoptado en los estados vacíos de Propiedades/Objetos/Formularios. `CoverageBadge` se mantiene (semántica propia). **Convención de botón**: las CTAs primarias ya eran `contained` en las tres pantallas CRM; no hizo falta cambio.
- **Verificación:** `npm run typecheck` (node + web) y `eslint` de los ficheros tocados en verde. Suite unitaria completa pendiente en máquina (límite de tiempo del sandbox).

---

## 16. Accesibilidad puntual e higiene (IMPLEMENTADO, 2026-06-19)

**Origen:** Informe de revisión UX 2026-06-19, hallazgo #8 (bajo impacto / bajo esfuerzo).

- **IA del menú:** las áreas de CRM (Propiedades, Objetos custom, Formularios) se indentan como hijas de CRM en el sidebar (`NavItem.child` + `pl` en `Sidebar`), para reflejar la jerarquía. En modo colapsado (rail) no se indenta.
- **Accesibilidad:** `SearchIcon` decorativo del selector de carpeta de Drive marcado `aria-hidden` (SPEC-0004); los checkboxes de fila del asistente «+ Formulario» reciben `aria-label` (campo / obligatorio / oculto + nombre del campo) (SPEC-0008). Nota: `FolderIcon` de la pantalla de Drive y la tabla del asistente (que ya tenía `TableHead` con cabeceras) estaban correctos; no requirieron cambio.
- **Higiene:** eliminado el fichero muerto `renderer/features/property-management/components/PropertiesTable.tsx` (`export {}`, sin referencias; reemplazado por el modelo de entradas en SPEC-0006 §16).
- **Verificación:** `npm run typecheck` y `eslint` en verde.
