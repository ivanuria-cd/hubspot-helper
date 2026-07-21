# SPEC-0005 — Capa MCP / API

**Estado:** IMPLEMENTADO  
**Branch:** `feat/spec-0005-capa-mcp-api`  
**Fecha:** 2026-06-09 (implementado 2026-06-10)  
**Depende de:** SPEC-0002

> **Historial de implementación**
>
> - 2026-06-10 — Implementación inicial. SDK `@modelcontextprotocol/sdk@1.29.0` y `express@5.2.1` (ambas versiones con >10 días de antigüedad, sin vulnerabilidades nuevas en `npm audit`, conforme a SPEC-0000 §11). Núcleo (types/registry/auth), transportes stdio + HTTP/SSE, servicio `createMcpService`, IPC, UI `settings-mcp` e i18n (es/ca/eu/en). Tool de núcleo `mcp_health`. 17 tests en verde.

---

## 1. Objetivo

Implementar la capa de API y servidor MCP saliente que expone las capacidades de la app a cualquier LLM o cliente externo. Cada característica de la app registrará sus propias herramientas (tools) en este servidor. El SPEC de cada característica definirá sus tools MCP específicos.

---

## 2. Contexto y Decisiones de Diseño

### Protocolo

- **Model Context Protocol (MCP)** — protocolo estándar para exponer herramientas a LLMs.
- Versión: MCP spec 2024-11-05 (la más reciente al momento de redacción).
- Transporte primario: **stdio** (para integración directa con clientes MCP como Claude Desktop, Cursor, etc.)
- Transporte secundario: **HTTP/SSE** (para integraciones remotas o multi-cliente).

### Arquitectura

- El servidor MCP corre en el **proceso main de Electron** (no en un proceso separado), exponiendo un puerto HTTP local configurable.
- Cada feature registra sus tools en un **registry central** en tiempo de arranque.
- Las tools tienen acceso a los conectores (HubSpot, Google Drive) vía los mismos mecanismos internos que el renderer.

### Seguridad del servidor local

- El servidor HTTP/SSE escucha en `127.0.0.1` únicamente (no en `0.0.0.0`).
- Autenticación por token local generado en el arranque (almacenado en electron-store, renovable).
- El usuario puede habilitar/deshabilitar el servidor MCP en la configuración.

### SDK

- **`@modelcontextprotocol/sdk`** (TypeScript) — SDK oficial de MCP para Node.js.
- Proporciona `McpServer`, tipos de tools, y el servidor HTTP/SSE transport.

---

## 3. Interfaz de Usuario — Configuración MCP

Pantalla en `Config > API / MCP`:

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  Configuración / API y MCP                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│                                                         │
│  Servidor MCP                      ●  Activo  [ON/OFF]  │
│  Puerto: 3741            [Copiar configuración MCP]     │
│                                                         │
│  Token de acceso                                        │
│  ┌──────────────────────────┐  [Regenerar]             │
│  │ ••••••••••••••••••••     │                          │
│  └──────────────────────────┘                          │
│                                                         │
│  Tools disponibles (8)           [Ver documentación]   │
│  — hubspot_get_contacts                                 │
│  — hubspot_search_deals                                 │
│  — ...                                                  │
│                                                         │
│  Configuración para Claude Desktop:                     │
│  ┌────────────────────────────────────────────────┐    │
│  │ {                                              │    │
│  │   "mcpServers": {                              │    │
│  │     "revops": {                                │    │
│  │       "command": "npx",                        │    │
│  │       "args": ["-y","mcp-remote",              │    │
│  │         "http://127.0.0.1:3741/sse",           │    │
│  │         "--header","x-api-key:${REVOPS_TOKEN}"]│    │
│  │       "env": { "REVOPS_TOKEN": "..." }         │    │
│  │     }                                          │    │
│  │   }                                            │    │
│  │ }                                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

> **Corrección de diseño (2026-06-10):** el snippet original usaba el formato `url` + `headers`. Claude Desktop **no admite ese formato** en `claude_desktop_config.json`: su esquema solo valida servidores **stdio** (`command` + `args`); una entrada con `url` se rechaza como configuración inválida (y en algunas versiones borra el bloque `mcpServers` o casca al arrancar). Los servidores remotos/SSE se añaden por **Settings > Connectors** o se puentean a stdio con **`mcp-remote`**. Por eso la pantalla genera el bloque `command`/`args` con `npx -y mcp-remote <url> --header x-api-key:${REVOPS_TOKEN}` y el token en `env` (el indirecto `${...}` evita el bug de `mcp-remote` al partir cabeceras). El servidor sigue siendo SSE en `127.0.0.1`; `mcp-remote` actúa de puente local.

