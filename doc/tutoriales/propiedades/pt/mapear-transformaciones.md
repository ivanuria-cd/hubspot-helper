# Mapear origens e transformações

**Pré-requisitos:** ter pelo menos uma propriedade no mapa e uma origem criada.
**Tempo estimado:** 7 minutos

Um mapeamento liga uma propriedade a uma origem de dados, indicando de que campo do sistema de origem provém e que transformações de valores há que aplicar para que encaixem no HubSpot.

## Passos

1. Entre em **CRM → Propriedades** e clique na propriedade que pretende mapear. Abre-se o painel lateral.
2. Na secção **Origens mapeadas**, prima **Adicionar origem**.
3. No diálogo «Mapear origem»:
   - **Origem**: escolha a origem de dados.
   - **Campo de origem**: o nome do campo no sistema de origem, por exemplo `Account_Tier__c`.
   - **Transformações**: prima **Adicionar regra** por cada equivalência de valor. À esquerda o valor tal como chega da origem, à direita o valor válido no HubSpot. Por exemplo `GOLD → enterprise`.
   - **Notas** (opcional): qualquer esclarecimento para a equipa.
4. Prima **Guardar**. O mapeamento aparece no painel e na coluna «Origens» da tabela.
5. Para editar ou eliminar um mapeamento, use os ícones de lápis e de caixote do lixo ao lado dele no painel.

## Resultado esperado

O mapeamento fica guardado e reflete-se na folha `03_Mapeo_Origenes` do Google Sheets. As transformações armazenam-se como pares valor de origem → valor HubSpot, prontas para serem exportadas no contrato JSON da origem.

## Perguntas frequentes

**Posso definir lógica complexa nas transformações?** Não. Por segurança só se admitem equivalências de valor (mapeamentos), nunca scripts.

**Uma propriedade pode ter várias origens?** Sim. Adicione um mapeamento por cada origem que alimente essa propriedade.
