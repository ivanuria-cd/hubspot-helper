# Añadir una propiedad al mapa

**Prerrequisitos:** tener un proyecto abierto. Para que la propiedad se contraste con HubSpot, conviene tener el conector de HubSpot configurado.
**Tiempo estimado:** 5 minutos

El mapa de propiedades es el listado maestro de las propiedades del proyecto y su definición prevista en HubSpot. Puedes incorporar propiedades de dos formas: importándolas desde HubSpot al sincronizar, o añadiéndolas manualmente cuando aún no existen en el portal.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Pulsa **Propiedad** (botón de la barra de acciones). Se abre el diálogo «Añadir propiedad».
3. Rellena los campos:
   - **Nombre técnico (HubSpot)**: el nombre interno de la propiedad, por ejemplo `custom_tier`.
   - **Etiqueta**: el nombre legible que verán los usuarios.
   - **Objeto**: a qué objeto pertenece (contacts, deals o companies).
   - **Tipo**: el tipo de dato (texto, número, fecha, enumeración, etc.).
   - **Tipo de campo**: cómo se introduce (text, select, checkbox…).
   - **Grupo**: el grupo de propiedades de HubSpot donde vivirá.
   - **Descripción** (opcional).
4. Pulsa **Crear**. La propiedad aparece en la tabla con estado **missing** (todavía no existe en HubSpot).
5. Haz clic sobre la fila para abrir el panel lateral y asociarle orígenes (ver el tutorial «Mapear orígenes y transformaciones»).

## Resultado esperado

La propiedad queda en el mapa con estado `missing`. Al sincronizar con HubSpot se generará un cambio pendiente de tipo «Crear propiedad» que podrás revisar y aplicar.

## Preguntas frecuentes

**¿Crear la propiedad aquí la crea en HubSpot?** No. La app nunca escribe en HubSpot automáticamente. Crear la propiedad en el portal requiere aplicar el cambio pendiente de forma explícita.

**¿Puedo editar una propiedad importada de HubSpot?** Puedes editar su etiqueta y descripción; el resto de campos reflejan el estado real del portal.