---

## 4. Modelo de Datos / Contratos

### Tipo `McpTool` (registro interno)

```typescript
interface McpTool {
  name: string; // ej: 'hubspot_get_contacts'
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown, context: McpContext) => Promise<unknown>;
  featureKey: string; // qué feature lo registra
  requiredScopes?: string[]; // scopes HubSpot necesarios
}
```

### Tipo `McpContext`

```typescript
interface McpContext {
  projectId: string; // proyecto activo en la sesión MCP
}
```

### IPC Channels

| Canal                  | Dirección       | Input         | Output                         |
| ---------------------- | --------------- | ------------- | ------------------------------ |
| `mcp:get-status`       | renderer → main | —             | `{ running, port, toolCount }` |
| `mcp:toggle`           | renderer → main | `{ enabled }` | `{ success }`                  |
| `mcp:regenerate-token` | renderer → main | —             | `{ token }`                    |
| `mcp:list-tools`       | renderer → main | —             | `McpTool[]`                    |

### API de registro para features (uso interno)

```typescript
// Cada feature llama esto en su inicialización:
mcpRegistry.register({
  name: 'hubspot_get_contacts',
  description: 'Obtiene contactos de HubSpot con filtros opcionales',
  inputSchema: { ... },
  handler: async (input, ctx) => { ... },
  featureKey: 'hubspot-contacts',
  requiredScopes: ['crm.objects.contacts.read'],
});
```

---

## 5. Estructura de Archivos

> **Desviación de implementación (2026-06-10):** el módulo se ubicó en `src/main/mcp/` en vez de `src/mcp/`. El servidor corre en el proceso main (§2) y, como los conectores (`src/main/connectors/`), debe quedar cubierto por `tsconfig.main.json` y el alias `@main`. Los DTOs compartidos con el renderer viven en `src/renderer/shared/types/mcp.ts`. Se añadió `index.ts` (factory de Electron + registro de la tool de núcleo).

```
src/main/mcp/
├── README.md
├── types.ts            # McpTool, McpContext, JsonSchema, DTOs
├── registry.ts         # Registro central de tools (singleton mcpRegistry)
├── auth.ts             # Token local: generación y validación (almacenamiento inyectable)
├── transport/
│   ├── stdio.ts        # connectStdio(server) — StdioServerTransport
│   └── http-sse.ts     # Express + SSEServerTransport en 127.0.0.1
├── server.ts           # createMcpService: start/stop/toggle/status/listTools/regenerateToken
└── index.ts            # createElectronMcpService (electron-store) + tool de núcleo mcp_health

src/renderer/shared/types/mcp.ts          # DTOs compartidos (McpStatus, McpToolSummary, ...)
src/renderer/features/settings-mcp/        # UI de configuración MCP
```

---

## 6. Implementación — Tareas Atómicas

1. **Instalar dependencias** — `@modelcontextprotocol/sdk`, `express` (para HTTP/SSE transport)
2. **`mcp/types.ts`** — tipos McpTool, McpContext, McpConfig
3. **`mcp/registry.ts`** — registro singleton con métodos `register()` y `getAll()`
4. **`mcp/auth.ts`** — generación y validación del token local; almacenamiento en electron-store
5. **`mcp/transport/stdio.ts`** — StdioServerTransport del SDK MCP
6. **`mcp/transport/http-sse.ts`** — SSEServerTransport con Express, escuchando en 127.0.0.1
7. **`mcp/server.ts`** — orquestación: inicializa McpServer, registra transportes, expone `start()`/`stop()`
8. **Arranque en main process** — llamar `mcpServer.start()` al lanzar la app si está habilitado
9. **IPC handlers** `mcp:*` en main process
10. **`renderer/features/settings-mcp/`** — UI de configuración MCP con copiado de config
11. **Ruta en sidebar** — Config > API / MCP
12. **Commit** — `feat(mcp): servidor MCP base con registry de tools y transporte HTTP/SSE`

