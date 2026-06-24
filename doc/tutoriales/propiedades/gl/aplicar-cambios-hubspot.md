# Aplicar cambios en HubSpot

**Prerrequisitos:** ter sincronizado o mapa e ter cambios pendentes. Para validar en sandbox, ter configurado ese contorno no conector de HubSpot.
**Tempo estimado:** 5 minutos

A app nunca escribe en HubSpot de forma automática. Os cambios necesarios (crear propiedades, axustar etiquetas, opcións ou tipos) preséntanse como unha lista que ti revisas e aplicas explicitamente. A recomendación é aplicar primeiro en **sandbox**, validar, e só despois en **produción**.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Preme **Cambios pendentes (n)** para abrir a vista de cambios. Cada tarxeta mostra a propiedade, a operación e a chamada de API correspondente.
3. Para cada cambio:
   - Preme **Aplicar en Sandbox** para executalo no contorno de probas. Ao rematar con éxito, o estado pasa a `sandbox ✓`.
   - Valida no teu sandbox de HubSpot que o resultado é o esperado.
   - Preme **Aplicar en Produción** para executalo no portal real. O estado pasa a `produción ✓`.
4. Se un cambio non procede, preme **Descartar** para retiralo da lista.

## Resultado esperado

Cada cambio reflicte o seu estado por contorno (sandbox e produción). Un cambio non se considera completado ata que se aplicou en produción.

## Preguntas frecuentes

**Podo aplicar directamente en produción sen pasar por sandbox?** Si, pero non é o recomendado. Validar en sandbox reduce o risco de erros no portal real.

**Que pasa se a chamada a HubSpot falla?** O cambio non se marca como aplicado e verás a mensaxe de erro. Corrixe a causa e volve intentalo.

**Este é un tema sensible:** aplicar cambios en produción modifica o portal real dun cliente. Asegúrate do contorno activo antes de confirmar.
