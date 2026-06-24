# Conectar un cliente MCP (Claude Desktop) á app

**Prerrequisitos:** ter un proxecto creado e aberto na app.
**Tempo estimado:** 3 minutos.

## Pasos

1. Abre o teu proxecto na app.
2. No menú lateral, preme **Configuración**.
3. Na sección de conectores, preme **API / MCP**.
4. Activa o interruptor **Servidor MCP**. O estado pasará a **Servidor MCP activo** e mostrarase o **Porto** (por defecto, 3741).
5. Preme **Copiar configuración** para copiar o snippet listo para o teu cliente MCP.
6. Pega o snippet no ficheiro de configuración do teu cliente (por exemplo, o `claude_desktop_config.json` de Claude Desktop) e reinícialo.

> **Por que `mcp-remote`:** Claude Desktop só admite servidores **stdio** no seu ficheiro de configuración (non acepta `url`/`headers`). O snippet usa `npx mcp-remote` como ponte local cara ao servidor SSE da app, co token en `env`. Require ter **Node.js/npx** instalado. Alternativa sen ficheiro: engadir o servidor remoto desde **Settings > Connectors** de Claude Desktop coa URL `http://127.0.0.1:3741/sse` e a cabeceira `x-api-key`.

## Resultado esperado

- O cliente MCP conéctase ao servidor local e lista as **tools dispoñibles**.
- Na pantalla **API / MCP** verás a listaxe de tools que o cliente pode usar (de inicio, polo menos `mcp_health`, que confirma a conexión e o proxecto activo).

## O token de acceso

O servidor esixe un **token de acceso** que viaxa na cabeceira `x-api-key`. O snippet xa o inclúe. Podes mostralo ou ocultalo coa icona do ollo, copialo, ou premer **Rexenerar** para crear un novo.

> Ao rexenerar o token, o anterior deixa de funcionar de inmediato. Terás que volver copiar a configuración no teu cliente.

## Preguntas frecuentes

**O servidor está exposto na miña rede?** Non. Escoita unicamente en `127.0.0.1` (o teu propio equipo); non é accesible desde outros dispositivos.

**Que proxecto ven as tools?** O proxecto activo na app. As tools non acceden a outros proxectos.

**Teño que deixar a app aberta?** Si. O servidor MCP corre dentro da app; se a pechas, o cliente perderá a conexión. Se deixas o servidor activado, vólvese arrancar só a próxima vez que abras a app.

**Como o apago?** Desactiva o interruptor **Servidor MCP** na mesma pantalla.
