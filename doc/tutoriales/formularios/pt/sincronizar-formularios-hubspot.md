# Sincronizar as alterações com o HubSpot

**Pré-requisitos:** pelo menos uma alteração pendente de formulários (criada ao criar um formulário ou ao adicionar campos em falta).
**Tempo estimado:** 3 minutos

Nenhuma alteração é escrita no HubSpot automaticamente. As alterações acumulam-se como pendentes e é você que as aplica, podendo testar primeiro em sandbox e depois em produção.

## Passos

1. Entre em **CRM → Formulários**.
2. Prima **Alterações pendentes (N)**.
3. Reveja cada alteração: o seu resumo, o tipo de operação e o seu estado por ambiente.
4. Verifique na barra superior que ambiente está ativo.
5. Prima **Aplicar em Sandbox** para testar a alteração sem mexer em produção.
6. Quando estiver satisfeito, prima **Aplicar em Produção**.
7. Se uma alteração já não interessar, prima **Descartar**.

## Compreender os estados

- **sandbox ✓ / ✕**: se a alteração foi ou não aplicada em sandbox.
- **produção ✓ / ✕**: se a alteração foi ou não aplicada em produção.

Uma alteração não se considera concluída enquanto não for aplicada em produção.

## Resultado esperado

Após aplicar, o formulário é criado ou atualizado no HubSpot no ambiente escolhido e a alteração fica marcada para esse ambiente.

## Perguntas frequentes

**O que acontece se faltar o scope `forms`?** O HubSpot devolve um erro de permissões (403) e a aplicação mostra-o; a alteração não é marcada como aplicada.

**Posso aplicar diretamente em produção?** Sim, mas recomenda-se validar antes em sandbox.

**É possível apagar formulários a partir da aplicação?** Não. A eliminação de formulários fica fora do âmbito.
