# src/main/mcp

Capa de API y **servidor MCP saliente** que expone las capacidades de la app a clientes externos (Claude Desktop, Cursor, etc.). Implementación en **SPEC-0005**.

## Ubicación

Aunque SPEC-0005 §5 propuso `src/mcp/`, el módulo vive en `src/main/mcp/` para alinearse con la estructura real del proyecto: el servidor corre en el **proceso main de Electron** (SPEC-0005 §2) y, como los conectores (`src/main/connectors/`), queda cubierto por `tsconfig.main.json` y el alias `@main`. Desviación documentada en SPEC-0005 §5.

## Estructura

```
src/main/mcp/
├── types.ts            # McpTool, McpContext, JsonSchema, DTOs (re-export de @shared/types/mcp)
├── registry.ts         # McpRegistry (singleton mcpRegistry): register/getAll/get, sin duplicados
├── auth.ts             # Token local: generación, validación en tiempo constante, almacenamiento inyectable
├── transport/
│   ├── stdio.ts        # connectStdio(server) — StdioServerTransport del SDK
│   └── http-sse.ts     # Express en 127.0.0.1 + SSEServerTransport, auth por x-api-key / Bearer
├── server.ts           # createMcpService: start/stop/toggle/status/listTools/regenerateToken
└── index.ts            # createElectronMcpService: electron-store + registro de tools de núcleo
```

## Registro de tools (uso por features)

Cada feature registra sus tools en el arranque:

```typescript
import { mcpRegistry } from '@main/mcp';

mcpRegistry.register({
  name: 'hubspot_get_contacts',
  description: 'Obtiene contactos de HubSpot con filtros opcionales',
  inputSchema: { type: 'object', properties: { /* ... */ } },
  featureKey: 'hubspot-contacts',
  requiredScopes: ['crm.objects.contacts.read'],
  handler: async (input, ctx) => {
    // ctx.projectId = proyecto activo en la sesión MCP
    return { /* ... */ };
  },
});
```

Este SPEC no registra ninguna tool de negocio. Solo añade `mcp_health` (featureKey `mcp-core`), una tool de diagnóstico que devuelve el proyecto activo y un timestamp.

## Seguridad

- El servidor HTTP/SSE escucha **solo en `127.0.0.1`**.
- Autenticación por token local generado en el arranque y almacenado en electron-store; renovable desde la UI (invalida el anterior).
- Las tools acceden únicamente al proyecto activo (`McpContext.projectId`).
- El log de info registra qué tool se llamó, nunca los datos de respuesta.

## Configuración del cliente

`Config > API / MCP` muestra el snippet listo para copiar:

```json
{
  "mcpServers": {
    "revops": {
      "url": "http://127.0.0.1:3741/sse",
      "headers": { "x-api-key": "<token>" }
    }
  }
}
```
