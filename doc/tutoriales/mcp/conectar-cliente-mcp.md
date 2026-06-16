# Conectar un cliente MCP (Claude Desktop) a la app

**Prerrequisitos:** tener un proyecto creado y abierto en la app.
**Tiempo estimado:** 3 minutos.

## Pasos

1. Abre tu proyecto en la app.
2. En el menú lateral, pulsa **Configuración**.
3. En la sección de conectores, pulsa **API / MCP**.
4. Activa el interruptor **Servidor MCP**. El estado pasará a **Servidor MCP activo** y se mostrará el **Puerto** (por defecto, 3741).
5. Pulsa **Copiar configuración** para copiar el snippet listo para tu cliente MCP.
6. Pega el snippet en el fichero de configuración de tu cliente (por ejemplo, el `claude_desktop_config.json` de Claude Desktop) y reinícialo.

> **Por qué `mcp-remote`:** Claude Desktop solo admite servidores **stdio** en su fichero de configuración (no acepta `url`/`headers`). El snippet usa `npx mcp-remote` como puente local hacia el servidor SSE de la app, con el token en `env`. Requiere tener **Node.js/npx** instalado. Alternativa sin fichero: añadir el servidor remoto desde **Settings > Connectors** de Claude Desktop con la URL `http://127.0.0.1:3741/sse` y la cabecera `x-api-key`.

## Resultado esperado

- El cliente MCP se conecta al servidor local y lista las **tools disponibles**.
- En la pantalla **API / MCP** verás el listado de tools que el cliente puede usar (de inicio, al menos `mcp_health`, que confirma la conexión y el proyecto activo).

## El token de acceso

El servidor exige un **token de acceso** que viaja en la cabecera `x-api-key`. El snippet ya lo incluye. Puedes mostrarlo u ocultarlo con el icono del ojo, copiarlo, o pulsar **Regenerar** para crear uno nuevo.

> Al regenerar el token, el anterior deja de funcionar de inmediato. Tendrás que volver a copiar la configuración en tu cliente.

## Preguntas frecuentes

**¿El servidor está expuesto en mi red?** No. Escucha únicamente en `127.0.0.1` (tu propio equipo); no es accesible desde otros dispositivos.

**¿Qué proyecto ven las tools?** El proyecto activo en la app. Las tools no acceden a otros proyectos.

**¿Tengo que dejar la app abierta?** Sí. El servidor MCP corre dentro de la app; si la cierras, el cliente perderá la conexión. Si dejas el servidor activado, se vuelve a arrancar solo la próxima vez que abras la app.

**¿Cómo lo apago?** Desactiva el interruptor **Servidor MCP** en la misma pantalla.
