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
| [SPEC-0004](specs/SPEC-0004-conector-google-drive.md) | Conector Google Drive | IMPLEMENTADO (credenciales por UI §13 + selector propio sin Picker §14) |
| [SPEC-0005](specs/SPEC-0005-capa-mcp-api.md) | Capa MCP / API | IMPLEMENTADO |
| [SPEC-0006](specs/SPEC-0006-gestion-de-propiedades.md) | Gestión de Propiedades | IMPLEMENTADO (rediseño §16 en BORRADOR) |
| [SPEC-0007](specs/SPEC-0007-objetos-custom-hubspot.md) | Objetos Custom de HubSpot | IMPLEMENTADO |
| [SPEC-0008](specs/SPEC-0008-gestion-de-formularios.md) | Gestión de Formularios | BORRADOR |

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
| SPEC-0006 | Mapa de propiedades HubSpot: orígenes de datos, entradas por objeto (nombre + propiedad HubSpot destino + orígenes con definición genérica y mapeo de opciones), selección de objetos (estándar + custom existentes), cambios pendientes en HubSpot, exportación JSON, Google Sheets, tools MCP de propiedades | No crea objetos custom (eso es SPEC-0007); no gestiona registros/instancias; no toca workflows ni sequences |
| SPEC-0007 | Creación y gestión de objetos custom de HubSpot (CRM Schemas API); catálogo de objetos para SPEC-0006 | No gestiona registros (instancias); no define las entradas de propiedades (eso es SPEC-0006) |
| SPEC-0008 | Formularios HubSpot (Marketing Forms API v3): importar (legacy + nueva), crear formularios solo-campos, asociar a orígenes de SPEC-0006, revisar cobertura, añadir campos en bloque, cambios pendientes/sincronización, volcado a Sheets, tools MCP de formularios | No edita estilos/lógica/consentimiento ni borra formularios; no crea propiedades ni objetos (SPEC-0006/0007); no define orígenes; no gestiona submissions |
