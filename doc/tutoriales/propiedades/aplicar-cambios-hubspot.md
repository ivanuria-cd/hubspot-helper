# Aplicar cambios en HubSpot

**Prerrequisitos:** haber sincronizado el mapa y tener cambios pendientes. Para validar en sandbox, tener configurado ese entorno en el conector de HubSpot.
**Tiempo estimado:** 5 minutos

La app nunca escribe en HubSpot de forma automática. Los cambios necesarios (crear propiedades, ajustar etiquetas, opciones o tipos) se presentan como una lista que tú revisas y aplicas explícitamente. La recomendación es aplicar primero en **sandbox**, validar, y solo después en **producción**.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Pulsa **Cambios pendientes (n)** para abrir la vista de cambios. Cada tarjeta muestra la propiedad, la operación y la llamada de API correspondiente.
3. Para cada cambio:
   - Pulsa **Aplicar en Sandbox** para ejecutarlo en el entorno de pruebas. Al terminar con éxito, el estado pasa a `sandbox ✓`.
   - Valida en tu sandbox de HubSpot que el resultado es el esperado.
   - Pulsa **Aplicar en Producción** para ejecutarlo en el portal real. El estado pasa a `producción ✓`.
4. Si un cambio no procede, pulsa **Descartar** para retirarlo de la lista.

## Resultado esperado

Cada cambio refleja su estado por entorno (sandbox y producción). Un cambio no se considera completado hasta que se ha aplicado en producción.

## Preguntas frecuentes

**¿Puedo aplicar directamente en producción sin pasar por sandbox?** Sí, pero no es lo recomendado. Validar en sandbox reduce el riesgo de errores en el portal real.

**¿Qué pasa si la llamada a HubSpot falla?** El cambio no se marca como aplicado y verás el mensaje de error. Corrige la causa y vuelve a intentarlo.

**Este es un tema sensible:** aplicar cambios en producción modifica el portal real de un cliente. Asegúrate del entorno activo antes de confirmar.
