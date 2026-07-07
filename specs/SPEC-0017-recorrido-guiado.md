# SPEC-0017 — Recorrido Guiado (Onboarding / Product Tour)

**Estado:** VALIDADO — implementación en espera (ver §0)
**Branch:** feat/spec-0017-recorrido-guiado
**Fecha:** 2026-07-07 (validado 2026-07-07)
**Depende de:** SPEC-0000 (norma transversal §17 propuesta), SPEC-0002 (shell, router, providers, visor de Ayuda). Ancla superficies de SPEC-0003/0004/0005/0006/0007/0008. Complementa SPEC-0009 (tutoriales).

---

## 0. Secuenciación (espera a SPEC-0016)

La implementación de este SPEC **espera a que termine SPEC-0016 (Mapa de Campos Editable)**. Motivo: si SPEC-0016 introduce un cambio sustancial de interfaz (p. ej. un botón/pantalla para generar o abrir el mapa editable), por la norma transversal (§11) debe **añadirse un paso al recorrido maestro** `onboarding`. Al implementar SPEC-0017 se revisa el estado final de SPEC-0016 y, si aplica, se incorpora su ancla `data-tour` y su paso al segmento correspondiente (probablemente C — Propiedades).

---

## 1. Objetivo

Añadir un **recorrido guiado** (product tour / onboarding interactivo) que, la primera vez que se usa la aplicación, muestra al usuario nuevo **todo lo que tiene que hacer para empezar**: crear un proyecto → configurar los conectores → gestionar propiedades → objetos custom → formularios. El recorrido sobreimprime, sobre la interfaz real, un **popup de navegación por pasos** situado cerca del elemento a explicar, lo **resalta** y lo describe en **una o dos frases**.

Requisitos irrenunciables:

1. El usuario puede **desactivar** el recorrido en Configuración y **salir** de él en cualquier momento.
2. El usuario puede **cerrar** el popup y **marcar el recorrido como revisado**.
3. Toda característica nueva —o todo cambio sustancial de interfaz— debe:
   a. **actualizar el recorrido maestro** (los pasos del onboarding), y
   b. **desplegar un recorrido nuevo solo para esa parte** dirigido a quienes **ya vieron** el recorrido anterior (recorrido *delta*).
4. El recorrido es una **norma transversal** del proyecto (se propone añadirla a SPEC-0000, ver §11), no una pieza aislada.

Fuera de alcance: no sustituye a los tutoriales de la sección Ayuda (SPEC-0009) —los complementa—; no ejecuta acciones de negocio por el usuario (es informativo, no automatiza flujos); no toca HubSpot/Drive/MCP en runtime.

---

## 2. Contexto y decisiones de diseño

### 2.1 Implementación propia (sin dependencia nueva) — **decisión validada (2026-07-07)**

Se descartan librerías de terceros como motor del recorrido y se implementa a medida sobre lo ya disponible (**MUI `Popper`/`Paper` + Zustand + router**), por estas razones:

- **Cadena de suministro (SPEC-0000 §11):** evita añadir una dependencia y su árbol transitivo, y el proceso de auditoría/antigüedad asociado.
- **Marca y a11y:** control total del estilo (identidad CD, §4) y de la accesibilidad AA (§3), que las librerías genéricas no garantizan con las restricciones de la marca (p. ej. prohibición del lima sobre fondo oscuro).
- **Lógica propia inevitable:** el **versionado / deltas** (§3.4), la **orquestación entre rutas** y las **anclas estables** (`data-tour`) no las resuelve ninguna librería estándar; habría que construirlas igualmente.
- **Coherencia:** replica el patrón ya usado en el shell (`SnackbarProvider`/`ConfirmProvider` como providers globales sobre MUI).

Alternativa descartada en validación: `driver.js` (vanilla, ligero, spotlight + popover). **Decisión: motor propio.**

### 2.2 Ubicación (feature atómica)

