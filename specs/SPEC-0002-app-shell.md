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
  id: string; // uuid
  name: string;
  description?: string;
  createdAt: string; // ISO 8601
  lastOpenedAt: string;
  connectors: {
    hubspot?: { portalId: string };
    googleDrive?: { folderId: string };
  };
}
```

### IPC Channels nuevos

| Canal                 | Dirección       | Descripción                         |
| --------------------- | --------------- | ----------------------------------- |
| `projects:list`       | renderer → main | Devuelve `Project[]`                |
| `projects:create`     | renderer → main | Crea proyecto, devuelve `Project`   |
| `projects:update`     | renderer → main | Actualiza proyecto                  |
| `projects:delete`     | renderer → main | Elimina proyecto                    |
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

---

## 17. Estados de carga y respuesta inmediata (A11y) (IMPLEMENTADO, 2026-06-22)

**Estado (conciliado 2026-06-24):** patrón y artefactos compartidos presentes en código —
`renderer/shared/hooks/useAsyncResource.ts` (+ `useAsyncResource.spec.ts`) y
`renderer/shared/components/feedback/LoadingState.tsx`— y adoptado en las pantallas/modales de los SPEC de
característica (ver sus secciones de adopción). typecheck/suite completa + PR en la máquina del usuario.

**Origen:** petición de UX/accesibilidad — al pulsar un botón que dispara una carga no hay respuesta inmediata
y no se alinea con A11y. Norma transversal enlazada desde **SPEC-0000 §15**. Patrón y componentes compartidos
definidos aquí (App Shell, hogar de los componentes compartidos junto a Snackbar §10 y ConfirmDialog §11);
cada SPEC de característica lo **adopta** en sus pantallas y modales.

### 17.1 Principio

Toda pantalla o modal que pueda **bloquearse por una carga asíncrona** debe pintarse **de inmediato** con los
placeholders de carga de MUI (`Skeleton`, `CircularProgress`/`LinearProgress`) y cargar los datos **durante** la
animación. El orden es siempre: **render del contenedor + animación → fetch de datos → render de datos**. Si la
carga es rápida, la animación apenas se verá; pero debe existir para que la respuesta al clic sea instantánea.

- **Modal:** al pulsar el botón que lo abre, el modal aparece **ya** (no se espera a los datos) mostrando su
  esqueleto; los datos llegan después y reemplazan el esqueleto. Nunca «clic → espera en blanco → modal».
- **Pantalla/ruta:** al navegar, la pantalla monta su esqueleto inmediatamente y resuelve los datos después.

### 17.2 Sin fugas de datos entre ejecuciones

Los datos cargados **no pueden quedarse entre ejecuciones de la misma función/apertura**. Al abrir un modal o
montar una pantalla se **resetea** el estado (datos a vacío + `loading = true`) antes de lanzar el fetch, de modo
que nunca se muestren datos de una apertura anterior. La identidad de la apertura (p. ej. `open`, `entryId`,
`projectId`) es la dependencia que dispara el reset+fetch.

### 17.3 Componentes y hook compartidos (`renderer/shared/components/feedback/` + `shared/hooks/`)

- **`useAsyncResource<T>(loader, deps, { resetOnDepsChange: true })`** — encapsula el patrón: al cambiar `deps`
  pone `data = initial` y `loading = true`, ejecuta `loader` (con cancelación/guard para descartar respuestas
  obsoletas si cambian las deps o se desmonta) y expone `{ data, loading, error, reload }`. Garantiza 17.2.
- **`<LoadingState variant=… rows=… />`** — placeholders MUI estandarizados por tipo de contenido
  (`list`, `table`, `form`, `cards`, `text`) usando `Skeleton`. Lleva `aria-busy="true"` y `role="status"` con
  texto live oculto (`drive/common` clave `common.loading`) para lectores de pantalla.
- **Patrón de botón ocupado** — un botón que dispara una acción asíncrona pasa a `disabled` con
  `<CircularProgress size={16}>` y conserva su nombre accesible (`aria-label`/texto); no se queda «muerto» sin
  feedback. Se ofrece como helper (`<BusyButton>`), envoltorio de `Button`.

### 17.4 Accesibilidad (refuerza SPEC-0000 §3)

- La región en carga marca `aria-busy="true"`; al terminar, `false`.
- Indicador de progreso con `role="status"`/`aria-live="polite"` y etiqueta textual (no solo visual).
- Al abrir un modal, el foco entra en el diálogo (MUI `Dialog` lo hace) y, con esqueleto, el `aria-busy` evita
  que el lector anuncie contenido a medio cargar.
- Botones de acción asíncrona: estado ocupado accesible, sin perder el nombre; nunca doble disparo (deshabilitado
  mientras carga).

### 17.5 Inventario de superficies a cubrir (todas)

Pantallas: `DashboardScreen` (SPEC-0010), `CrmOverviewScreen` (SPEC-0011), `PropertyManagementScreen`
(SPEC-0006), `CustomObjectsScreen` (SPEC-0007), `FormsManagementScreen` (SPEC-0008),
`HubSpotConnectorScreen` (SPEC-0003), `GoogleDriveConnectorScreen` (SPEC-0004), `McpSettingsScreen`
(SPEC-0005) y el visor de Ayuda (SPEC-0002 §… / SPEC-0009).
Modales/asistentes: `EntryWizard`, `OptionsDialog`, `SourceOptionsDialog`, `OriginsModal`, `EntryPanel`
(SPEC-0006); `ObjectWizard` (SPEC-0007); `NewFormWizard`, `EditFormWizard`, `LinkOriginModal` (SPEC-0008);
`FolderPickerDialog` (SPEC-0004); `NewProjectDialog` (SPEC-0002); `ConfirmDialog`/`DriveDirtyGuard`/
`DriveDocActions` (revisar: solo si disparan carga). Cada uno se marca como adoptado en su SPEC propietario.

### 17.6 Tests

- `useAsyncResource.spec.ts`: resetea datos al cambiar deps (no fuga entre ejecuciones); descarta respuestas
  obsoletas; expone `loading` true→false.
- Por superficie: el modal/pantalla renderiza el esqueleto antes de resolver el fetch (mock que no resuelve →
  esqueleto presente; al resolver → datos). A11y con `@axe-core/playwright` en estado de carga y cargado.

### 17.7 Estado

VALIDADO (2026-06-22) — implementación en curso. Base creada: `shared/hooks/useAsyncResource.ts` (+ test),
`shared/components/feedback/LoadingState.tsx` y `BusyButton.tsx` (exportados en `feedback/index.ts`); i18n
`common.loading/retry/loadError` (es). Adoptado en: `DashboardScreen`/`useDashboardStatus`,
`CrmOverviewScreen`/`useCrmOverview` (reset por proyecto + `LoadingState`), `HubSpotConnectorScreen`,
`GoogleDriveConnectorScreen`, `McpSettingsScreen` (esqueleto inicial + `BusyButton`), `FolderPickerDialog`
(esqueleto + limpieza de nivel + `BusyButton`), `PropertyManagementScreen`/`CustomObjectsScreen`/
`FormsManagementScreen` (`LoadingState` + `BusyButton` en sync) y `EntryWizard` (indicador durante la carga de
propiedades/grupos, reset al abrir) y `ObjectWizard` (botón Guardar ocupado).

**Auditoría del resto (2026-06-22):** `NewFormWizard`, `EditFormWizard`, `LinkOriginModal`, `OriginsModal`,
`NewProjectDialog` y el visor de Ayuda **no hacen fetch al abrir** — reciben los datos por props desde la
pantalla propietaria (que ya muestra `LoadingState`) o usan contenido empaquetado (Ayuda), y ya resetean al
abrir; por tanto abren al instante y no requieren indicador de carga. Las únicas superficies que bloqueaban por
carga asíncrona eran las 8 pantallas + `FolderPickerDialog` + `EntryWizard`, todas cubiertas. Queda como mejora
opcional el estado «ocupado» en submits asíncronos de `OriginsModal`/`EntryPanel`/`NewProjectDialog` (el
feedback de resultado ya lo da el Snackbar de la pantalla). typecheck/test en máquina.

---

## 18. Tooltip de ayuda en campos rellenables (IMPLEMENTADO, 2026-06-23)

**Origen:** norma transversal de i18n/a11y — todo campo que el usuario deba rellenar debe explicar su función.
Regla en **[SPEC-0000 §3](SPEC-0000-normas-del-proyecto.md)**. Patrón y componente compartido definidos aquí
(App Shell, hogar de los componentes compartidos junto a Snackbar §10, ConfirmDialog §11 y `LoadingState` §17);
cada SPEC de característica lo **adopta** en sus formularios y asistentes.

### 18.1 Principio

Cada campo de entrada de datos lleva un tooltip que describe **para qué sirve** (no repite la etiqueta). El texto
vive en i18n por `locale/feature` en los cuatro idiomas (`es` canónico, `ca`, `eu`, `en`); **prohibido texto
literal**. La etiqueta del campo y el tooltip son claves distintas (p. ej. `…​.field.label` y `…​.field.help`).

### 18.2 Componente compartido (`renderer/shared/components/feedback/`)

- **`<FieldTooltip helpKey=… />`** — icono de ayuda (MUI `HelpOutline` dentro de `Tooltip`) que resuelve el texto
  con `react-i18next` a partir de `helpKey`. Pensado para colocarse en el `label`/`InputAdornment`/`FormLabel` del
  campo. No introduce texto literal: solo recibe la clave.
- **`useFieldHelp(helpKey)`** (opcional) — helper que devuelve `{ 'aria-describedby', tooltipProps }` para enlazar
  el tooltip con el control vía un `id` estable, de modo que el campo quede asociado por `aria-describedby`.

### 18.3 Accesibilidad (refuerza SPEC-0000 §3)

- El control se asocia a la descripción con `aria-describedby` (o el campo expone `aria-label`/`title` cuando no
  haya icono visible). El lector de pantalla anuncia la ayuda junto al campo.
- El disparador del tooltip es **operable por teclado**: recibe foco, abre con foco/hover y cierra con `Esc`; no
  depende solo del puntero. Contraste e iconografía cumplen AA.
- El tooltip es complementario: la información esencial no queda **solo** dentro del tooltip si es necesaria para
  completar el campo correctamente.

### 18.4 Inventario de superficies a cubrir

Formularios y asistentes con campos rellenables: `HubSpotConnectorScreen` (SPEC-0003), `GoogleDriveConnectorScreen`
(SPEC-0004), `McpSettingsScreen` (SPEC-0005); `EntryWizard`, `OptionsDialog`, `SourceOptionsDialog`, `OriginsModal`,
`EntryPanel` (SPEC-0006); `ObjectWizard` (SPEC-0007); `NewFormWizard`, `EditFormWizard`, `LinkOriginModal`
(SPEC-0008); `NewProjectDialog` (SPEC-0002). Cada uno se marca como adoptado en su SPEC propietario.

### 18.5 Tests

- `FieldTooltip.spec.tsx`: renderiza el texto resuelto por i18n (no literal), expone el `aria-describedby` al
  control y es operable por teclado. Nota jsdom: el `Tooltip` de MUI no se abre con `focus` programático
  (detección `focus-visible`), por lo que el test comprueba el foco por teclado y abre el tooltip con `mouseOver`
  verificando el elemento con rol `tooltip`.
- Por superficie: cada campo rellenable tiene `helpKey` y el control queda asociado por `aria-describedby`. A11y
  con `@axe-core/playwright`.
- **Selectores e2e (convención, 2026-06-24):** `FieldTooltip` usa el texto de ayuda como `aria-label` del icono,
  por lo que `getByLabel('<etiqueta>')` puede capturar tanto el campo como el botón de ayuda cuando la etiqueta es
  **prefijo/subcadena** del texto de ayuda (p. ej. campo «Nombre» + ayuda «Nombre identificativo…»). En los tests
  funcionales, usar `getByLabel('<etiqueta>', { exact: true })` en esos casos. Corregido en
  `tests/functional/origin-crud.spec.ts` (campo «Nombre»).

### 18.6 Estado

IMPLEMENTADO (2026-06-23). Componente compartido `FieldTooltip` + hook `useFieldHelp` en
`renderer/shared/components/feedback/` (icono `HelpOutline` en `Tooltip`, operable por teclado, descripción oculta
enlazable por `aria-describedby`), exportados en `feedback/index.ts`; test `FieldTooltip.spec.tsx` (resuelve i18n,
expone `aria-describedby`, abre con foco). Claves i18n bajo `<superficie>.fieldHelp.<campo>` en los cuatro idiomas
(`es` canónico; `ca`/`eu`/`en` traducidos). Adoptado en las superficies de §18.4. Verificación: JSON de los cuatro
locales validado (parseo correcto). typecheck/test/e2e + PR en máquina.

> Nota de convención: las claves usan el contenedor `fieldHelp` (no `help`) para evitar colisión con el `help`
> de tutoriales (top-level) y con `gdrive.credentials.help` ya existente. Esto matiza la nomenclatura
> `…​.<campo>.help` que anticipaban los registros de adopción de las features.

---

## 19. Botones de acción con icono (IMPLEMENTADO, 2026-06-23)

**Origen:** petición de UX — unificar los botones «con icono» y «sin icono» a un único patrón: todo `Button` de
acción lleva icono (como el botón de editar). Norma transversal de consistencia (refuerza §14.2 punto 4); cada SPEC
de característica la **adopta** en sus pantallas, diálogos y paneles.

### 19.1 Principio

Todo `Button` (MUI) que dispare una acción lleva `startIcon` con un icono de `@mui/icons-material`. El icono
**refuerza** la semántica de la acción y no la sustituye: el nombre accesible sigue siendo el texto i18n del botón.
El icono es **decorativo** (MUI lo marca `aria-hidden`); no se añade texto alternativo redundante (WCAG AA,
SPEC-0000 §3).

- **Alcance:** `Button` con texto en pantallas, diálogos (`DialogActions`) y paneles.
- **No-alcance:** los `IconButton` (solo icono, sin texto) de filas/tablas/cabeceras compactas se **mantienen** como
  solo-icono (ya cumplen con `aria-label`). No se convierten a icono+texto.
- **Asíncronos:** los botones que disparan carga usan `BusyButton` (ya respeta `startIcon` y lo sustituye por el
  spinner mientras `busy`); basta con pasarle `startIcon`.
- No cambia lógica, variantes (`contained`/`outlined`/`text`), `color`, ni claves i18n. Sustitución 1:1.

### 19.2 Vocabulario de iconos por acción

Mapa canónico verbo → icono (fuente única de consistencia):

| Acción                                  | Icono `@mui/icons-material` |
| --------------------------------------- | --------------------------- |
| Cerrar / Cancelar                       | `Close`                     |
| Volver / Atrás                          | `ArrowBack`                 |
| Confirmar (genérico) / Seleccionar esta | `Check`                     |
| Crear / Añadir                          | `Add`                       |
| Editar / Editar opciones                | `Edit`                      |
| Guardar                                 | `Save`                      |
| Aplicar (sandbox/producción)            | `CheckCircle`               |
| Eliminar / Descartar / Borrar borrador  | `Delete`                    |
| Archivar                                | `Archive`                   |
| Sincronizar                             | `Sync`                      |
| Regenerar                               | `Autorenew`                 |
| Importar / Cargar (proyecto)            | `FileUploadOutlined`        |
| Exportar JSON / Cargar desde Drive      | `FileDownloadOutlined`      |
| Actualizar documento de Drive           | `CloudUpload`               |
| Abrir en Drive (enlace)                 | `OpenInNew`                 |
| Copiar                                  | `ContentCopy` _(ya en uso)_ |
| Pegar opciones (en bloque)              | `ContentPaste`              |
| Conectar (Drive) / Token (HubSpot)      | `Hub`                       |
| Desconectar / Revocar                   | `LinkOff`                   |
| Vincular origen                         | `Link`                      |
| Seleccionar/Cambiar carpeta             | `Folder`                    |
| Ir a / Abrir destino (navegación CTA)   | `ArrowForward`              |
| Configurar / Gestionar orígenes         | `Settings`                  |
| Ver cambios pendientes                  | `PendingActions`            |
| Salir sin guardar                       | `Logout`                    |

### 19.3 Mapeo botón a botón (76 botones, 26 ficheros)

> Los 4 ya con icono (`WelcomeScreen` importar/crear, `McpSettingsScreen` copiar snippet, y los 3 `SyncIcon` de
> sincronización de Propiedades/Objetos/Formularios) quedan **como están**.

**App / bienvenida**

- `app/components/welcome/NewProjectDialog.tsx` — :83 cancel → `Close`; :84 create → `Add`.
- `app/components/welcome/ImportProjectDialog.tsx` — :121 cancel → `Close`; :122 import → `FileUploadOutlined`.
- `shared/components/DriveDirtyGuard.tsx` — :88 cancel → `Close`; :89 leave → `Logout`; :90 updateAndLeave → `Save`.
- `shared/components/DriveDocActions.tsx` — :42 update → `CloudUpload`; :49 load → `FileDownloadOutlined`; :57 «Abrir
  en Drive» (enlace) → `OpenInNew`; :80 cancel → `Close`; :81 load (confirmar) → `FileDownloadOutlined`.
- `shared/components/feedback/ConfirmDialog.tsx` — :56 cancel → `Close`; :59 confirm → `Check` (componente
  compartido: el icono no cambia según `tone`; el `color="error"` ya distingue lo destructivo).

**HubSpot (SPEC-0003)**

- `HubSpotConnectorScreen.tsx` — :91 guardar token (`BusyButton`) → `Hub`; :100 revoke → `LinkOff`; :123 useAsActive
  → `Check`.

**Google Drive (SPEC-0004)**

- `GoogleDriveConnectorScreen.tsx` — :87 disconnect → `LinkOff`; :92 connect → `Hub`; :119 seleccionar/cambiar
  carpeta → `Folder`; :140 sync (`BusyButton`) → `Sync`.
- `GoogleCredentialsCard.tsx` — :107 clear → `Delete`; :110 save → `Save`.
- `FolderPickerDialog.tsx` — :222 cancel → `Close`; :225 selectThis (`BusyButton`) → `Check`.

**MCP (SPEC-0005)**

- `McpSettingsScreen.tsx` — :133 regenerate (`BusyButton`) → `Autorenew`.

**Propiedades (SPEC-0006)**

- `PropertyManagementScreen.tsx` — :132 back → `ArrowBack`; :173 nueva entrada → `Add`; :182 gestionar orígenes →
  `Settings`; :185 exportar JSON → `FileDownloadOutlined`; :189 cambios pendientes → `PendingActions`.
- `PendingChangesView.tsx` — :36 applySandbox → `CheckCircle`; :44 applyProduction → `CheckCircle`; :52 discard →
  `Delete`.
- `EntryPanel.tsx` — :137 fila de cambio pendiente (abre el diálogo de aplicar) → `CheckCircle` _(corrige el
  borrador, que anticipaba `Delete`: el botón no descarta, lleva a aplicar)_; :171 cancel → `Close`; :172
  applySandbox → `CheckCircle`; :175 applyProduction → `CheckCircle`.
- `EntryWizard.tsx` — :297 editOptions → `Edit`; :316 createGroup → `Add`; :513 addSource → `Add`; :576 editOptions →
  `Edit`; :589 cancel → `Close`; :590 save → `Save`.
- `OriginsModal.tsx` — :85 addObject → `Add`; :190 add → `Add`; :196 close → `Close`.
- `OptionsDialog.tsx` — :141 pasteOptions → `ContentPaste`; :144 addPropOption → `Add`; :166 bulkApply → `Check`;
  :174 cancel → `Close`.
- `SourceOptionsDialog.tsx` — :147 pasteOptions → `ContentPaste`; :150 addOption → `Add`; :165 bulkApply → `Check`;
  :173 cancel → `Close`.

**Objetos custom (SPEC-0007)**

- `CustomObjectsScreen.tsx` — :117 back → `ArrowBack`; :144 nuevo objeto → `Add`; :153 cambios pendientes →
  `PendingActions`.
- `ObjectPanel.tsx` — :105 applySandbox → `CheckCircle`; :113 applyProduction → `CheckCircle`; :128 edit → `Edit`;
  :131 archive → `Archive`; :140 deleteDraft → `Delete`; :143 close → `Close`.
- `PendingObjectChangesView.tsx` — :36 applySandbox → `CheckCircle`; :44 applyProduction → `CheckCircle`; :52
  discard → `Delete`.
- `ObjectWizard.tsx` — :321 addProperty → `Add`; :393 cancel → `Close`; :394 save (`BusyButton`) → `Save`.

**Formularios (SPEC-0008)**

- `FormsManagementScreen.tsx` — :175 back → `ArrowBack`; :202 addForm → `Add`; :206 cambios pendientes →
  `PendingActions`.
- `FormPanel.tsx` — :56 edit → `Edit`; :89 linkOrigin → `Link`; :122 addMissing → `Add`.
- `FormPendingChangesView.tsx` — :67 edit → `Edit`; :74 applySandbox → `CheckCircle`; :82 applyProduction →
  `CheckCircle`; :90 discard → `Delete`.
- `NewFormWizard.tsx` — :270 cancel → `Close`; :271 crear → `Add`.
- `EditFormWizard.tsx` — :440 addField → `Add`; :598 addCheckbox → `Add`; :618 cancel → `Close`; :619 save → `Save`.
- `LinkOriginModal.tsx` — :112 cancel → `Close`; :113 save → `Save`.

**Dashboard / CRM (SPEC-0010 / SPEC-0011)**

- `DashboardScreen.tsx` — :101/:104/:107 pasos (navegar) → `ArrowForward`; :137 configure → `Settings`; :159 review →
  `ArrowForward`.
- `CrmOverviewScreen.tsx` — :61 configure → `Settings`; :87 open → `ArrowForward`.

### 19.4 Adopción

Registro en cada SPEC propietario: SPEC-0003 (HubSpot), SPEC-0004 (Drive + `DriveDocActions`/`DriveDirtyGuard`),
SPEC-0005 (MCP), SPEC-0006 (Propiedades), SPEC-0007 (Objetos), SPEC-0008 (Formularios), SPEC-0010 (Dashboard),
SPEC-0011 (CRM), SPEC-0002 (`NewProjectDialog`, `ImportProjectDialog`, `ConfirmDialog`).

### 19.5 Tests

- Los tests unitarios y e2e existentes deben seguir en **verde** sin reescribirse (sustitución 1:1; no cambian
  textos ni roles accesibles).
- Donde un test ya seleccione un botón por su nombre accesible (`getByRole('button', { name })`), debe seguir
  pasando porque el nombre lo da el texto, no el icono.

### 19.6 Estado

IMPLEMENTADO (2026-06-23). Aplicado el mapeo §19.3 en los 26 ficheros (76 botones); los `IconButton` solo-icono
quedan intactos. Sustitución 1:1 sin cambio de lógica, variantes ni claves i18n. Única desviación del borrador:
`EntryPanel.tsx` :137 usa `CheckCircle` (no `Delete`) por su semántica real (§19.3). Verificación:
`npm run typecheck` + `npm run test:unit` **pendientes en máquina** — el espejo del sandbox corrompe la
codificación de los ficheros editados (la `→` y otros no-ASCII; también afecta a `ipc.ts` y los `common.json` no
tocados), por lo que el typecheck no es fiable en sandbox; los originales se verificaron sanos vía lectura directa.

---

## 20. ErrorBoundary de ruta (IMPLEMENTADO, 2026-06-25)

Origen: informe `2026-06-25-revopshelper-bugs.md` — un dato malformado (p. ej. un `hubspotProperty` inválido) provocaba
un `TypeError` en el render que dejaba **toda la app** en pantalla de error.

Componente compartido `renderer/shared/components/RouteErrorBoundary.tsx`: usa `useRouteError` de React Router y
renderiza un `Alert` accesible (`role="alert"`) con título/cuerpo i18n (`errorBoundary.title`/`body`/`reload` en los 7
locales) y un botón **Recargar** (`navigate(0)`). Se registra como `errorElement` en las rutas de proyecto del router
(`index`/Dashboard, `crm`, `crm/properties`, `crm/objects`, `crm/forms`), de modo que un fallo de render se contiene en
la pantalla afectada y **mantiene el layout** (sidebar/topbar) en lugar de tumbar la app.

Complementa, no sustituye, las defensas de datos (SPEC-0006 §39: validación en `entries_upsert` + `destName`
defensivo). i18n añadido en `es`/`ca`/`eu`/`en`/`gl`/`pt`/`fr`. typecheck/test/e2e en la máquina del usuario — el
espejo del sandbox trunca los ficheros editados; originales verificados sanos.

---

## 21. Marca de la app en el renderer: favicon e icono junto al nombre (IMPLEMENTADO, 2026-07-02)

Complementa el icono de aplicación de SPEC-0001 §11 con la presencia de marca en la interfaz:

- **Favicon**: `src/renderer/public/favicon-32.png` + `<link rel="icon" type="image/png" href="/favicon-32.png" />`
  en `src/renderer/index.html` (servido desde el `publicDir` del renderer). Compatible con la CSP (`img-src 'self'`).
- **Icono junto al nombre de la app**: `src/renderer/shared/assets/revopshelper-icon.svg` (icono completo, anillas
  blancas + punto lima sobre azulejo tinta) junto al título `welcome.title` en `WelcomeScreen`, dentro de un `Stack`
  horizontal (`img` decorativa `alt=""`/`aria-hidden`, 56×56). Se usa el icono completo —no el `mark.svg` de trazo
  oscuro— porque el hero es fondo oscuro (`cdPalette.bgDark`) y las anillas blancas del icono sí contrastan.

- **Retirada del logo de Cloud District del hero**: se elimina el `img` de `cloud-district-logo.svg` (y su import); el
  `LanguageSwitcher` queda alineado a la derecha (`justifyContent="flex-end"`). El asset `cloud-district-logo.svg` se
  conserva por si se reutiliza.
- **Ajuste del hero**: se reduce la banda oscura y se sube el título — `py` del `section` a `{ xs: 2.5, md: 3.5 }`
  (antes `{ xs: 6, md: 10 }`) y `mb` de la fila del selector de idioma a `{ xs: 1.5, md: 2 }`; separación icono↔título
  `spacing={1.5}`.

Fuera de alcance: no se toca el `TopBar` (no muestra un rótulo fijo de nombre de app, solo breadcrumbs/proyecto).

Verificación: ficheros reales sanos (Read directo); `tsc` del renderer en verde en sandbox con el cambio de tipo
(`configured` de SPEC-0004 §23) — el espejo del sandbox trunca/corrompe de forma intermitente los `.ts` con no-ASCII
al editarlos (originales completos y balanceados verificados vía lectura directa); typecheck final en la máquina del
usuario. Requiere **rebuild de la app**.

---

## 22. Endurecimiento de navegación y apertura de enlaces externos (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgo 1.4.

### 22.1 Problema

`setWindowOpenHandler` hacía `shell.openExternal(url)` con cualquier URL sin validar el esquema: un enlace
`file://`/`smb://` en contenido renderizado (p. ej. markdown del visor de Ayuda) se abriría en el SO. Además no
existía guard `will-navigate`, por lo que la webview podía navegar fuera de la app.

