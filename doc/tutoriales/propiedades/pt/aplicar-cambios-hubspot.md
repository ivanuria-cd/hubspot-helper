# Aplicar alterações no HubSpot

**Pré-requisitos:** ter sincronizado o mapa e ter alterações pendentes. Para validar em sandbox, ter configurado esse ambiente no conetor do HubSpot.
**Tempo estimado:** 5 minutos

A aplicação nunca escreve no HubSpot de forma automática. As alterações necessárias (criar propriedades, ajustar etiquetas, opções ou tipos) são apresentadas como uma lista que você revê e aplica explicitamente. A recomendação é aplicar primeiro em **sandbox**, validar, e só depois em **produção**.

## Passos

1. Entre em **CRM → Propriedades**.
2. Prima **Alterações pendentes (n)** para abrir a vista de alterações. Cada cartão mostra a propriedade, a operação e a chamada de API correspondente.
3. Para cada alteração:
   - Prima **Aplicar em Sandbox** para a executar no ambiente de testes. Ao terminar com sucesso, o estado passa a `sandbox ✓`.
   - Valide no seu sandbox do HubSpot que o resultado é o esperado.
   - Prima **Aplicar em Produção** para a executar no portal real. O estado passa a `produção ✓`.
4. Se uma alteração não proceder, prima **Descartar** para a retirar da lista.

## Resultado esperado

Cada alteração reflete o seu estado por ambiente (sandbox e produção). Uma alteração não se considera concluída enquanto não tiver sido aplicada em produção.

## Perguntas frequentes

**Posso aplicar diretamente em produção sem passar por sandbox?** Sim, mas não é o recomendado. Validar em sandbox reduz o risco de erros no portal real.

**O que acontece se a chamada ao HubSpot falhar?** A alteração não é marcada como aplicada e verá a mensagem de erro. Corrija a causa e tente novamente.

**Este é um tema sensível:** aplicar alterações em produção modifica o portal real de um cliente. Certifique-se do ambiente ativo antes de confirmar.