El recorrido vive en `renderer/features/tour/` (SPEC-0000 §6, atómica). No importa de otras features: resuelve sus objetivos por **atributos `data-tour` en el DOM** y navega con la **instancia del router**, no por el árbol React de cada pantalla.

### 2.3 Estado global por instalación (no por proyecto)

El estado del recorrido (activado/desactivado y qué recorridos se han revisado) es una preferencia **de la instalación/usuario**, no del proyecto —igual que el idioma (SPEC-0002)—. Se persiste en `main/settings.ts` (electron-store `settings`), junto a `language`.

### 2.4 Modelo de recorridos y versionado

- Un **recorrido** (`TourDefinition`) es una lista ordenada de **pasos** identificada por un `id` estable y con una `version` entera.
- Existe **un recorrido maestro** `onboarding` que cubre el camino completo del usuario nuevo.
- Existen **recorridos delta** `delta-<feature>-<slug>` (uno por cambio sustancial), dirigidos a usuarios que **ya completaron** el onboarding.
- La persistencia guarda `seen[tourId] = version` (la versión más alta que el usuario marcó como revisada).

Reglas de auto-lanzamiento (evaluadas al montar el shell / al entrar en la ruta correspondiente, solo si `enabled`):

| Recorrido | Se auto-lanza cuando |
|-----------|----------------------|
| `onboarding` (maestro) | `seen['onboarding']` es `undefined` (usuario que **nunca** lo vio). El *bump* de versión del maestro **no** re-dispara a usuarios que ya lo vieron; sirve para nuevos usuarios y para el historial. |
| `delta-*` | `enabled` && `seen[deltaId]` es `undefined` && `seen['onboarding']` **no** es `undefined` (usuario que **sí** onboardeó). Los usuarios nuevos no necesitan el delta porque el maestro ya lo cubre. |

Esto satisface literalmente el requisito: al aparecer una característica nueva, quien ya vio el recorrido recibe **solo** el delta de esa parte, y el maestro queda **actualizado** para los futuros usuarios nuevos.

### 2.5 Recorrido informativo y resiliente

El recorrido **señala y explica**; **no obliga** a completar acciones. Reglas del motor:

- Cada paso declara la `route` donde vive su objetivo; el motor **navega** a ella (vía `router.navigate`) antes de mostrar el paso y **espera** a que el ancla `data-tour` exista (observador/polling con *timeout*).
- Pasos con objetivo potencialmente ausente (p. ej. dentro de un diálogo cerrado) se marcan `optional: true` y se **omiten** si el ancla no aparece antes del *timeout*, sin romper la secuencia.
- **Paso con puerta (gate):** la creación del proyecto exige una acción real del usuario. Ese paso se marca `awaitSignal: 'project-created'`; el motor no avanza con «Siguiente» sino que espera la señal emitida por el código de la feature al crear el proyecto, y **reanuda** ya dentro de `/project/:id`. Es el único gate previsto; el resto avanza con «Siguiente».
- Progreso reanudable: se guarda un puntero de reanudación efímero para continuar un onboarding interrumpido (§4.2).

---

## 3. Interfaz de usuario

### 3.1 Anatomía de la superposición

```
┌──────────────────────────────────────────── backdrop (#090017 ~55% α) ┐
│                                                                        │
│        ╭───────────────────────────╮                                   │
│        │ ⟡ elemento resaltado       │  ← recorte "spotlight" con        │
│        │   (data-tour="...")        │     anillo indicador lima          │
│        ╰───────────────────────────╯                                   │
│              ▲                                                          │
│        ┌─────┴───────────────────────────────┐                         │
│        │ [ Paso 3 de 9 ]            (×)       │  ← badge lima / cerrar   │
│        │ Título del paso (opcional)           │                         │
│        │ Explicación de una o dos frases.     │                         │
│        │                                      │                         │
│        │ [‹ Atrás]        [Saltar] [Siguiente ›]│                       │
│        └──────────────────────────────────────┘  ← MUI Popper           │
└────────────────────────────────────────────────────────────────────────┘
```

