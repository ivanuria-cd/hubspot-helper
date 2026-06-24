# Editar um objeto custom

**Pré-requisitos:** ter pelo menos um objeto custom criado ou em rascunho.
**Tempo estimado:** 3–5 minutos

Pode ajustar as etiquetas, as propriedades de visualização, as obrigatórias e as associações de um objeto. O **nome interno não pode ser mudado**.

## Passos

1. Abra **CRM → Objetos custom**.
2. Clique no objeto que pretende modificar para abrir o seu painel de detalhe.
3. Prima **Editar**: abre-se o assistente com os dados atuais.
4. Mude o que necessitar:
   - Etiquetas (singular/plural) e descrição.
   - Propriedade principal, secundárias, obrigatórias e de pesquisa.
   - Associações com outros objetos.
   - O campo **Nome interno** aparece bloqueado.
5. Prima **Guardar**. Se o objeto já existir no HubSpot e a definição diferir, será gerada uma alteração pendente do tipo «atualizar schema».

## Resultado esperado

Se houver diferenças com o HubSpot, o objeto passa ao estado **diverge** (⚠) e surge uma alteração pendente. Aplique-a em sandbox e produção para sincronizar.

## Perguntas frequentes

**Quero adicionar uma propriedade nova e marcá-la como obrigatória.** Primeiro a propriedade tem de existir no HubSpot. Crie-a a partir do ecrã de **Propriedades** (ou inclua-a ao criar o objeto) e depois, na edição, marque-a como obrigatória ou de visualização. O HubSpot não permite referenciar uma propriedade que ainda não existe.

**Posso mudar o tipo de uma propriedade existente?** Não a partir daqui: a edição do schema não muda tipos de propriedades já criadas.
