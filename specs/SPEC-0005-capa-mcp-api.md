# SPEC-0005 — Capa MCP / API

**Estado:** IMPLEMENTADO  
**Branch:** `feat/spec-0005-capa-mcp-api`  
**Fecha:** 2026-06-09 (implementado 2026-06-10)  
**Depende de:** SPEC-0002

> **Historial de implementación**
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
  name: string;            // ej: 'hubspot_get_contacts'
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown, context: McpContext) => Promise<unknown>;
  featureKey: string;      // qué feature lo registra
  requiredScopes?: string[]; // scopes HubSpot necesarios
}
```

### Tipo `McpContext`
```typescript
interface McpContext {
  projectId: string;       // proyecto activo en la sesión MCP
}
```

### IPC Channels
| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `mcp:get-status` | renderer → main | — | `{ running, port, toolCount }` |
| `mcp:toggle` | renderer → main | `{ enabled }` | `{ success }` |
| `mcp:regenerate-token` | renderer → main | — | `{ token }` |
| `mcp:list-tools` | renderer → main | — | `McpTool[]` |

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

## 13. Adopción del patrón de estados de carga (SPEC-0002 §17) (BORRADOR, 2026-06-22)

`McpSettingsScreen` adopta el patrón de SPEC-0002 §17: pinta de inmediato un `LoadingState` mientras resuelve el
estado del servidor MCP y el token; las acciones (copiar token/config, regenerar, toggle del servidor) pasan a
estado ocupado accesible mientras se ejecutan (sin doble disparo). Estado reseteado al cambiar de proyecto.
Pendiente de implementación junto al resto de superficies.