---

## 7. Tests Requeridos

### Unitarios

- `registry.spec.ts` — registrar tools, listar, prevenir duplicados de nombre
- `auth.spec.ts` — generación de token, validación correcta, rechazo de token inválido
- `server.spec.ts` — arranque y parada del servidor, manejo de puerto ocupado

### Funcionales

- `mcp-connection.spec.ts` — un cliente MCP de test se conecta al servidor SSE y lista las tools disponibles
- `mcp-tool-call.spec.ts` — llamar a una tool de test registrada devuelve el resultado esperado (fixture mock)

> **Nota de implementación (2026-06-10):** dado que el servidor corre **en proceso** y no requiere arrancar la UI de Electron, ambos casos funcionales se implementaron como **tests de integración con Vitest** en `src/main/mcp/integration.spec.ts`, usando el `Client` + `SSEClientTransport` reales del SDK MCP contra el servidor HTTP/SSE levantado en `127.0.0.1`. Cubren: conexión y listado de tools, llamada a tool con resultado esperado, y rechazo de conexión con token incorrecto (401). Esto verifica los criterios de aceptación de forma más directa que un E2E de Playwright sobre la UI.

---

## 8. Consideraciones de Seguridad

- Solo `127.0.0.1` — nunca expuesto en red local ni pública.
- Token renovable desde la UI; el token anterior se invalida inmediatamente.
- Las tools MCP tienen acceso al proyecto activo, no a todos los proyectos.
- El servidor registra en log (nivel info) qué tool fue llamada, sin registrar los datos de respuesta.

---

## 9. Documentación de Usuario

- `doc/tutoriales/mcp/conectar-cliente-mcp.md` — conectar un cliente MCP (Claude Desktop) a la app: activar el servidor, copiar la configuración, token de acceso y FAQ.

Se muestra automáticamente en la sección **Ayuda** (clave i18n `help.features.mcp`).

## 10. Criterios de Aceptación

- [x] El servidor MCP arranca y se puede habilitar/deshabilitar desde la UI
- [x] Un cliente MCP externo (ej: Claude Desktop) puede conectarse y listar las tools — verificado en `integration.spec.ts`
- [x] Llamar a una tool con token incorrecto devuelve error 401 — verificado en `integration.spec.ts`
- [x] El puerto por defecto (3741) es configurable (`McpConfigStore.getPort/setPort`, persistido en electron-store)
- [x] La UI muestra el snippet de configuración listo para copiar
- [x] Todos los tests del SPEC en verde (17 tests: registry, auth, server, integración)
- [ ] PR creada, revisada y mergeada en `main`

## 11. CRUD incompleto del MCP — hallazgo transversal de pruebas (BORRADOR, 2026-06-18)

Hallazgo transversal de la batería de pruebas del MCP `revops` sobre el proyecto «Testing» (informe completo
en `INFORME-pruebas-mcp-2026-06-18.md`). No afecta al registry/auth/servidor de este SPEC, pero documenta un
patrón a corregir en las tools de negocio que registra cada SPEC de característica.

La superficie de tools del MCP carece de operaciones de **borrado/deshacer simétricas**. Hoy solo permiten
deshacer: `entries_delete`, `properties_discard_change` y `custom_objects_discard_change`. **No** existe forma
de eliminar/descartar vía MCP: orígenes (`origins_*` solo `list`/`upsert`), drafts de objetos custom,
cambios pendientes de formularios (no hay `forms_discard_change`), vínculos `forms_link_origin`, ni grupos de
propiedades (`groups_*` solo `list`/`create`). Esto deja **residuo de pruebas/uso no limpiable
programáticamente**, y en el caso de grupos es además una escritura real en HubSpot.

Detalle y correcciones por dominio: **SPEC-0006 §22** (orígenes y grupos), **SPEC-0007 §16** (drafts de
objetos custom), **SPEC-0008 §16** (`forms_discard_change` y vínculos). Recomendación: definir un criterio
común de simetría CRUD para toda tool MCP de escritura (toda operación de creación debe tener su
contrapartida de borrado/descarte).

### 11.1 Implementación (2026-06-18)