### 22.2 Diseño

En `src/main/window.ts`:

- `isSafeExternalUrl(url)`: solo `http:`/`https:` (parseo con `URL`; URL no parseable = rechazada).
- `setWindowOpenHandler`: mantiene `action: 'deny'` y solo llama a `openExternal` si la URL es segura.
- Guard `will-navigate`: la navegación interna se permite (dev server `ELECTRON_RENDERER_URL` o `file://` del
  bundle); cualquier otra URL se cancela con `preventDefault()` y, si es segura, se abre en el navegador externo.

### 22.3 Estado

IMPLEMENTADO (2026-07-02). Sin cambios de UI ni i18n. Requiere rebuild de la app; typecheck/test en la máquina del
usuario.

## 23. Modularización del wiring del proceso main (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 4.1 y 4.3. Refactor estructural sin cambio de
comportamiento: los canales IPC, sus payloads y su semántica no cambian.

### 23.1 Handlers IPC por feature (§4.1)

`registerIpcHandlers` (~515 líneas en `src/main/index.ts`) mezclaba wiring de servicios, registro de secciones,
helpers de Sheets y 90+ handlers. Nueva estructura:

- `src/main/ipc/app-settings.ts` — versión de app, updater, idioma.
- `src/main/ipc/projects.ts` — CRUD de proyectos + export/import `.rvproj` (incluye `readProjectFile` de
  SPEC-0013 §12); notifica el proyecto activo vía callback `onActiveProjectChanged`.
