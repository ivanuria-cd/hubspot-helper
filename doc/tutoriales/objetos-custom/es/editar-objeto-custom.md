# Editar un objeto custom

**Prerrequisitos:** tener al menos un objeto custom creado o en borrador.
**Tiempo estimado:** 3–5 minutos

Puedes ajustar las etiquetas, las propiedades de visualización, las requeridas y las asociaciones de un objeto. El **nombre interno no se puede cambiar**.

## Pasos

1. Abre **CRM → Objetos custom**.
2. Haz clic en el objeto que quieras modificar para abrir su panel de detalle.
3. Pulsa **Editar**: se abre el asistente con los datos actuales.
4. Cambia lo que necesites:
   - Etiquetas (singular/plural) y descripción.
   - Propiedad principal, secundarias, requeridas y de búsqueda.
   - Asociaciones con otros objetos.
   - El campo **Nombre interno** aparece bloqueado.
5. Pulsa **Guardar**. Si el objeto ya existe en HubSpot y la definición difiere, se generará un cambio pendiente de tipo «actualizar schema».

## Resultado esperado

Si hay diferencias con HubSpot, el objeto pasa a estado **diverge** (⚠) y aparece un cambio pendiente. Aplícalo en sandbox y producción para sincronizar.

## Preguntas frecuentes

**Quiero añadir una propiedad nueva y marcarla como requerida.** Primero debe existir la propiedad en HubSpot. Créala desde la pantalla de **Propiedades** (o inclúyela al crear el objeto) y luego, en la edición, márcala como requerida o de visualización. HubSpot no permite referenciar una propiedad que aún no existe.

**¿Puedo cambiar el tipo de una propiedad existente?** No desde aquí: la edición del schema no cambia tipos de propiedades ya creadas.
