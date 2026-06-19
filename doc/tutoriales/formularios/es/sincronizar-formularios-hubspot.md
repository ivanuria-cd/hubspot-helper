# Sincronizar los cambios con HubSpot

**Prerrequisitos:** al menos un cambio pendiente de formularios (creado al crear un formulario o al añadir campos que faltan).
**Tiempo estimado:** 3 minutos

Ningún cambio se escribe en HubSpot automáticamente. Los cambios se acumulan como pendientes y los aplicas tú, pudiendo probar primero en sandbox y luego en producción.

## Pasos

1. Entra en **CRM → Formularios**.
2. Pulsa **Cambios pendientes (N)**.
3. Revisa cada cambio: su resumen, el tipo de operación y su estado por entorno.
4. Comprueba en la barra superior qué entorno está activo.
5. Pulsa **Aplicar en Sandbox** para probar el cambio sin tocar producción.
6. Cuando estés conforme, pulsa **Aplicar en Producción**.
7. Si un cambio ya no interesa, pulsa **Descartar**.

## Entender los estados

- **sandbox ✓ / ✕**: si el cambio se ha aplicado o no en sandbox.
- **producción ✓ / ✕**: si el cambio se ha aplicado o no en producción.

Un cambio no se considera completado hasta que se aplica en producción.

## Resultado esperado

Tras aplicar, el formulario se crea o actualiza en HubSpot en el entorno elegido y el cambio queda marcado para ese entorno.

## Preguntas frecuentes

**¿Qué pasa si falta el scope `forms`?** HubSpot devuelve un error de permisos (403) y la app te lo muestra; el cambio no se marca como aplicado.

**¿Puedo aplicar directo a producción?** Sí, pero se recomienda validar antes en sandbox.

**¿Se pueden borrar formularios desde la app?** No. El borrado de formularios queda fuera de alcance.