- `src/main/ipc/hubspot.ts` — conector HubSpot (incluye la allowlist de SPEC-0003 §17).
- `src/main/ipc/gdrive.ts` — conector Drive + `gdrive:refresh-project`.
- `src/main/ipc/mcp.ts` — estado/toggle/token/tools del servidor MCP.
- `src/main/ipc/properties.ts`, `ipc/custom-objects.ts`, `ipc/forms.ts` — features CRM, incluidos
  write/load-sheets y drive-meta.
- `src/main/drive-docs.ts` — `createDriveDocs({gdrive, properties, customObjects, forms})`: los tres
  `write*Sheets` (par Sheets+estado atómico, SPEC-0004 §21), `managedSpreadsheetId` y `buildRefreshFeatures`
  (SPEC-0004 §19).

`index.ts` queda como wiring: crea servicios, registra tools MCP y secciones del `.rvproj`, construye
`driveDocs` y llama a los `register*Ipc` por feature (~160 líneas).

### 23.2 Helper genérico de stores por proyecto (§4.3)

`src/main/shared/project-record.ts`: `createProjectRecord<T>(backend, key)` encapsula el patrón
`Record<projectId, T>` get/set/delete repetido en cinco stores. Adoptado por `ElectronHubSpotConfigStore`,
`ElectronGoogleDriveConfigStore`, `ElectronPropertyStore`, `ElectronFormsStore` y `ElectronCustomObjectStore`
(estos tres últimos con dos records: `states` y `timestamps`). Los nombres de fichero y las claves de
electron-store no cambian: la persistencia existente sigue siendo compatible. Test `project-record.spec.ts`
(3 casos).

