# Engadir unha propiedade ao mapa

**Prerrequisitos:** ter un proxecto aberto. Para que a propiedade se contraste con HubSpot, convén ter o conector de HubSpot configurado.
**Tempo estimado:** 5 minutos

O mapa de propiedades é a listaxe mestra das propiedades do proxecto e a súa definición prevista en HubSpot. Podes incorporar propiedades de dúas formas: importándoas desde HubSpot ao sincronizar, ou engadíndoas manualmente cando aínda non existen no portal.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Preme **Propiedade** (botón da barra de accións). Ábrese o diálogo «Engadir propiedade».
3. Cobre os campos:
   - **Nome técnico (HubSpot)**: o nome interno da propiedade, por exemplo `custom_tier`.
   - **Etiqueta**: o nome lexible que verán os usuarios.
   - **Obxecto**: a que obxecto pertence (contacts, deals ou companies).
   - **Tipo**: o tipo de dato (texto, número, data, enumeración, etc.).
   - **Tipo de campo**: como se introduce (text, select, checkbox…).
   - **Grupo**: o grupo de propiedades de HubSpot onde vivirá.
   - **Descrición** (opcional).
4. Preme **Crear**. A propiedade aparece na táboa con estado **missing** (aínda non existe en HubSpot).
5. Fai clic sobre a fila para abrir o panel lateral e asociarlle orixes (ver o tutorial «Mapear orixes e transformacións»).

## Resultado esperado

A propiedade queda no mapa con estado `missing`. Ao sincronizar con HubSpot xerarase un cambio pendente de tipo «Crear propiedade» que poderás revisar e aplicar.

## Preguntas frecuentes

**Crear a propiedade aquí créaa en HubSpot?** Non. A app nunca escribe en HubSpot automaticamente. Crear a propiedade no portal require aplicar o cambio pendente de forma explícita.

**Podo editar unha propiedade importada de HubSpot?** Podes editar a súa etiqueta e descrición; o resto de campos reflicten o estado real do portal.
