# Connectar un client MCP (Claude Desktop) a l'app

**Prerequisits:** tenir un projecte creat i obert a l'app.
**Temps estimat:** 3 minuts.

## Passos

1. Obre el teu projecte a l'app.
2. Al menú lateral, prem **Configuració**.
3. A la secció de connectors, prem **API / MCP**.
4. Activa l'interruptor **Servidor MCP**. L'estat passarà a **Servidor MCP actiu** i es mostrarà el **Port** (per defecte, 3741).
5. Prem **Copia la configuració** per copiar el snippet a punt per al teu client MCP.
6. Enganxa el snippet al fitxer de configuració del teu client (per exemple, el `claude_desktop_config.json` de Claude Desktop) i reinicia'l.

> **Per què `mcp-remote`:** Claude Desktop només admet servidors **stdio** al seu fitxer de configuració (no accepta `url`/`headers`). El snippet usa `npx mcp-remote` com a pont local cap al servidor SSE de l'app, amb el token a `env`. Requereix tenir **Node.js/npx** instal·lat. Alternativa sense fitxer: afegir el servidor remot des de **Settings > Connectors** de Claude Desktop amb la URL `http://127.0.0.1:3741/sse` i la capçalera `x-api-key`.

## Resultat esperat

- El client MCP es connecta al servidor local i llista les **tools disponibles**.
- A la pantalla **API / MCP** veuràs el llistat de tools que el client pot usar (d'inici, com a mínim `mcp_health`, que confirma la connexió i el projecte actiu).

## El token d'accés

El servidor exigeix un **token d'accés** que viatja a la capçalera `x-api-key`. El snippet ja l'inclou. Pots mostrar-lo o ocultar-lo amb la icona de l'ull, copiar-lo, o prémer **Regenera** per crear-ne un de nou.

> En regenerar el token, l'anterior deixa de funcionar immediatament. Hauràs de tornar a copiar la configuració al teu client.

## Preguntes freqüents

**El servidor està exposat a la meva xarxa?** No. Escolta únicament a `127.0.0.1` (el teu propi equip); no és accessible des d'altres dispositius.

**Quin projecte veuen les tools?** El projecte actiu a l'app. Les tools no accedeixen a altres projectes.

**He de deixar l'app oberta?** Sí. El servidor MCP corre dins de l'app; si la tanques, el client perdrà la connexió. Si deixes el servidor activat, es torna a arrencar sol el proper cop que obris l'app.

**Com l'apago?** Desactiva l'interruptor **Servidor MCP** a la mateixa pantalla.