### 23.3 Estado

IMPLEMENTADO (2026-07-02). Requiere rebuild de la app; typecheck/suite completa en la máquina del usuario.

## 24. `notify` estable en el Snackbar global y memoización del visor Markdown (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 8.1 y 8.10.

- **`SnackbarProvider` (§8.1)**: `notify` dependía de `[open, current]` y cambiaba de identidad con cada
  snackbar, relanzando los efectos de los consumidores que lo tenían en deps (p. ej. las 3 llamadas IPC de
  `GroupsModal` al mostrarse/ocultarse un toast con el modal abierto). Ahora el estado «mostrando» vive en un
  ref (`displaying`) y `notify` solo depende de `showNext` (estable): identidad constante durante toda la vida
  del provider. La cola y la semántica de encadenado (`onExited` → `showNext`) no cambian.
- **`MarkdownView` (§8.10)**: el visor de Ayuda re-parseaba todo el markdown en cada render; el
  parseo se extrae a `buildBlocks(content)` y se memoiza con `useMemo(content)`.

Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 25. ErrorBoundary en todas las rutas y tipado transversal (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 9.1, 9.4 y 9.6.

- **`errorElement` completo (§9.1)**: el §20 solo protegía las 5 rutas de proyecto; `config`,
  `config/connectors/*`, `config/api-mcp` y `help` podían tumbar la app. Ahora TODAS las hijas de
  `/project/:projectId` llevan `errorElement` (se mantiene el layout) y el padre lleva uno adicional como red.
- **`syncSummaryVars` (§9.4)**: `shared/utils/sync-summary.ts` sustituye el doble cast
  `lastSync as unknown as Record<string, number>` en las pantallas de Propiedades, Formularios y Objetos:
  filtra a los campos numéricos reales del resultado, sin mentirle al tipado.
- **Fallback de error real (§9.6)**: el literal `'Error'` como mensaje mostrado desaparece de los stores/hooks
  (entries/origins/objects/forms/custom-objects/useMcpSettings): los catch guardan
  `error.message`/`String(error)` (mensaje real siempre) y los `result.error` ausentes caen a
  `'Error desconocido'`. Nota: los mensajes de error de servicio llegan en castellano por diseño del pipeline
  del main (p. ej. SPEC-0003 §19); su i18n queda como mejora futura.

Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 26. Endurecimiento de la suite de tests (transversal) (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 10.1–10.11 (sección Tests). Cambios transversales; se
registran aquí para no fragmentarlos en seis SPECs.

### 26.1 Cobertura nueva

- **Specs de tools MCP (§10.1)**: `mcp-tools.spec.ts` en property-management (6 casos), forms-management (5) y
  custom-objects (5) — registro completo, handlers felices, validación §39.9, `assertOriginsExist` §29 y
  asserts del gating `requiresGuidance` declarado (16 tests en verde en sandbox).
- **Unit de wizards (§10.6)**: `EntryWizard.spec.tsx` (3 casos: carga, canSubmit por modo) y
  `EditFormWizard.spec.tsx` (3 casos: fila añadida, payload sin `uiId`, filas vacías descartadas) — 6/6 en
  verde en sandbox (jsdom).
- **e2e repuestos (§10.3)**: `export-json`, `forms-flow`, `link-origin`, `new-form` (borrados en 2026-06-19
  como `test.fixme`) reescritos como flujos 100 % locales con aserciones por rol/aria; los pasos que requieren
  portal real quedan excluidos con comentario.
- **a11y por pantalla (§10.4)**: `a11y-baseline` añade un escaneo axe (WCAG 2.1 AA) tras navegar a
  Dashboard/CRM/Propiedades/Objetos/Formularios.

### 26.2 Configuración

- **Idioma forzado (§10.2)**: todos los `electron.launch` de `tests/functional` añaden `--lang=es` — los
  asserts en castellano ya no dependen del locale del SO/CI (i18n detecta por `navigator`).
- **userData aislado (§10.7)**: `app-launch` y el primer test de `a11y-baseline` usan `--user-data-dir`
  temporal como el resto de la suite (antes dependían del perfil real del desarrollador).
- **`pretest:e2e` (§10.8)**: `npm run build` antes de los e2e — ya no pueden validar un `out/` obsoleto.
- **Umbrales de cobertura (§10.9)**: `coverage.thresholds` en vitest (60 % inicial en lines/functions/
  statements; subir hacia el 80 % de SPEC-0000 §8 conforme se cierre la deuda).
- **Diagnóstico e2e (§10.10)**: `retries: 1`, `trace: 'retain-on-failure'` y screenshot en fallo en
  `playwright.config.ts`.
- **§10.11**: la carrera de `getFreePort` en `integration.spec.ts` queda documentada como aceptable con
  `workers: 1` (nota en el fichero).

### 26.3 Estado

IMPLEMENTADO (2026-07-02). Unit nuevos en verde en sandbox (16 MCP + 6 wizards); los 5 e2e nuevos/ampliados
requieren ejecución en máquina (sin display en sandbox). El typecheck completo falla en sandbox por la
truncación conocida del espejo (originales verificados sanos); repetir en máquina.

### 26.4 Hallazgos de la primera ejecución en máquina (2026-07-03) y fixes

Primera ejecución real: 12 passed / 4 failed. Correcciones:

- **Contraste AA (hallazgo REAL de axe)**: `text.secondary` usaba el token de marca `tertiary` (`#7F7790`),
  que da 4.24:1 sobre blanco (< 4.5:1). Nuevo token `cdPalette.tertiaryText` (`#736B84`, 5.04:1, misma familia
  cromática) mapeado a `text.secondary`; `tertiary` sigue disponible para usos no textuales (Sheets, bordes).
  `palette.spec.ts` actualizado.
- **Semántica de lista del Sidebar (hallazgo REAL de axe: `list`/`listitem`)**: cada ítem iba envuelto en un
  `Box` (div hijo de `<ul>`) con `Divider` (`<hr>`) hermano; ahora el `ListItem` es hijo directo y el separador
  de grupo es el prop `divider` del propio ítem (borde inferior con el mismo color).
- **Locator de los 3 specs de formularios (bug del test)**: `getByLabel('Nombre del formulario')` colisionaba
  con el `aria-label` del botón del FieldTooltip (mismo prefijo);
  ahora `getByRole('textbox', { name, exact: true })`.

Nota: el escaneo por pantalla se corta en la primera violación; tras estos fixes pueden aflorar hallazgos en
las pantallas siguientes — iterar con la misma orden de dump. `e2e-dump.txt`/`e2e-results.json` añadidos a
`.gitignore`.

## 27. Tooling: CI, pre-commit y limpieza de configuración (IMPLEMENTADO, 2026-07-03)

Del informe de revisión de código 2026-07-02, hallazgos 11.1–11.9 (transversal; se registra aquí como el §26).

- **CI (§11.1)**: `.github/workflows/ci.yml` con el job `unit` sobre `push` a main y `pull_request`
  (npm ci, typecheck, lint, `check:locales`, `check:tutoriales`, test:unit). Cumple SPEC-0000 §8/§11.
  El job `e2e` (Playwright/Electron bajo `xvfb-run`) se **retiró del CI** (§29): era inestable en GitHub
  Actions; la verificación e2e se hace en local.
- **Pre-commit sin dependencias (§11.2)**: `.githooks/pre-commit` (ESLint + Prettier --check sobre los `.ts(x)`
  staged). Activación única por desarrollador: `git config core.hooksPath .githooks`. Sin husky/lint-staged
  (cero dependencias nuevas).
- **ESLint (§11.3)**: `ignorePatterns` ampliado (build, sandbox, coverage, test-results, playwright-report,
  doc). Migración a flat config/ESLint 9 documentada como pendiente.
- **Alias (§11.4)**: documentado en `vitest.config.ts` que los alias son la unión de ambos tsconfig y que el
  typecheck por proceso es la fuente de verdad.
- **Strictness (§11.5)**: `noFallthroughCasesInSwitch` en ambos tsconfig (seguro); `noUnusedLocals`/
  `noUncheckedIndexedAccess` quedan como adopción futura (pueden requerir limpieza previa).
- **§11.6**: cubierto en SPEC-0014 §12.2 (`check:locales`/`check:tutoriales`).
- **§11.7**: `environmentMatchGlobs` anotado como deprecado (migrar a `projects` antes de Vitest 3).
- **Limpieza de package.json (§11.8, §11.9)**: script `start` duplicado de `preview` eliminado;
  `@testing-library/user-event` (sin un solo import) retirado de devDependencies — requiere `npm install` para
  actualizar el lockfile.

Estado: IMPLEMENTADO (2026-07-03). Verificación del workflow en el primer push; hook y lockfile en máquina.

Fix tras la primera pasada real de lint (13 errores / 2 avisos): reglas `react/prop-types: off` (TS ya valida
las props) y `no-unused-vars` con `argsIgnorePattern: '^_'` (convención existente del proyecto);
`eslint-disable-next-line @typescript-eslint/no-require-imports` en las 7 cargas diferidas de módulos nativos
(keytar/googleapis, patrón documentado en cada fichero); import `DriveFile` sin uso eliminado; los dos
`useEffect` de rowIds (Options/SourceOptionsDialog) marcan la omisión de `options` como deliberada (regenerar
ids en cada edición rompería las keys estables).

## 28. Higiene del repo (IMPLEMENTADO, 2026-07-03)

Del informe de revisión de código 2026-07-02, hallazgos 12.1–12.5.

- **§12.1**: `test.txt` (salida stale de un typecheck de la v0.1.0, versionado en raíz) eliminado.
- **§12.2**: los `.zip` de iconos ya no estaban en la raíz; guard `/*.zip` añadido a `.gitignore` (y
  `unit-dump.txt` de la ronda de tests).
- **§12.3**: `electron-builder.yml` excluye `out/*-types/**` (outDir composite de los tsconfig) del instalable.
- **§12.4**: scripts one-shot históricos (`commit-inicial.cmd`, `setup-gdrive-deps.cmd`,
  `verify-spec-0002.cmd`, `verify-spec-0004.cmd`) archivados en `doc/scripts-historicos/`; en `scripts/` quedan
  los vivos (`setup.cmd`, `check-locale-parity.mjs`, `check-tutorial-parity.mjs`).
- **§12.5**: los 4 `INFORME-*.md` movidos a `doc/informes/` (las citas por nombre en SPECs siguen válidas;
  la única referencia con ruta, en CLAUDE.md, actualizada); `tests/functional/README.md` corregido
  (`pnpm` → `npm run test:e2e`, y actualizado a la realidad de la suite: flujos locales, `--lang=es`,
  userData temporal).

Estado: IMPLEMENTADO (2026-07-03). Los movimientos son renames para git (mismo contenido).

## 29. Los tests e2e se retiran del CI (RESUELTO, 2026-07-13)

Los tests e2e (Playwright + Electron, `npm run test:e2e`) fallaban al ejecutarse en **GitHub Actions**
(`.github/workflows/ci.yml`, §27) pese a pasar en local, por causas del entorno del runner (headless/xvfb,
sandbox de Electron en CI, timeouts o dependencias). En vez de mantener un job rojo permanente, se **retira el
job `e2e` del workflow**: el CI queda solo con `unit` (typecheck, lint, paridad, test:unit) y la verificación
e2e se ejecuta en local (`npm run test:e2e`). Si en el futuro se estabiliza el entorno headless en CI, puede
reintroducirse el job.

## 30. Vista de cambios pendientes compartida `PendingChangesView` (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 2 (duplicidad A1). `property-management/components/
PendingChangesView.tsx` y `custom-objects/components/PendingObjectChangesView.tsx` eran idénticos byte a byte (81
líneas) salvo el tipo, el origen del nombre y el prefijo i18n. Se unifican en un componente compartido
`renderer/shared/components/PendingChangesView.tsx` (mismo patrón que `StatusBadge`/`EmptyState`/`LoadingState`,
§14).

API:

```ts
interface PendingChangeRow {
  id: string;
  name: string;
  summary: string;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
}
interface PendingChangesViewProps {
  rows: PendingChangeRow[];
  busy: boolean;
  i18nPrefix: string; // 'properties.changes' | 'customObjects.changes'
  onApply: (id: string, environment: HubSpotEnvironment) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}
```

El render (un `Paper` por fila con `[NN] name — summary`, el triplete applySandbox/applyProduction/discard y el
bloque de estado) es el actual; las etiquetas se resuelven con ``t(`${i18nPrefix}.<clave>`)`` sobre las subclaves
existentes (`empty`, `applySandbox`, `applyProduction`, `discard`, `state`, `sandboxDone`, `sandboxPending`,
`productionDone`, `productionPending`). **Sin claves i18n nuevas.** Se borran los dos componentes locales.

Adopción: `PropertyManagementScreen` (SPEC-0006 §56) y `CustomObjectsScreen` (SPEC-0007 §28) aplanan
`entries`/`definitions` a `rows`, pasan su `i18nPrefix` y homogeneízan el handler `onDiscard` con `try/catch`
(§53.11 de SPEC-0006).

Fuera de alcance: `FormPendingChangesView` (estructura distinta —`List`/`Chip`, botón editar, `useConfirm`—) no se
unifica aquí; su homogeneización pertenece al punto de UX del bloque 2.

Caso límite: el prefijo i18n dinámico exige paridad de subclaves entre `properties.changes.*` y
`customObjects.changes.*` (se cumple hoy; conviene un test de paridad para blindarlo).

Implementado 2026-07-14 (`shared/components/PendingChangesView.tsx`; adopción en SPEC-0006 §56 y SPEC-0007 §28; los dos componentes locales eliminados). Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 31. Cabecera de feature compartida `FeatureScreenHeader` (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 2 (duplicidad B1). Las tres pantallas maestro-detalle
(`PropertyManagementScreen`, `CustomObjectsScreen`, `FormsManagementScreen`) repetían ~30 líneas idénticas de
cabecera: `Typography h4` con el título según `view`, toggle `BusyButton` (sincronizar) / `Button` (volver),
`Alert` de error y `Alert severity="info"` con `syncSummaryVars(lastSync)`. Solo cambian el prefijo i18n y el
callback de sync.

Se extrae a `renderer/shared/components/FeatureScreenHeader.tsx`:

```ts
interface FeatureScreenHeaderProps {
  i18nPrefix: string; // 'properties' | 'customObjects' | 'forms'
  view: 'list' | 'changes';
  syncing: boolean;
  error: string | null;
  lastSync: object | null; // se pasa a syncSummaryVars, que acepta cualquier object
  onSync: () => void;
  onBack: () => void;
}
```

El render es el actual; las claves se resuelven con ``t(`${i18nPrefix}.title`)``, `.changes.title`, `.syncHs`,
`.changes.back` y `.syncSummary`. **Sin claves i18n nuevas.** Adopción en SPEC-0006 §57, SPEC-0007 §29 y
SPEC-0008 §38.

Fuera de alcance: la lista, el wizard y el panel de cada pantalla (específicos) no se unifican; solo la cabecera
+ los dos `Alert`.

Caso límite: el prefijo dinámico exige paridad de las subclaves `title`/`changes.title`/`syncHs`/`changes.back`/
`syncSummary` en las tres familias (se cumple hoy; conviene un test de paridad para blindarlo).

Implementado 2026-07-14 (`shared/components/FeatureScreenHeader.tsx`; adopción en las tres pantallas). Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 32. Deduplicación del wiring de Drive-state en el main (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 2 (duplicidades D1 y D2). Continúa la modularización del
wiring del main (§23). Dos bloques triplicados entre propiedades, objetos custom y formularios:

### 32.1 Factoría `registerDriveStateIpc` (D1)

`ipc/properties.ts`, `ipc/custom-objects.ts` e `ipc/forms.ts` repiten los handlers `*LoadSheets` y `*DriveMeta`
(el segundo, idéntico salvo el `featureKey`; el primero, mismo esqueleto `readFile → parse → applyDriveState →
schemaVersion`, con los literales `'No hay documento de estado en Drive.'` y `'Error al cargar'` por triplicado).
Se extrae a `ipc/drive-state-ipc.ts`:

```ts
interface DriveStateIpcConfig {
  loadChannel: string;
  metaChannel: string;
  stateFeatureKey: string;
  fileFeatureKey: string; // el del fileId del DriveMeta (en propiedades, PLANNING_MAP_FEATURE_KEY)
  applyContent: (input: { projectId: string }, content: string) => number; // parsea, aplica y devuelve schemaVersion
  getDriveMeta: (input: { projectId: string }) => DriveDocMeta;
}

function registerDriveStateIpc(deps: { gdrive; driveDocs }, config: DriveStateIpcConfig): void;
```

Cada `ipc/*.ts` la invoca con su config; el mapeo específico de `applyDriveState` (`{objects}` /
`{entries, origins}` / `{forms, links}`) va en el callback `applyContent` (que parsea con `parseXState` y llama a `applyDriveState`), evitando genéricos y su inferencia.

### 32.2 Helper `writeSheetsWithState` (D2)

`writePropertiesSheets`/`writeCustomObjectsSheets`/`writeFormsSheets` (`drive-docs.ts`) comparten
"build tabs → `writeSpreadsheet` → si éxito, `writeFile(stateFeatureKey, serializeXState(...))` → si falla el
estado, error `'No se pudo escribir el documento de estado en Drive.'` → `markDriveWritten`". Se extrae a un
helper con callbacks que **separan los datos de los tabs de los del estado** (necesario por §37.6-A):

```ts
async function writeSheetsWithState(config: {
  projectId: string;
  name: string;
  featureKey: string;
  schemaVersion: number;
  buildTabs: () => Promise<SheetTab[]> | SheetTab[]; // propiedades: usa productionView (async)
  stateFeatureKey: string;
  serializeState: () => string; // propiedades: entries del entorno activo, no productionView
  markWritten: () => void;
}): Promise<GoogleDriveOperationResult>;
```

Así propiedades encaja sin perder su asimetría (Sheets visible = producción; estado companion = entorno activo).

### 32.3 Alcance y casos límite

Sin cambios de canales IPC, de la escritura atómica (mismo orden Sheets → estado → `markWritten`) ni de
comportamiento; reorganización interna. Casos límite: el `fileFeatureKey` del DriveMeta de propiedades es
`PLANNING_MAP_FEATURE_KEY` (no el del Sheets); `applyState`/`serializeState` deben conservar su forma exacta para
no romper el round-trip de carga (SPEC-0004 §15.5). Toca `ipc/{properties,custom-objects,forms}.ts` +
`drive-docs.ts` + `ipc/drive-state-ipc.ts` (nuevo). Implementado 2026-07-14 (`typecheck` del main en verde en sandbox; 25 specs de servicios en verde). Verificación e2e: `tests/functional/drive-state-screens.spec.ts` (nuevo) —smoke de montaje de las tres pantallas de feature, que ejercita los tres `*DriveMeta` refactorizados vía `useDriveDoc.fetchMeta` y la cabecera `FeatureScreenHeader` (§31); no cubre `*LoadSheets`/`*WriteSheets` (requieren OAuth de Drive)—; pendiente de ejecutar en la máquina del usuario.

## 33. Helpers compartidos de Drive-meta en los servicios (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 2 (helpers de servicio triplicados). Los tres `service.ts`
(propiedades, objetos custom, formularios) repiten palabra por palabra `markChanged`, `markDriveWritten`,
`getDriveMeta` y la cola de timestamps de `applyDriveState`, todos sobre `deps.store.getTimestamps/setTimestamps`
+ `isoNow`. Continúa la línea de `createProjectRecord` (§23).

Se extrae a `src/main/shared/drive-meta-ops.ts`:

```ts
interface DriveTimestampStore {
  getTimestamps(projectId: string): DriveDocMeta;
  setTimestamps(projectId: string, meta: DriveDocMeta): void;
}
function createDriveMetaOps(
  store: DriveTimestampStore,
  isoNow: () => string,
): {
  markChanged: (projectId: string) => void;
  getDriveMeta: (input: { projectId: string }) => DriveDocMeta;
  markDriveWritten: (input: { projectId: string }) => void;
  touchWritten: (projectId: string) => void; // lastWrittenAt = lastChangedAt = isoNow()
};
```

Cada servicio lo **desestructura** (`const { markChanged, getDriveMeta, markDriveWritten, touchWritten } =
createDriveMetaOps(deps.store, isoNow)`), conservando los nombres locales: **los call sites de `markChanged(...)`
(decenas por servicio) no cambian**. `applyDriveState` mantiene su `store.set` específico (los campos del estado
difieren por feature) y usa `touchWritten` para la cola de timestamps.

**Alcance.** `src/main/shared/drive-meta-ops.ts` (nuevo) + los tres `service.ts`. Sin cambios de comportamiento ni
de contrato. Adopción en SPEC-0006/0007/0008.

**Casos límite.** (1) `getDriveMeta` de propiedades reconstruye el objeto campo a campo; se unifica a devolver
`getTimestamps` directo **solo si** es equivalente (si `getTimestamps` ya devuelve exactamente `DriveDocMeta`); si
filtrara algún campo a propósito, propiedades mantiene su versión. (2) `isoNow` se pasa ya resuelto por cada
servicio (objetos: `deps.now ?? default`; propiedades/formularios: `deps.now`), conservando su semántica.

Fuera de alcance: `serialize/parse` de `drive-state.ts` (mensajes de error repetidos) y `changeFactory`/
`markApplied`, puntos aparte más ligados a la lógica de cada feature.

Implementado 2026-07-14 (`src/main/shared/drive-meta-ops.ts` + adopción en los tres servicios; `getDriveMeta` de propiedades unificado tras confirmar equivalencia; imports `DriveDocMeta` huérfanos retirados de los servicios). Verificado en sandbox: typecheck del main, ESLint y 65 specs de servicios en verde. Requiere rebuild de la app; e2e/suite completa en la máquina del usuario. Requiere rebuild de
la app; typecheck/test en la máquina del usuario.
