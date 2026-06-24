# Mapear orixes e transformacións

**Prerrequisitos:** ter polo menos unha propiedade no mapa e unha orixe creada.
**Tempo estimado:** 7 minutos

Un mapeo conecta unha propiedade cunha orixe de datos, indicando de que campo do sistema de orixe procede e que transformacións de valores hai que aplicar para que encaixen en HubSpot.

## Pasos

1. Entra en **CRM → Propiedades** e fai clic sobre a propiedade que queiras mapear. Ábrese o panel lateral.
2. Na sección **Orixes mapeadas**, preme **Engadir orixe**.
3. No diálogo «Mapear orixe»:
   - **Orixe**: elixe a orixe de datos.
   - **Campo orixe**: o nome do campo no sistema de orixe, por exemplo `Account_Tier__c`.
   - **Transformacións**: preme **Engadir regra** por cada equivalencia de valor. Á esquerda o valor tal como chega da orixe, á dereita o valor válido en HubSpot. Por exemplo `GOLD → enterprise`.
   - **Notas** (opcional): calquera aclaración para o equipo.
4. Preme **Gardar**. O mapeo aparece no panel e na columna «Orixes» da táboa.
5. Para editar ou eliminar un mapeo, usa as iconas de lapis e papeleira xunto a el no panel.

## Resultado esperado

O mapeo queda gardado e reflíctese na folla `03_Mapeo_Origenes` do Google Sheets. As transformacións almacénanse como pares valor orixe → valor HubSpot, listas para exportarse no contrato JSON da orixe.

## Preguntas frecuentes

**Podo definir lóxica complexa nas transformacións?** Non. Por seguridade só se admiten equivalencias de valor (mapeos), nunca scripts.

**Unha propiedade pode ter varias orixes?** Si. Engade un mapeo por cada orixe que alimente esa propiedade.
