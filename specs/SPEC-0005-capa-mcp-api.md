# SPEC-0005 — Capa MCP / API

**Estado:** VALIDADO — criterios de aceptación pendientes hasta implementación  
**Branch:** `feat/spec-0005-capa-mcp-api`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0002

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
│  │       "url": "http://127.0.0.1:3741/sse",      │    │
│  │       "headers": { "x-api-key": "..." }        │    │
│  │     }                                          │    │
│  │   }                                            │    │
│  │ }                                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

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

```
src/
└── mcp/
    ├── README.md
    ├── server.ts          # Inicialización McpServer (stdio + HTTP/SSE)
    ├── registry.ts        # Registro central de tools
    ├── auth.ts            # Middleware de autenticación por token
    ├── transport/
    │   ├── stdio.ts       # Transport stdio
    │   └── http-sse.ts    # Transport HTTP/SSE
    └── types.ts           # McpTool, McpContext, etc.
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

---

## 8. Consideraciones de Seguridad

- Solo `127.0.0.1` — nunca expuesto en red local ni pública.
- Token renovable desde la UI; el token anterior se invalida inmediatamente.
- Las tools MCP tienen acceso al proyecto activo, no a todos los proyectos.
- El servidor registra en log (nivel info) qué tool fue llamada, sin registrar los datos de respuesta.

---

## 9. Criterios de Aceptación

- [ ] El servidor MCP arranca y se puede habilitar/deshabilitar desde la UI
- [ ] Un cliente MCP externo (ej: Claude Desktop) puede conectarse y listar las tools
- [ ] Llamar a una tool con token incorrecto devuelve error 401
- [ ] El puerto por defecto (3741) es configurable
- [ ] La UI muestra el snippet de configuración listo para copiar
- [ ] Todos los tests del SPEC en verde
- [ ] PR creada, revisada y mergeada en `main`
