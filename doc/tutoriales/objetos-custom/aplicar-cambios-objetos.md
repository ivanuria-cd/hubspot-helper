# Aplicar cambios de objetos en HubSpot

**Prerrequisitos:** tener objetos custom con cambios pendientes (creación, edición o archivado).
**Tiempo estimado:** 3–5 minutos

La app nunca escribe en HubSpot de forma automática. Los cambios se acumulan como **pendientes** y los aplicas tú, primero en **sandbox** para validar y luego en **producción**.

## Pasos

1. Abre **CRM → Objetos custom**.
2. Pulsa **Cambios pendientes** (muestra el número entre paréntesis) o abre el panel de un objeto concreto.
3. Por cada cambio verás la operación (crear / actualizar schema / archivar) y su estado por entorno.
4. Pulsa **Aplicar en Sandbox**. Revisa en tu portal sandbox que el objeto quedó como esperabas.
5. Cuando estés conforme, pulsa **Aplicar en Producción**.
6. Si un cambio ya no te interesa, pulsa **Descartar**.

## Resultado esperado

- Tras aplicar en sandbox, el estado del cambio muestra «sandbox ✓».
- Tras aplicar en producción, muestra «producción ✓».
- Al crear, la app guarda el identificador que HubSpot asigna **en cada entorno** (son distintos en sandbox y en producción).

## Preguntas frecuentes

**¿Por qué hay que aplicar dos veces (sandbox y producción)?** Para validar el cambio en un entorno seguro antes de tocar producción. Además, HubSpot asigna identificadores distintos por portal, así que cada entorno se gestiona por separado.

**Me da error al actualizar o archivar en un entorno.** Asegúrate de que el objeto ya existe en ese entorno (debe haberse creado allí primero). Si no, créalo antes de aplicar otros cambios.

**¿El entorno activo importa?** La sincronización lee del entorno activo de HubSpot. Cambia el entorno activo desde el conector si quieres reconciliar contra el otro portal.