Añadidas las contrapartidas de borrado/descarte que faltaban, todas delegando en lógica de servicio ya
usada por la UI (sin cambiar el comportamiento de la app): `forms_discard_change` (SPEC-0008 §16.4),
`origins_delete` (SPEC-0006 §22.4) y `custom_objects_delete_draft` (SPEC-0007 §16.4). Además se expone
`custom_objects_sync` para completar el ciclo de creación de objetos custom vía MCP. **Pendiente:** borrado de
grupos de propiedades (escritura destructiva en HubSpot, no expuesta hoy en la UI; diferido). Verificación
`typecheck`/`test:unit` pendiente de ejecutar en máquina.

---

## 12. Confirmación y feedback de la pantalla MCP (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgos #1 y #2. En `McpSettingsScreen.tsx`: "Copiado" desaparece a los 2 s (feedback efímero) y **regenerar el token** (L116) se ejecuta a un clic, invalidando toda sesión activa, sin confirmación.

Adopción de SPEC-0002 §11 (ConfirmDialog):

- Antes de regenerar el token: `await confirm({ tone:'danger', title: t('mcp.regenerateTitle'), body: t('mcp.regenerateBody') })`.

Adopción de SPEC-0002 §10 (Snackbar):

- "Token copiado", "Config copiada", "Token regenerado" → `notify({ severity:'success' })`, sustituyendo el texto inline de 2 s.
- Error de toggle del servidor → `notify({ severity:'error' })` (puede mantenerse el `Alert` persistente).

Claves i18n nuevas: `mcp.regenerateTitle`, `mcp.regenerateBody`, `mcp.tokenCopied`, `mcp.configCopied`, `mcp.tokenRegenerated` (cuatro locales).

## 13. Adopción del patrón de estados de carga (SPEC-0002 §17) (IMPLEMENTADO, 2026-06-22)

`McpSettingsScreen` adopta el patrón de SPEC-0002 §17: pinta de inmediato un `LoadingState` mientras resuelve el
estado del servidor MCP y el token; las acciones (copiar token/config, regenerar, toggle del servidor) pasan a
estado ocupado accesible mientras se ejecutan (sin doble disparo). Estado reseteado al cambiar de proyecto.
Pendiente de implementación junto al resto de superficies.

---

## 14. Adopción de tooltips i18n en campos rellenables (SPEC-0002 §18) (IMPLEMENTADO, 2026-06-23)

`McpSettingsScreen` adopta el patrón de **[SPEC-0002 §18](SPEC-0002-app-shell.md)** (norma en
**[SPEC-0000 §3](SPEC-0000-normas-del-proyecto.md)**): el token local de autenticación MCP lleva un `FieldTooltip`
(`mcp.fieldHelp.token`) que explica para qué sirve y la advertencia de regenerarlo si se filtra, en
`es`/`ca`/`eu`/`en`. El token es de solo lectura (generado); el resto de controles de la pantalla son acciones, no
campos rellenables. typecheck/test en máquina.

---

## 15. Guía de operación obligatoria del MCP — gate por acuse (BORRADOR, 2026-06-25)

### 15.1 Motivación

Las tools del MCP exponen el estado en bruto (p. ej. `properties_sync` devuelve `{ updated, divergent, missing }`).
Un consumidor LLM puede malinterpretar casuísticas como «entrada en modo `existing` que apunta a una propiedad
inexistente»: la entrada aparece como `missing`/`falta` pero **no genera cambio pendiente** (SPEC-0006 §35), por lo
que el LLM puede concluir erróneamente que «no hay nada que hacer» en vez de avisar que falta crear la propiedad.

Se introduce un mecanismo transversal de la **capa MCP** (este SPEC) para forzar que el consumidor lea una guía de
operación antes de ejecutar operaciones de riesgo. El **contenido** de la guía lo aportan los SPECs de característica
(igual que los tutoriales, SPEC-0000 §10); aquí se define solo la **infraestructura**: tool de guía, registro de
secciones y gate por acuse.

### 15.2 Alcance

Dentro de alcance (SPEC-0005): tool `revops_guidance`, registro de secciones de guía por feature, flag de tool
`requiresGuidance`, estado de acuse por sesión y bloqueo de las tools marcadas hasta que se haya leído la guía en la
sesión.

Fuera de alcance: el **texto** de cada sección de guía (lo aporta cada SPEC de característica vía el registro; la
primera contribución es SPEC-0006 §35.6) y la lógica de negocio de cada tool.

