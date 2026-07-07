# Criar e reimportar o mapa de campos de planeamento

**Pré-requisitos:** ter um projeto aberto, o conector do Google Drive configurado com uma pasta de trabalho e, para confrontar com o portal, o conector do HubSpot. Convém ter definidos os origens de dados e os seus campos.
**Tempo estimado:** 10 minutos

O mapa de campos de planeamento é um documento do Google Sheets **editável** que a aplicação gera para que o cliente decida, no próprio documento, como se mapeia cada campo de origem a uma propriedade do HubSpot. Ao contrário do ficheiro de estado, este documento destina-se a ser preenchido à mão: tem menus suspensos, um separador por objeto e folhas de catálogo por origem. Quando o cliente o devolve preenchido, a aplicação relê-o, mostra-te um resumo das alterações e cria rascunhos que depois revês.

## Passos

1. Entra em **CRM → Propriedades**.
2. Carrega em **Gerar mapa de planeamento**. A aplicação cria (ou atualiza) na tua pasta do Drive um Google Sheets com:
   - uma folha **Legenda** que explica as colunas e os estados;
   - um separador por objeto do HubSpot, com o bloco HubSpot (Custom, Name, Internal name, Type…) e um bloco por cada origem aplicável (Field name, Origin, Comments);
   - uma folha **Origem …** por cada sistema de origem, com a propriedade de destino calculada;
   - uma folha **Associações** (apenas informativa).
3. Partilha o documento com o cliente. Em cada separador de objeto pode preencher, com os menus suspensos:
   - **Custom**: `No` (já existe), `Yes (Pending)` (a criar) ou `Yes (Created)` (já criada);
   - **Field name**: o campo da origem que alimenta a propriedade;
   - **Origin**: `Migration` ou `Integration`;
   - **Type**: o tipo do campo em linguagem simples (texto, número, moeda, telefone…).
4. Quando o documento estiver preenchido, volta a **CRM → Propriedades** e carrega em **Importar planeamento**.
5. Se houver alterações em relação ao projeto, abre-se um **resumo de alterações** (adições, remoções, alterações de mapeamento ou de tipo) e, se aplicável, a lista de **campos que precisam de ação**: são tipos ambíguos (por exemplo, «seleção», que pode ser menu suspenso, caixas ou botões) que é preciso concretizar. Ainda não se aplica nada.
6. Revê o resumo e carrega em **Criar rascunhos**. A aplicação cria ou atualiza as entradas do mapa. Os campos com tipo por resolver ficam **bloqueados** e não são criados até que indiques o tipo concreto.
7. As entradas ficam como rascunhos no mapa. Revê-as, sincroniza com o HubSpot e aplica as alterações com o fluxo habitual (ver «Sincronizar com o HubSpot» e «Aplicar alterações no HubSpot»).

## Resultado esperado

O documento de planeamento é gerado no Drive com os seus menus suspensos e, ao reimportá-lo, a aplicação mostra-te o que muda antes de tocar em nada e cria as entradas como rascunhos. Em nenhum momento se aplicam alterações no HubSpot: isso continua a exigir sincronizar e aplicar de forma explícita.

## Perguntas frequentes

**Aplica-se alguma coisa no HubSpot ao importar?** Não. A importação apenas cria ou atualiza rascunhos no mapa do projeto. As alterações no HubSpot passam sempre por sincronizar e aplicar por ambiente.

**O que significa que um campo «precisa de ação»?** Que o tipo escolhido em linguagem simples corresponde a várias configurações do HubSpot e é preciso concretizar qual. Até que se resolva, esse campo não é criado.

**O documento está protegido?** Não. É editável de propósito, para que o cliente o preencha. O ficheiro de estado do projeto continua a ser o registo fiel e não é tocado.

**Posso regenerá-lo?** Sim. Voltar a carregar em «Gerar mapa de planeamento» atualiza o documento existente.