- **Backdrop**: capa a pantalla completa, fondo CD `#090017` a ~55 % de opacidad, con **recorte** alrededor del objetivo (técnica de `box-shadow` masivo sobre un `div` posicionado en el rect del objetivo, o máscara SVG). El clic en el backdrop **no** cierra por accidente (evita salidas involuntarias); para salir se usa la «×» o `Esc`.
- **Resaltado**: el recorte lleva un **anillo indicador lima** (`#AFFC41`) —uso permitido como indicador, no como color de elemento (SPEC-0000 §4)— y esquinas redondeadas; opcionalmente un pulso sutil (respeta `prefers-reduced-motion`).
- **Popup de paso** (`Popper` + `Paper`): situado junto al objetivo con **auto-flip** de posición según el espacio; contiene indicador «Paso X de N» (badge lima con texto `#14072B`), título opcional, cuerpo (1–2 frases), y controles.

### 3.2 Controles del popup

| Control | Comportamiento | Icono (SPEC-0002 §19) |
|---------|----------------|-----------------------|
| Siguiente | Avanza; en el último paso pasa a «Finalizar» | `ArrowForward` / `CheckCircle` |
| Atrás | Retrocede (oculto en el primer paso) | `ArrowBack` |
| Saltar | Sale del recorrido sin marcarlo como revisado (se puede re-ofrecer) | `SkipNext` |
| Cerrar (×) | Igual que «Saltar»: sale y **no** marca revisado | `Close` (`IconButton`, `aria-label`) |
| Finalizar | Solo en el último paso: sale y **marca revisado** (`seen[tourId] = version`) | `CheckCircle` |
| No volver a mostrar | Marca revisado sin recorrer el resto (disponible desde cualquier paso) | `DoNotDisturbOn` |

### 3.3 Contenido del recorrido maestro `onboarding`

El maestro **desarrolla** el camino completo del usuario nuevo, incluidas las acciones clave de las características ya existentes (propiedades, objetos custom, formularios) — decisión de validación §12.3. Se organiza en **segmentos** por contexto/ruta; cada paso declara su ancla `data-tour`, su ruta y una explicación de 1–2 frases (los textos definitivos viven en i18n; aquí, el guion). Todos los anclajes apuntan a controles del **toolbar/menú siempre presentes**, no a estados internos de diálogos; los objetivos que dependen de datos se marcan `optional`.

**Segmento A — Bienvenida (`/`)**
1. **Idioma** — `welcome-language`. «Elige tu idioma aquí; puedes cambiarlo cuando quieras.»
2. **Crear proyecto** — `welcome-new-project`. «Empieza creando un proyecto para tu portal de HubSpot.» *(gate `project-created`)*

**Segmento B — Proyecto y configuración (`/project/:id`, `config`)**
3. **Dashboard** — `dashboard-root`. «Este panel resume el estado del proyecto y lo pendiente.»
4. **Menú lateral** — `sidebar-nav`. «Desde aquí navegas entre las áreas del proyecto.»
5. **Configuración** — `sidebar-config` → `config`. «Primero configura los conectores.»
6. **HubSpot** — `connector-hubspot`. «Conecta tu portal con un token de HubSpot.»
7. **Google Drive** — `connector-gdrive`. «Conecta Drive para versionar los documentos del proyecto.»
8. **API / MCP** — `connector-mcp`. «Activa el servidor MCP si quieres operar desde un cliente de IA.»

