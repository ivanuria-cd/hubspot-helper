# Mapear orígenes y transformaciones

**Prerrequisitos:** tener al menos una propiedad en el mapa y un origen creado.
**Tiempo estimado:** 7 minutos

Un mapeo conecta una propiedad con un origen de datos, indicando de qué campo del sistema de origen procede y qué transformaciones de valores hay que aplicar para que encajen en HubSpot.

## Pasos

1. Entra en **CRM → Propiedades** y haz clic sobre la propiedad que quieras mapear. Se abre el panel lateral.
2. En la sección **Orígenes mapeados**, pulsa **Añadir origen**.
3. En el diálogo «Mapear origen»:
   - **Origen**: elige el origen de datos.
   - **Campo origen**: el nombre del campo en el sistema de origen, por ejemplo `Account_Tier__c`.
   - **Transformaciones**: pulsa **Añadir regla** por cada equivalencia de valor. A la izquierda el valor tal como llega del origen, a la derecha el valor válido en HubSpot. Por ejemplo `GOLD → enterprise`.
   - **Notas** (opcional): cualquier aclaración para el equipo.
4. Pulsa **Guardar**. El mapeo aparece en el panel y en la columna «Orígenes» de la tabla.
5. Para editar o eliminar un mapeo, usa los iconos de lápiz y papelera junto a él en el panel.

## Resultado esperado

El mapeo queda guardado y se refleja en la hoja `03_Mapeo_Origenes` del Google Sheets. Las transformaciones se almacenan como pares valor origen → valor HubSpot, listas para exportarse en el contrato JSON del origen.

## Preguntas frecuentes

**¿Puedo definir lógica compleja en las transformaciones?** No. Por seguridad solo se admiten equivalencias de valor (mapeos), nunca scripts.

**¿Una propiedad puede tener varios orígenes?** Sí. Añade un mapeo por cada origen que alimente esa propiedad.
