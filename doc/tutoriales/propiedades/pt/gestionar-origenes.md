# Gerir origens de dados

**Pré-requisitos:** ter um projeto aberto.
**Tempo estimado:** 5 minutos

Uma **origem** representa de onde provêm os dados de uma propriedade: uma integração, uma migração pontual, a introdução manual por utilizadores, ou um workflow do HubSpot. Definir bem as origens permite-lhe documentar o mapa de propriedades e exportar contratos de integração por origem.

## Passos

1. No menu lateral, entre em **CRM → Propriedades**.
2. Prima o botão **Origens (n)** da barra superior. Abre-se a janela «Gerir origens».
3. Verá a lista de origens existentes. Para criar uma nova, preencha o formulário inferior:
   - **Nome**: um nome descritivo, por exemplo «Migração Salesforce Q1».
   - **Tipo**: escolha entre Integração, Migração, Utilizador ou Workflow.
   - **Descrição** (opcional): contexto adicional.
4. Prima **Adicionar origem**. A origem aparece na lista de imediato.
5. Para eliminar uma origem, prima o ícone de caixote do lixo ao lado dela. Ao eliminá-la, apagam-se também os seus mapeamentos com propriedades.
6. Feche a janela com **Fechar**.

## Quando usar cada tipo

- **Integração**: o dado chega de um sistema ligado de forma contínua (por exemplo, um ERP sincronizado).
- **Migração**: o dado foi carregado uma vez a partir de outro sistema (por exemplo, ao migrar do Salesforce).
- **Utilizador**: introduzem-no pessoas manualmente no HubSpot.
- **Workflow**: calcula-o ou atribui-o um workflow do HubSpot.

## Resultado esperado

As origens ficam guardadas no projeto e refletem-se na folha `01_Origenes` do Google Sheets do mapa de propriedades. A partir de agora pode associá-las a propriedades.

## Perguntas frequentes

**Posso mudar o tipo de uma origem depois?** Sim, os campos Nome, Tipo e Descrição são editáveis.

**O que acontece às propriedades mapeadas se eliminar a origem?** Eliminam-se os mapeamentos dessa origem, mas as propriedades permanecem.
