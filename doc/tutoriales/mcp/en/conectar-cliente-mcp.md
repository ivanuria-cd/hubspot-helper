# Connect an MCP client (Claude Desktop) to the app

**Prerequisites:** having a project created and open in the app.
**Estimated time:** 3 minutes.

## Steps

1. Open your project in the app.
2. In the side menu, click **Settings**.
3. In the connectors section, click **API / MCP**.
4. Turn on the **MCP server** toggle. The status will change to **MCP server running** and the **Port** will be shown (3741 by default).
5. Click **Copy configuration** to copy the snippet ready for your MCP client.
6. Paste the snippet into your client's configuration file (for example, Claude Desktop's `claude_desktop_config.json`) and restart it.

> **Why `mcp-remote`:** Claude Desktop only supports **stdio** servers in its configuration file (it does not accept `url`/`headers`). The snippet uses `npx mcp-remote` as a local bridge to the app's SSE server, with the token in `env`. It requires having **Node.js/npx** installed. Alternative without a file: add the remote server from Claude Desktop's **Settings > Connectors** with the URL `http://127.0.0.1:3741/sse` and the `x-api-key` header.

## Expected result

- The MCP client connects to the local server and lists the **available tools**.
- On the **API / MCP** screen you'll see the list of tools the client can use (initially, at least `mcp_health`, which confirms the connection and the active project).

## The access token

The server requires an **access token** that travels in the `x-api-key` header. The snippet already includes it. You can show or hide it with the eye icon, copy it, or click **Regenerate** to create a new one.

> When you regenerate the token, the previous one stops working immediately. You'll have to copy the configuration into your client again.

## FAQ

**Is the server exposed on my network?** No. It listens only on `127.0.0.1` (your own machine); it is not reachable from other devices.

**Which project do the tools see?** The project active in the app. The tools do not access other projects.

**Do I have to leave the app open?** Yes. The MCP server runs inside the app; if you close it, the client will lose the connection. If you leave the server enabled, it starts again automatically the next time you open the app.

**How do I turn it off?** Turn off the **MCP server** toggle on the same screen.
