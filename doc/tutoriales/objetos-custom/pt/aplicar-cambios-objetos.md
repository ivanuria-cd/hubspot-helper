# Aplicar alterações de objetos no HubSpot

**Pré-requisitos:** ter objetos custom com alterações pendentes (criação, edição ou arquivo).
**Tempo estimado:** 3–5 minutos

A aplicação nunca escreve no HubSpot de forma automática. As alterações acumulam-se como **pendentes** e é você que as aplica, primeiro em **sandbox** para validar e depois em **produção**.

## Passos

1. Abra **CRM → Objetos custom**.
2. Prima **Alterações pendentes** (mostra o número entre parênteses) ou abra o painel de um objeto concreto.
3. Por cada alteração verá a operação (criar / atualizar schema / arquivar) e o seu estado por ambiente.
4. Prima **Aplicar em Sandbox**. Verifique no seu portal sandbox que o objeto ficou como esperava.
5. Quando estiver satisfeito, prima **Aplicar em Produção**.
6. Se uma alteração já não lhe interessar, prima **Descartar**.

## Resultado esperado

- Após aplicar em sandbox, o estado da alteração mostra «sandbox ✓».
- Após aplicar em produção, mostra «produção ✓».
- Ao criar, a aplicação guarda o identificador que o HubSpot atribui **em cada ambiente** (são distintos em sandbox e em produção).

## Perguntas frequentes

**Porque é que é preciso aplicar duas vezes (sandbox e produção)?** Para validar a alteração num ambiente seguro antes de mexer em produção. Além disso, o HubSpot atribui identificadores distintos por portal, pelo que cada ambiente é gerido em separado.

**Dá-me erro ao atualizar ou arquivar num ambiente.** Certifique-se de que o objeto já existe nesse ambiente (deve ter sido criado lá primeiro). Caso contrário, crie-o antes de aplicar outras alterações.

**O ambiente ativo importa?** A sincronização lê do ambiente ativo do HubSpot. Mude o ambiente ativo a partir do conetor se quiser reconciliar contra o outro portal.
