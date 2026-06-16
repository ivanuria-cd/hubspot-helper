# Archivar un objeto custom

**Prerrequisitos:** tener un objeto custom creado en HubSpot.
**Tiempo estimado:** 3 minutos

Archivar elimina la definición del objeto en HubSpot. Es una acción destructiva, por eso requiere doble confirmación.

## Pasos

1. Abre **CRM → Objetos custom** y haz clic en el objeto.
2. En el panel de detalle, pulsa **Archivar**. El botón pedirá una segunda confirmación («Confirmar archivado»).
3. Confirma. Se genera un cambio pendiente de tipo «archivar».
4. Aplica el cambio en el entorno correspondiente (sandbox o producción).

## Resultado esperado

El objeto pasa a estado **archivado** una vez aplicado. Si HubSpot rechaza la operación, verás el mensaje de error real (normalmente porque el objeto aún tiene registros, asociaciones o propiedades).

## Preguntas frecuentes

**HubSpot me da error al archivar.** HubSpot solo permite archivar un objeto cuando se han eliminado antes todos sus registros, asociaciones y propiedades. Elimínalos en HubSpot y vuelve a aplicar.

**¿Diferencia entre archivar y borrar definitivamente (hard delete)?** Archivar retira el objeto pero conserva su nombre reservado. El borrado definitivo (que libera el nombre para reutilizarlo) **no está disponible** desde la app en esta versión; hazlo desde HubSpot si lo necesitas.

**¿Puedo recuperar un objeto archivado?** La recuperación se gestiona desde HubSpot según sus políticas; la app no la realiza.