**Segmento C — Propiedades (`crm/properties`)**
9. **Entrar en Propiedades** — `sidebar-properties` → `crm/properties`. «Aquí mapeas y gestionas las propiedades de tus objetos.»
10. **Sincronizar** — `properties-sync`. «Sincroniza para traer el estado real de HubSpot.»
11. **Orígenes** — `properties-origins`. «Define tus orígenes de datos antes de mapear.»
12. **Nueva propiedad** — `properties-add`. «Crea una entrada: nombre, propiedad destino y mapeo de orígenes.»
13. **Cambios pendientes** — `properties-pending`. «Revisa y aplica a HubSpot los cambios pendientes.»

**Segmento D — Objetos custom (`crm/objects`)**
14. **Entrar en Objetos** — `sidebar-objects` → `crm/objects`. «Aquí creas y gestionas objetos personalizados.»
15. **Sincronizar** — `objects-sync`. «Sincroniza para ver los objetos del portal.»
16. **Nuevo objeto** — `objects-add`. «Crea un objeto custom con sus propiedades.»
17. **Cambios pendientes** — `objects-pending`. «Revisa y aplica los objetos en borrador.»

**Segmento E — Formularios (`crm/forms`)**
18. **Entrar en Formularios** — `sidebar-forms` → `crm/forms`. «Aquí importas, creas y asocias formularios a tus orígenes.»
19. **Sincronizar** — `forms-sync`. «Sincroniza para traer los formularios del portal.»
20. **Nuevo formulario** — `forms-add`. «Crea un formulario solo-campos o importa uno existente.»
21. **Cobertura** — `forms-coverage`. «Filtra por cobertura para ver qué formularios cubren tus orígenes.»
22. **Cambios pendientes** — `forms-pending`. «Revisa y aplica los cambios de formularios.»

**Segmento F — Cierre**
23. **Ayuda** — `sidebar-help` → `help`. «Aquí tienes los tutoriales detallados; puedes reactivar este recorrido en Configuración.»

Nota: los segmentos C–E requieren HubSpot conectado para tener datos, pero sus botones de toolbar (sincronizar, nueva propiedad/objeto/formulario, cambios pendientes, filtro de cobertura) están presentes al montar la pantalla, así que el anclaje es estable; solo los objetivos dependientes de datos concretos serían `optional`.

### 3.4 Recorridos delta

Las características **ya existentes** se desarrollan en el maestro (§3.3), no como deltas retro (decisión §12.3). Los recorridos `delta-<feature>-<slug>` quedan para **cambios futuros**: cada cambio sustancial registra un delta con **solo** los pasos nuevos/cambiados (plantilla en §4.3), y además actualiza el maestro. Se auto-lanzan según §2.4 a usuarios que ya onboardearon.

### 3.5 Desactivar / reactivar (Configuración)

En `ConfigSection` (ruta `config`) se añade un bloque **«Recorrido guiado»**:

- **Switch** «Mostrar el recorrido guiado» (activa/desactiva el auto-lanzamiento de todos los recorridos).
- Botón **«Volver a ver el recorrido»** (reinicia `seen` y lanza el maestro).

El mismo par (reactivar) se expone también en la cabecera del visor de **Ayuda** para descubribilidad. Ambos campos llevan tooltip i18n (SPEC-0000 §3, patrón `FieldTooltip`).

### 3.6 Accesibilidad (SPEC-0000 §3, WCAG 2.1 AA)

- Popup con `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby` apuntando al título/cuerpo del paso.
- **Trampa de foco** dentro del popup mientras el recorrido corre; al salir, el foco vuelve al elemento previo.
- Teclado: `Esc` = salir; `→`/`Enter` = siguiente; `←` = atrás; `Tab` cicla por los controles.
- Cambio de paso anunciado por **live region** (`role="status"`, `aria-live="polite"`), incluyendo «Paso X de N».
- Estado por **texto + color** (nunca solo color). Contraste AA en el popup (fondo claro CD, texto `#14072B`).
- `prefers-reduced-motion`: sin pulso ni transiciones de desplazamiento.

---

## 4. Modelo de datos / contratos

### 4.1 Tipos (renderer, `features/tour/types.ts`)

