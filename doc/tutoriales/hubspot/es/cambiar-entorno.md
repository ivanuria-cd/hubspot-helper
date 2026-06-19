# Configurar y cambiar entre Producción y Sandbox

**Prerrequisitos:** tener el conector HubSpot configurado en al menos un entorno (ver *Conectar la app con HubSpot*).
**Tiempo estimado:** 3 minutos.

Cada proyecto admite dos entornos independientes de HubSpot: **Producción** y **Sandbox**, cada uno con su propio token y portal. El entorno activo es el destino de todas las operaciones de escritura.

## Pasos

### Configurar el entorno sandbox

1. Abre tu proyecto → **Configuración → Conectores → HubSpot**.
2. Selecciona la pestaña **Sandbox**.
3. Pega el token de tu portal sandbox y pulsa **Guardar**.

### Cambiar el entorno activo

1. En la misma pantalla, selecciona la pestaña del entorno que quieres activar.
2. Si está conectado y no es el activo, pulsa **Usar como entorno activo**.

El entorno activo se muestra de forma permanente como una etiqueta en la barra superior (**PROD** o **SANDBOX**), visible desde cualquier pantalla.

## Resultado esperado

- La etiqueta de la barra superior refleja el entorno activo.
- Las operaciones de lectura pueden ejecutarse contra cualquier entorno configurado.
- Las operaciones de escritura usan siempre el entorno activo y muestran confirmación indicando el destino.

## Preguntas frecuentes

**¿Para qué sirve el sandbox?** Para probar automatizaciones y cambios sin tocar datos reales. Configura primero en sandbox, valida, y luego replica en producción.

**¿Puedo tener solo producción?** Sí. El entorno sandbox es opcional; si no lo configuras, la app trabaja únicamente con producción.

**Cambié de entorno por error.** Vuelve a la pantalla del conector, selecciona el entorno correcto y pulsa **Usar como entorno activo**. El cambio es inmediato.