### 15.3 Tool `revops_guidance`

- `name`: `revops_guidance`. `featureKey`: `mcp`. `requiredScopes`: ninguno (lectura local, no toca HubSpot).
- `inputSchema`: `{ type:'object', properties:{ section:{ type:'string' } } }` — `section` opcional para pedir una
  sección concreta por `featureKey`; sin argumento devuelve la guía completa.
- `handler`: ensambla el documento a partir del registro de secciones (15.4), ordenado por `order` y luego
  `featureKey`, y **registra el acuse** de la sesión (15.5). Devuelve `{ content: <markdown>, sections: string[],
acknowledged: true }`.
- `description`: debe instruir explícitamente: «LÉEME PRIMERO. Devuelve las reglas de operación del MCP `revops`.
  Las tools de escritura están bloqueadas hasta llamar a esta tool en la sesión.»

### 15.4 Registro de secciones de guía

Análogo al registry de tools. Estructura nueva en `src/main/mcp/`:

```ts
export interface GuidanceSection {
  featureKey: string; // dominio que la aporta
  title: string; // título de la sección
  order: number; // orden en el documento ensamblado
  body: string; // markdown; texto literal en castellano (es la guía del LLM, no UI i18n)
}

export interface GuidanceRegistry {
  register(section: GuidanceSection): void; // duplicado por featureKey → error
  getAll(): GuidanceSection[];
  assemble(filter?: { featureKey?: string }): string;
}
```

- Singleton `guidanceRegistry` exportado, paralelo a `mcpRegistry`.
- Cada SPEC de característica registra su sección en el arranque (junto al `register*Tools`). La primera es
  SPEC-0006 §35.6 (propiedades: distinción `existing`/`new`, casuística del `falta` no sincronizable y remedio
  «Convertir a Nueva»).
- El cuerpo es texto literal en castellano: es documentación para el LLM, **no** cadena de UI, por lo que **no** pasa
  por i18n (excepción explícita a SPEC-0000 §3, que aplica a interfaz gráfica).

### 15.5 Gate por acuse (estricto)

- Nuevo campo opcional en `McpTool` (types.ts): `requiresGuidance?: boolean` (por defecto `false`).
- Estado de acuse: `guidanceAck` indexado por **identificador de sesión MCP** (no por proceso). Estructura
  `Set<sessionId>` (o `Map<sessionId, true>`) en memoria del servicio; cada sesión debe leer la guía por su cuenta.
  - **Origen del `sessionId`**: el SDK MCP entrega el contexto de la petición (`RequestHandlerExtra`) en los
    handlers; de ahí se obtiene el `sessionId` de la sesión activa. El transporte HTTP/SSE ya gestiona una sesión por
    conexión (cada cliente LLM = una sesión distinta → acuse independiente); el transporte stdio expone una única
    sesión (su `sessionId` propio). `revops_guidance` marca el acuse de **su** `sessionId`; el gate lo comprueba con
    el `sessionId` de la petición entrante.
  - Al cerrarse una sesión (desconexión) se purga su entrada de `guidanceAck`; reabrir exige leer la guía de nuevo.
  - El acuse **se reinicia** al reiniciar el servidor MCP.
  - Implica propagar el `sessionId` al `McpContext` (o pasar el `extra` del handler) para que el gate y
    `revops_guidance` operen sobre la sesión correcta — ajuste a documentar en 15.6.
- En `server.ts`, en el handler de `CallToolRequestSchema`, antes de despachar: si `tool.requiresGuidance === true`
  y la sesión **no** tiene acuse, **no** se ejecuta el handler y se devuelve una respuesta estructurada:

  ```json
  {
    "blocked": true,
    "reason": "guidance-required",
    "message": "Operación bloqueada. Llama a revops_guidance para leer las reglas de operación antes de continuar.",
    "next": "revops_guidance"
  }
  ```

- `revops_guidance` y todas las tools de **solo lectura** (`*_list`, `*_get`, `*_pending_changes`,
  `*_coverage`, `properties_export_origin`, `mcp_health`) **no** llevan `requiresGuidance` → el LLM puede explorar
  e inspeccionar sin acuse, pero no mutar ni sincronizar sin haber leído la guía.