```ts
export interface TourStep {
  id: string;                 // estable dentro del recorrido
  tourAnchor: string;         // valor de data-tour del objetivo
  route: string;              // ruta relativa al proyecto o '/' para welcome
  titleKey?: string;          // i18n opcional
  bodyKey: string;            // i18n, 1–2 frases
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  optional?: boolean;         // se omite si el ancla no aparece antes del timeout
  awaitSignal?: string;       // gate: espera señal en vez de "Siguiente"
}

export interface TourContext {
  route: string;
  hasOnboarded: boolean;      // seen['onboarding'] !== undefined
}

export interface TourDefinition {
  id: string;                 // 'onboarding' | 'delta-<feature>-<slug>'
  version: number;            // entero; se incrementa al cambiar los pasos
  autoStart: (ctx: TourContext) => boolean;
  steps: TourStep[];
}
```

### 4.2 Persistencia (main, `settings.ts`)

Se amplía `SettingsSchema`:

```ts
interface TourSettings {
  enabled: boolean;                    // default true
  seen: Record<string, number>;        // tourId -> versión revisada
}
// SettingsSchema += { tour: TourSettings }  // default { enabled: true, seen: {} }
```

El **puntero de reanudación** (recorrido activo + índice de paso) es **efímero** (estado del `tour-store` en memoria); no se persiste entre reinicios para no bloquear al usuario en un paso obsoleto tras una actualización.

### 4.3 Registro de recorridos (`features/tour/registry/`)

- `onboarding.ts` — define el maestro (§3.3).
- `deltas/<feature>-<slug>.ts` — un fichero por delta. Plantilla:

```ts
export const deltaFormsConsent: TourDefinition = {
  id: 'delta-forms-consent',
  version: 1,
  autoStart: (ctx) => ctx.hasOnboarded,
  steps: [/* pasos nuevos de la característica */],
};
```

- `index.ts` — agrega todos los recorridos en `TOURS: TourDefinition[]`.

### 4.4 IPC (nuevo)

Canales en `shared/types/ipc.ts` (`IpcChannels`) + métodos en `RevOpsApi` + preload + `main/ipc/app-settings.ts`:

| Canal | Firma | Uso |
|-------|-------|-----|
| `settings:get-tour` | `getTourSettings(): Promise<TourSettings>` | leer estado |
| `settings:set-tour-enabled` | `setTourEnabled(enabled: boolean): Promise<void>` | switch de Configuración |
| `settings:mark-tour-seen` | `markTourSeen(tourId: string, version: number): Promise<void>` | Finalizar / No volver a mostrar |
| `settings:reset-tours` | `resetTours(): Promise<void>` | «Volver a ver el recorrido» |

### 4.5 Store (`features/tour/tour-store.ts`, Zustand)

`{ activeTour: TourDefinition | null; stepIndex: number; running: boolean; start(id); next(); prev(); goTo(i); exit(); finish(); signal(name) }`. `finish()`/«No volver a mostrar» invocan `markTourSeen`; `exit()`/«Saltar»/«×» no marcan.

---

## 5. Implementación — tareas atómicas

