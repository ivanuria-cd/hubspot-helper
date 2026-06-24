# Configurar e alternar entre Produção e Sandbox

**Pré-requisitos:** ter o conetor HubSpot configurado em pelo menos um ambiente (ver *Ligar a aplicação ao HubSpot*).
**Tempo estimado:** 3 minutos.

Cada projeto admite dois ambientes independentes do HubSpot: **Produção** e **Sandbox**, cada um com o seu próprio token e portal. O ambiente ativo é o destino de todas as operações de escrita.

## Passos

### Configurar o ambiente sandbox

1. Abra o seu projeto → **Configuração → Conetores → HubSpot**.
2. Selecione o separador **Sandbox**.
3. Cole o token do seu portal sandbox e prima **Guardar**.

### Mudar o ambiente ativo

1. No mesmo ecrã, selecione o separador do ambiente que pretende ativar.
2. Se estiver ligado e não for o ativo, prima **Usar como ambiente ativo**.

O ambiente ativo é mostrado de forma permanente como uma etiqueta na barra superior (**PROD** ou **SANDBOX**), visível a partir de qualquer ecrã.

## Resultado esperado

- A etiqueta da barra superior reflete o ambiente ativo.
- As operações de leitura podem executar-se contra qualquer ambiente configurado.
- As operações de escrita usam sempre o ambiente ativo e mostram confirmação a indicar o destino.

## Perguntas frequentes

**Para que serve o sandbox?** Para testar automatizações e alterações sem mexer em dados reais. Configure primeiro em sandbox, valide e depois replique em produção.

**Posso ter apenas produção?** Sim. O ambiente sandbox é opcional; se não o configurar, a aplicação trabalha unicamente com produção.

**Mudei de ambiente por engano.** Volte ao ecrã do conetor, selecione o ambiente correto e prima **Usar como ambiente ativo**. A alteração é imediata.