- Tools que **sí** llevan `requiresGuidance: true` (escritura/riesgo, cross-feature): `properties_sync`,
  `properties_apply_change`, `properties_request_delete`, `properties_groups_apply_change`,
  `properties_groups_request_delete`, `entries_upsert`, `entries_delete`, `origins_upsert`, `origins_delete`,
  `groups_create`, las nuevas `properties_convert_to_new` / `properties_convert_missing_to_new` (SPEC-0006 §35.5),
  y las equivalentes de escritura de SPEC-0007 (`custom_objects_*`) y SPEC-0008 (`forms_*`). El listado definitivo
  por tool lo fija cada SPEC de característica marcando el flag al registrar.
  - `properties_sync` se incluye intencionadamente: es la operación que destapa la casuística del `falta`; al
    bloquearla tras el acuse se garantiza que el LLM lea primero cómo interpretar el resultado.

### 15.6 Contratos / tipos

- `McpTool.requiresGuidance?: boolean` (types.ts).
- `GuidanceSection` y `GuidanceRegistry` (15.4), nuevo fichero `src/main/mcp/guidance.ts` + `guidance.spec.ts`.
- Acuse por sesión: `guidanceAck: Set<string>` (clave `sessionId`) en el servicio MCP, con API interna
  `markGuidanceRead(sessionId)`, `hasGuidance(sessionId)` y purga en el cierre de sesión. El `sessionId` se obtiene
  del `RequestHandlerExtra` del handler (`server.ts`); se propaga a `revops_guidance` (para marcar) y al gate (para
  comprobar). Si fuera necesario, `McpContext` se amplía con `sessionId?: string`.
- La respuesta de bloqueo (15.5) es un objeto JSON serializado por el mismo camino que el resto de resultados
  (`server.ts` envuelve en `content:[{type:'text', text:JSON.stringify(...)}]`).

### 15.7 UI

Sin pantalla nueva. Opcional (no bloqueante): en `McpSettingsScreen`, una nota de solo lectura indicando que el MCP
expone `revops_guidance` y que los clientes deben leerla. Si se añade, su texto va por i18n (`mcp.*`) en los 7
locales. Decisión de inclusión, diferida a implementación.

### 15.8 Tests

- `guidance.spec.ts`: registro (duplicado por featureKey → error), `assemble` ordena por `order`+`featureKey`,
  filtro por `featureKey`.
- `server.spec.ts` (ampliación): una tool con `requiresGuidance` devuelve la respuesta de bloqueo sin ejecutar el
  handler cuando no hay acuse; tras llamar a `revops_guidance` la misma tool ejecuta su handler; una tool de solo
  lectura nunca se bloquea; **el acuse de la sesión A no desbloquea la sesión B** (aislamiento por `sessionId`); la
  purga al cerrar sesión reactiva el bloqueo.
- `registry.spec.ts` (ampliación): `revops_guidance` registrada y sin scopes.

### 15.9 Impacto / ficheros

- `src/main/mcp/types.ts` (campo `requiresGuidance`).
- `src/main/mcp/guidance.ts` + `guidance.spec.ts` (nuevos).
- `src/main/mcp/server.ts` (gate en `CallToolRequest`, estado de acuse) + `server.spec.ts`.
- `src/main/mcp/index.ts` (registro de `revops_guidance` y wiring del `guidanceRegistry`).
- Cada `*/mcp-tools.ts` de característica: marcar `requiresGuidance` en sus tools de escritura y registrar su
  sección de guía (la primera, SPEC-0006).
- **Requiere rebuild del MCP** para que los clientes vean la tool nueva y el gate.

### 15.10 Estado

IMPLEMENTADO (2026-06-25). `types.ts` (`requiresGuidance`, `McpContext.sessionId`, `GuidanceBlocked`);
`guidance.ts` + `guidance.spec.ts` (registry, 4 casos); `server.ts` (`callTool` con gate por `sessionId`,
`guidanceAck: Set`, `purgeSession`, `onclose`, `GUIDANCE_TOOL`); `server.spec.ts` (4 casos de gate: bloqueo/acuse,
solo-lectura, aislamiento A↔B, purga); `mcp/index.ts` (registro de `revops_guidance` + export `guidanceRegistry`).
Las tools de escritura de cada feature marcan `requiresGuidance` (propiedades en SPEC-0006 §35). **Requiere rebuild
del MCP.** `guidance.spec.ts` (fichero nuevo) en verde en sandbox; el resto de la suite/typecheck en la máquina del
usuario — el espejo del sandbox no sincroniza los ficheros editados (trunca), originales verificados sanos.