1. **main:** ampliar `SettingsSchema` en `settings.ts` con `tour` (+ getters/setters `getTourSettings`/`setTourEnabled`/`markTourSeen`/`resetTours`); registrar los 4 canales en `ipc/app-settings.ts`.
2. **shared:** añadir los 4 canales a `IpcChannels` y los 4 métodos a `RevOpsApi` (`shared/types/ipc.ts`) + puente en `preload/index.ts`.
3. **feature `renderer/features/tour/`:** `types.ts`, `tour-store.ts`, `registry/` (onboarding + index + carpeta `deltas/`), `hooks/useTourSettings.ts` (IPC), `hooks/useTourAutoStart.ts` (evalúa `autoStart` según ruta/estado), componentes `TourProvider.tsx`, `TourSpotlight.tsx`, `TourPopper.tsx`, `TourStepCard.tsx`, `index.ts`, `README.md`.
4. **shell:** montar `<TourProvider router={router} />` en `App.tsx` (fuera de `RouterProvider`, usando la instancia del router para navegar y `document` para resolver anclas).
5. **anclas `data-tour`:** añadir los atributos de §3.3 (cambios mínimos, sin lógica):
   - `WelcomeScreen`: `welcome-language`, `welcome-new-project`.
   - `Sidebar`: `sidebar-nav`, `sidebar-config`, `sidebar-properties`, `sidebar-objects`, `sidebar-forms`, `sidebar-help`.
   - `DashboardScreen`/`ConfigSection`: `dashboard-root`, `connector-hubspot`, `connector-gdrive`, `connector-mcp`.
   - `PropertyManagementScreen`: `properties-sync`, `properties-origins`, `properties-add`, `properties-pending`.
   - `CustomObjectsScreen`: `objects-sync`, `objects-add`, `objects-pending`.
   - `FormsManagementScreen`: `forms-sync`, `forms-add`, `forms-coverage`, `forms-pending`.
6. **gate:** emitir `signal('project-created')` desde el flujo de creación de proyecto (`WelcomeRoute`/`use-projects`) cuando el recorrido está activo.
7. **Configuración:** bloque «Recorrido guiado» en `ConfigSection` (switch + reiniciar) con `FieldTooltip`; enlace de reactivación en la cabecera de Ayuda.
8. **i18n:** claves `tour.*` (controles + pasos del maestro) y `config.tour.*` en los **7** locales (es canónico; SPEC-0000 §3 y SPEC-0014).
9. **docs:** tutorial `doc/tutoriales/recorrido/es/usar-el-recorrido.md` (+ traducciones por SPEC-0009).
10. **Commit(s):** `feat(tour): recorrido guiado con versionado y deltas` (dar los comandos, no ejecutarlos).

> Nota (preferencia del proyecto): al implementar, cada iteración de código actualiza **este** SPEC; no se crea un SPEC de corrección.

---

## 6. Tests requeridos

- **Unit `tour-store.spec.ts`:** transiciones next/prev/goTo/exit/finish; `finish`/«no volver a mostrar» invocan `markTourSeen`; `exit` no.
- **Unit `useTourAutoStart.spec.ts`:** usuario nuevo → `onboarding`; usuario con onboarding visto + delta nuevo → `delta-*`; `enabled=false` → ninguno; ya visto (versión ≥) → ninguno.
- **Unit `TourPopper.spec.tsx`:** anclaje al objetivo; paso `optional` con ancla ausente se omite; `role="dialog"`, `aria-modal`, foco atrapado, `Esc` sale.
- **a11y (axe):** popup sin violaciones; estado por texto+color; live region del cambio de paso.
- **Funcional `tour.spec.ts`:** instalación limpia → el maestro aparece en `/` → crear proyecto reanuda dentro del proyecto → salir a mitad → desactivar en Configuración → no reaparece; «Volver a ver el recorrido» lo relanza.
- Cumplir SPEC-0000 §8 (comportamiento real, sin mockear la lógica bajo test).

---

## 7. Scopes / permisos

Ninguno. El recorrido no llama a HubSpot, Google ni MCP; solo lee/escribe `settings` local y consulta el DOM.

---

## 8. Consideraciones de seguridad

- Sin secretos ni red. Solo persiste `tour` en electron-store `settings`.
- La superposición es DOM local; no captura ni transmite contenido de pantalla. Resalta controles, no muestra tokens.
- No expone información nueva al renderer más allá de las preferencias del propio recorrido.

---

## 9. Documentación de usuario

