# Sincronizar o mapa com o HubSpot

**Pré-requisitos:** conetor do HubSpot configurado no projeto.
**Tempo estimado:** 3 minutos

A sincronização compara a definição de propriedades do projeto com o estado real do portal do HubSpot e classifica cada propriedade segundo o seu estado.

## Passos

1. Entre em **CRM → Propriedades**.
2. Verifique na barra superior da aplicação que ambiente do HubSpot está ativo (produção ou sandbox).
3. Prima **Sincronizar HubSpot**. A aplicação lê as propriedades do portal através da API de propriedades do HubSpot.
4. Ao terminar verá um resumo: quantas propriedades estão atualizadas, quantas divergentes e quantas por criar.

## Compreender os estados

- **exists** (badge verde lima): a propriedade existe no HubSpot e coincide com a definição do projeto.
- **divergent** (badge cinzento): existe mas difere (por exemplo, etiqueta ou opções distintas). Gera alterações pendentes.
- **missing** (badge cinzento-escuro): não existe no HubSpot. Gera uma alteração pendente de criação.

## Resultado esperado

A tabela mostra cada propriedade com o seu badge de estado. As propriedades do portal que ainda não estavam no mapa são importadas como `exists`. O mapa atualizado é exportado para o Google Sheets do projeto.

## Perguntas frequentes

**A sincronização modifica o HubSpot?** Não. Apenas lê. Qualquer alteração no portal é proposta como alteração pendente e requer a sua confirmação.

**Sobre que objetos sincroniza?** Sobre os objetos presentes no mapa; se estiver vazio, sobre contacts, deals e companies por predefinição.