### 15.11 Transparencia del gate (IMPLEMENTADO, 2026-06-30)

Del informe de remapeo de erratas (punto 4): el gate parecía «reactivarse cada pocas escrituras sin indicar el umbral».
Diagnóstico: **no existe umbral por número de escrituras**. El acuse es por sesión MCP (`guidanceAck: Set<sessionId>`)
y solo se rearma al cerrarse la sesión (`onclose`/`purgeSession`) o al reiniciar el servidor; lo percibido como «cada
pocas escrituras» es el churn de sesiones (cada reconexión = sesión nueva = acuse nuevo).

Fix (diagnóstico, sin cambiar la lógica del gate): el `message` de la respuesta `guidance-required` (`server.ts`,
`blocked()`) explicita la semántica real — acuse por sesión, sin umbral de escrituras, rearme al reconectar/reiniciar.
`server.spec.ts` solo afirma `blocked === true`, así que el cambio de texto no rompe tests. Requiere rebuild del MCP.

### 15.12 Acuse por proyecto, no por sesión (CORREGIDO, 2026-07-08 — SPEC-0006 §54.4)

Corrección de §15.5/§15.6: el acuse pasa de indexarse por **`sessionId`** a indexarse por **`projectId`**, en memoria
del proceso. Motivo (SPEC-0006 §54.4, informe LNN): el churn de sesiones MCP (cada reconexión = sesión nueva)
rearmaba el bloqueo a mitad de un flujo largo, interrumpiéndolo sin causa real. Con el acuse por proyecto:

- `guidanceAck: Set<projectId>`; el `projectId` se obtiene de `contextProvider()` en `callTool`. El gate comprueba
  `guidanceAck.has(projectId)` y `revops_guidance` marca `guidanceAck.add(projectId)`.
- Sobrevive a reconexiones de la sesión MCP: `purgeSession` deja de resetear el acuse (queda como no-op, conservado
  en la interfaz por compatibilidad; `onclose` ya no rearma el gate).
- Se rearma solo al **reiniciar el proceso** (Set nuevo) o al **cambiar de proyecto activo** (otro `projectId` sin
  acuse). Así un arranque nuevo de la app sigue forzando releer las reglas, pero una reconexión dentro de la misma
  sesión de trabajo no interrumpe.
- El `message` de `guidance-required` se reescribe para indicar que el acuse es por proyecto y que, si aparece a
  mitad de un flujo, la causa es un reinicio de la app o un cambio de proyecto.
- Tests (`server.spec.ts`): el caso «A no desbloquea B» se sustituye por «el acuse desbloquea todas las sesiones del
  mismo proyecto» + «un proyecto distinto sigue bloqueado»; «purgar reactiva el bloqueo» pasa a «cerrar la sesión NO
  reactiva el bloqueo». Cambio de tests acordado (SPEC-0000 §8) por corregir comportamiento previo.

IMPLEMENTADO (2026-07-08). Requiere rebuild del MCP. `typecheck`/`test:unit` en la máquina del usuario.

## 16. Endurecimiento de seguridad de la capa MCP (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 1.1 y 1.5.

### 16.1 Captura de rechazos en el transporte HTTP/SSE

Los handlers async de Express 4 (`GET /sse`, `POST /messages` en `transport/http-sse.ts`) no capturaban
rechazos: si `server.connect(transport)` o `handlePostMessage` lanzaban, el unhandled rejection podía tumbar el
proceso main de Electron completo. Ambos handlers se envuelven en try/catch: registran vía `deps.log` y
responden `500 { error: 'Internal server error' }` si las cabeceras no se han enviado (en SSE ya abierto,
`res.end()`).

### 16.2 Token MCP cifrado con `safeStorage`

El token se persistía en claro en `mcp.json` (electron-store), mientras PAT y tokens de Google van al llavero.
`keytar` es async y la interfaz `TokenStorage` es síncrona, así que se usa `safeStorage` de Electron (síncrono):