- `doc/tutoriales/recorrido/es/usar-el-recorrido.md` (canónico): qué es el recorrido, cómo navegarlo, cómo salir, cómo **desactivarlo** y cómo **volver a verlo**. Traducciones `ca`/`eu`/`en`/`gl`/`pt`/`fr` por SPEC-0009.
- Se lista en la sección Ayuda automáticamente (SPEC-0002 §, visor de tutoriales).

---

## 10. Criterios de aceptación

- [ ] En una instalación limpia con `enabled=true`, el recorrido maestro se auto-lanza en la pantalla de bienvenida y **desarrolla** bienvenida → proyecto → configuración → propiedades (sincronizar/orígenes/nueva/pendientes) → objetos (sincronizar/nuevo/pendientes) → formularios (sincronizar/nuevo/cobertura/pendientes) → Ayuda.
- [ ] El popup se sitúa junto al objetivo, lo resalta y muestra 1–2 frases + navegación por pasos (Atrás/Siguiente/Saltar/Finalizar).
- [ ] El usuario puede **salir** en cualquier momento (× / `Esc` / Saltar) sin marcarlo revisado, y **marcarlo revisado** (Finalizar / No volver a mostrar).
- [ ] El **switch de Configuración** desactiva el auto-lanzamiento; «Volver a ver el recorrido» lo relanza.
- [ ] Un recorrido **delta** se auto-lanza solo a quien ya vio el onboarding, y el maestro queda actualizado para nuevos usuarios.
- [ ] El estado (`enabled`, `seen`) persiste entre sesiones; no se re-lanza lo ya revisado.
- [ ] Cumple WCAG 2.1 AA (dialog/foco/teclado/live region, texto+color) y marca CD (lima solo como indicador).
- [ ] i18n en los 7 idiomas; sin texto hardcodeado.
- [ ] `npm run typecheck` y `npm run test:unit` en verde; funcional `tour.spec.ts` en verde.
- [ ] Aprobada la enmienda a SPEC-0000 (§11) y añadido SPEC-0017 a la tabla de CLAUDE.md.
- [ ] Revisado SPEC-0016 al implementar (§0): si añadió UI sustancial, su paso está en el maestro.

---

## 11. Enmienda propuesta a SPEC-0000 (norma transversal)

> **Requiere validación.** No se edita SPEC-0000 ni CLAUDE.md hasta aprobar este SPEC.

Añadir a SPEC-0000 una norma transversal **«Recorrido guiado»** (análoga a las de estados de carga §3 y tooltips §3):

- Toda característica nueva o todo **cambio sustancial de interfaz** debe: (1) añadir/ajustar las **anclas `data-tour`** de sus controles principales; (2) **actualizar los pasos del recorrido maestro** `onboarding` (e incrementar su `version`); (3) **registrar un recorrido delta** `delta-<feature>-<slug>` con los pasos nuevos, dirigido a usuarios que ya onboardearon; (4) aportar las **claves i18n** de esos pasos en los 7 locales; (5) registrar la adopción en su §.
- Criterio de «cambio sustancial»: nueva pantalla, nueva acción primaria, reubicación de un control primario, o nuevo paso obligatorio en un flujo central. Queda a juicio del autor del SPEC, documentado en su §.
- El motor, los componentes compartidos y el registro se definen en **SPEC-0017**; cada SPEC de característica solo aporta anclas, pasos (maestro + delta) e i18n.

---

## 12. Decisiones resueltas (2026-07-07)

1. **Motor:** propio (MUI Popper + Zustand + router). `driver.js` descartado (§2.1).
2. **Interruptor de desactivación:** en `ConfigSection` (bloque «Recorrido guiado») + reactivación en la cabecera de Ayuda (§3.5). No se crea pantalla de «Preferencias» separada.
3. **Características existentes:** se **desarrollan dentro del maestro** `onboarding` (§3.3, segmentos C–E con las acciones clave de propiedades/objetos/formularios), no como deltas retro. Los recorridos `delta-*` quedan reservados para cambios futuros.
