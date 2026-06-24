# Ligar um cliente MCP (Claude Desktop) à aplicação

**Pré-requisitos:** ter um projeto criado e aberto na aplicação.
**Tempo estimado:** 3 minutos.

## Passos

1. Abra o seu projeto na aplicação.
2. No menu lateral, prima **Configuração**.
3. Na secção de conetores, prima **API / MCP**.
4. Ative o interruptor **Servidor MCP**. O estado passará a **Servidor MCP ativo** e será mostrado o **Porto** (por predefinição, 3741).
5. Prima **Copiar configuração** para copiar o snippet pronto para o seu cliente MCP.
6. Cole o snippet no ficheiro de configuração do seu cliente (por exemplo, o `claude_desktop_config.json` do Claude Desktop) e reinicie-o.

> **Porquê `mcp-remote`:** o Claude Desktop só admite servidores **stdio** no seu ficheiro de configuração (não aceita `url`/`headers`). O snippet usa `npx mcp-remote` como ponte local para o servidor SSE da aplicação, com o token em `env`. Requer ter **Node.js/npx** instalado. Alternativa sem ficheiro: adicionar o servidor remoto a partir de **Settings > Connectors** do Claude Desktop com o URL `http://127.0.0.1:3741/sse` e o cabeçalho `x-api-key`.

## Resultado esperado

- O cliente MCP liga-se ao servidor local e lista as **tools disponíveis**.
- No ecrã **API / MCP** verá a lista de tools que o cliente pode usar (de início, pelo menos `mcp_health`, que confirma a ligação e o projeto ativo).

## O token de acesso

O servidor exige um **token de acesso** que viaja no cabeçalho `x-api-key`. O snippet já o inclui. Pode mostrá-lo ou ocultá-lo com o ícone do olho, copiá-lo, ou premir **Regenerar** para criar um novo.

> Ao regenerar o token, o anterior deixa de funcionar de imediato. Terá de voltar a copiar a configuração para o seu cliente.

## Perguntas frequentes

**O servidor está exposto na minha rede?** Não. Escuta unicamente em `127.0.0.1` (o seu próprio equipamento); não é acessível a partir de outros dispositivos.

**Que projeto veem as tools?** O projeto ativo na aplicação. As tools não acedem a outros projetos.

**Tenho de deixar a aplicação aberta?** Sim. O servidor MCP corre dentro da aplicação; se a fechar, o cliente perderá a ligação. Se deixar o servidor ativado, este volta a arrancar sozinho da próxima vez que abrir a aplicação.

**Como o desligo?** Desative o interruptor **Servidor MCP** no mesmo ecrã.