- Clave nueva `tokenEncrypted` (ciphertext base64); `setToken` cifra si `isEncryptionAvailable()` y limpia la
  clave `token` en claro; si no hay cifrado disponible en el SO, fallback al comportamiento anterior.
- `getToken` descifra `tokenEncrypted`; si el ciphertext es ilegible (cambio de usuario/llavero) lo descarta y
  el token se regenerará. Migración transparente: un token en claro preexistente se recifra en la primera lectura.

### 16.3 Estado

IMPLEMENTADO (2026-07-02). Sin cambios de API ni de UI; `auth.ts` intacto. Requiere rebuild del MCP/app;
typecheck/test en la máquina del usuario.

## 17. Cierre limpio del servidor MCP al salir (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgo 2.7. `before-quit` hacía `void mcpService.stop()` sin
esperar: el cierre del servidor HTTP podía no completarse antes de salir. Ahora `before-quit` hace
`event.preventDefault()`, espera `mcpService.stop()` con un tope de 3 s (`Promise.race`) y relanza `app.quit()`
(guard `mcpStopped` para no reentrar). Sin cambios de API. Requiere rebuild de la app; typecheck/test en la
máquina del usuario.

## 18. Validación runtime del inputSchema, criterio del gate y `requiredScopes` (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 3.1, 3.2 y 3.3.

### 18.1 Validación runtime del input (§3.2)

Los `inputSchema` declarados no se validaban: los handlers casteaban con `as` a ciegas (`environment` a
`HubSpotEnvironment` sin comprobar el enum, ítems de lotes sin validar forma). Módulo nuevo
`mcp/validate-input.ts` (`validateToolInput(schema, input)`): subconjunto pragmático de JSON Schema — `required`,
`type` y `enum` de las propiedades de primer nivel, más `items.type` primitivo en arrays. `callTool` (`server.ts`)
lo ejecuta tras el gate de guía y antes del handler; si falla devuelve
`{ error: { code: 'invalid-input', tool, issues: [{ field, message }] } }` sin ejecutar el handler. Los handlers
conservan su validación profunda propia (p. ej. `entries_upsert`, SPEC-0006 §39.9).

### 18.2 Criterio homogéneo del gate de guía (§3.1)

El §15 bloquea «tools de escritura/sync», pero formularios y objetos custom no marcaban ninguna tool y en
propiedades los discard quedaban fuera. Criterio explícito: **toda tool que mute estado (HubSpot o local,
incluidos descartes) o sincronice lleva `requiresGuidance`; las de solo lectura, no.** Adopción registrada en
SPEC-0006 §48, SPEC-0007 §20 y SPEC-0008 §29.

### 18.3 `requiredScopes` es informativo (§3.3)

`requiredScopes` nunca se comprueba contra los scopes reales del PAT (H6 de SPEC-0006 §26, que sigue diferido).
Se documenta como INFORMATIVO en `mcp/types.ts` para que nadie asuma un enforcement inexistente; se muestra en
los summaries de la UI.

### 18.4 Tests

- `validate-input.spec.ts` (nuevo): 6 casos (válido, requeridos, enum, tipos + items de array, input no-objeto,
  esquema sin type).
- `server.spec.ts`: 2 casos nuevos — input inválido devuelve `invalid-input` con issues sin ejecutar el handler;
  input válido ejecuta.

### 18.5 Estado

IMPLEMENTADO (2026-07-02). Requiere rebuild del MCP; typecheck/test en la máquina del usuario.

## 19. `useMcpSettings` sin literal de error hardcodeado (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 1 (i18n). `useMcpSettings.toggle` fijaba
`setError(result.error ?? 'Error desconocido')` (`useMcpSettings.ts:51`) — literal en castellano, prohibido por
SPEC-0000 §3. El `error` se pinta crudo en un `Alert` de `McpSettingsScreen` (`:102`), donde `null` significa
«sin error»; por eso NO se puede usar el patrón `?? null` (perdería el aviso ante un fallo sin mensaje).
Corrección: el hook usa `useTranslation('common')` y fija `result.error ?? t('common.loadError')` (clave ya
presente en los 7 locales); `t` entra en las dependencias del `useCallback` de `toggle`. Solo
`useMcpSettings.ts`; sin i18n nueva. Implementado 2026-07-14. Requiere rebuild de la app;
typecheck/test en la máquina del usuario.
