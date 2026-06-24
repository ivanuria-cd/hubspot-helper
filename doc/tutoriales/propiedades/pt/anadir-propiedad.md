# Adicionar uma propriedade ao mapa

**Pré-requisitos:** ter um projeto aberto. Para que a propriedade seja contrastada com o HubSpot, convém ter o conetor do HubSpot configurado.
**Tempo estimado:** 5 minutos

O mapa de propriedades é a listagem mestra das propriedades do projeto e a sua definição prevista no HubSpot. Pode incorporar propriedades de duas formas: importando-as do HubSpot ao sincronizar, ou adicionando-as manualmente quando ainda não existem no portal.

## Passos

1. Entre em **CRM → Propriedades**.
2. Prima **Propriedade** (botão da barra de ações). Abre-se o diálogo «Adicionar propriedade».
3. Preencha os campos:
   - **Nome técnico (HubSpot)**: o nome interno da propriedade, por exemplo `custom_tier`.
   - **Etiqueta**: o nome legível que os utilizadores verão.
   - **Objeto**: a que objeto pertence (contacts, deals ou companies).
   - **Tipo**: o tipo de dado (texto, número, data, enumeração, etc.).
   - **Tipo de campo**: como se introduz (text, select, checkbox…).
   - **Grupo**: o grupo de propriedades do HubSpot onde residirá.
   - **Descrição** (opcional).
4. Prima **Criar**. A propriedade aparece na tabela com estado **missing** (ainda não existe no HubSpot).
5. Clique na linha para abrir o painel lateral e associar-lhe origens (ver o tutorial «Mapear origens e transformações»).

## Resultado esperado

A propriedade fica no mapa com estado `missing`. Ao sincronizar com o HubSpot será gerada uma alteração pendente do tipo «Criar propriedade» que poderá rever e aplicar.

## Perguntas frequentes

**Criar a propriedade aqui cria-a no HubSpot?** Não. A aplicação nunca escreve no HubSpot automaticamente. Criar a propriedade no portal requer aplicar a alteração pendente de forma explícita.

**Posso editar uma propriedade importada do HubSpot?** Pode editar a sua etiqueta e descrição; os restantes campos refletem o estado real do portal.
