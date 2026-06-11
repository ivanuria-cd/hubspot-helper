# CLAUDE.md

Antes de cualquier acción, leer obligatoriamente:

1. `specs/SPEC-0000-normas-del-proyecto.md` — normas del proyecto: stack, convenciones de código, flujo Git, reglas de testing y formato de SPECs.

## SPECs del proyecto

Todos los SPECs están en `specs/`. Estado actual:

| SPEC | Título | Estado |
|------|--------|--------|
| [SPEC-0000](specs/SPEC-0000-normas-del-proyecto.md) | Normas del Proyecto | VALIDADO |
| [SPEC-0001](specs/SPEC-0001-fundacion-del-proyecto.md) | Fundación del Proyecto | IMPLEMENTADO |
| [SPEC-0002](specs/SPEC-0002-app-shell.md) | App Shell | IMPLEMENTADO |
| [SPEC-0003](specs/SPEC-0003-conector-hubspot.md) | Conector HubSpot | IMPLEMENTADO |
| [SPEC-0004](specs/SPEC-0004-conector-google-drive.md) | Conector Google Drive | IMPLEMENTADO |
| [SPEC-0005](specs/SPEC-0005-capa-mcp-api.md) | Capa MCP / API | IMPLEMENTADO |
| [SPEC-0006](specs/SPEC-0006-gestion-de-propiedades.md) | Gestión de Propiedades | IMPLEMENTADO |

Leer el SPEC correspondiente antes de implementar o modificar cualquier característica.

Cada nuevo SPEC aprobado debe añadirse a esta tabla antes de continuar con el siguiente.

## Alcance de cada SPEC

Límites estrictos para evitar solapamientos entre SPECs:

| SPEC | Alcance — qué hace | Fuera de alcance — qué NO toca |
|------|--------------------|-------------------------------|
| SPEC-0000 | Convenciones, stack, flujo Git, reglas de testing, formato de SPECs | Ningún código de producción |
| SPEC-0001 | Scaffolding Electron + TS + React, tema MUI con tokens CD, auto-updater, estructura de carpetas, READMEs, init Git con remote | Ninguna pantalla ni lógica de negocio |
| SPEC-0002 | Pantalla de bienvenida, selector de proyectos, menú lateral, topbar, layout principal, router, store de shell, sección Ayuda (visor in-app de los tutoriales de `doc/tutoriales/`) | Ningún conector externo; ninguna característica de negocio; no escribe el contenido de los tutoriales (lo aporta cada SPEC) |
| SPEC-0003 | Cliente HTTP HubSpot, autenticación PAT, gestión de entornos production/sandbox, rate limiting, pantalla de configuración del conector | No implementa ningún endpoint de negocio; no toca Google Drive ni MCP |
| SPEC-0004 | Cliente Google Drive, OAuth PKCE, selección de carpeta, sincronización, escritura/lectura de archivos con portada CD y versionado de esquema | No define la estructura de ningún archivo concreto (eso lo hace cada SPEC de característica); no toca HubSpot ni MCP |
| SPEC-0005 | Servidor MCP (stdio + HTTP/SSE), registry de tools, autenticación por token local, UI de configuración MCP | No implementa ninguna tool de negocio; las tools las registra cada SPEC de característica |
| SPEC-0006 | Mapa de propiedades HubSpot: orígenes de datos, propiedades, mapeos origen↔propiedad, transformaciones, cambios pendientes en HubSpot, exportación JSON, Google Sheets con cuatro hojas, tools MCP de propiedades | No toca otras entidades CRM (contactos, deals, etc.); no gestiona workflows ni sequences |
