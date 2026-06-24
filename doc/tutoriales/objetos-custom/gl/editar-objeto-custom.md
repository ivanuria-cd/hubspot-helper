# Editar un obxecto custom

**Prerrequisitos:** ter polo menos un obxecto custom creado ou en borrador.
**Tempo estimado:** 3–5 minutos

Podes axustar as etiquetas, as propiedades de visualización, as requiridas e as asociacións dun obxecto. O **nome interno non se pode cambiar**.

## Pasos

1. Abre **CRM → Obxectos custom**.
2. Fai clic no obxecto que queiras modificar para abrir o seu panel de detalle.
3. Preme **Editar**: ábrese o asistente cos datos actuais.
4. Cambia o que necesites:
   - Etiquetas (singular/plural) e descrición.
   - Propiedade principal, secundarias, requiridas e de busca.
   - Asociacións con outros obxectos.
   - O campo **Nome interno** aparece bloqueado.
5. Preme **Gardar**. Se o obxecto xa existe en HubSpot e a definición difire, xerarase un cambio pendente de tipo «actualizar schema».

## Resultado esperado

Se hai diferenzas con HubSpot, o obxecto pasa a estado **diverge** (⚠) e aparece un cambio pendente. Aplícao en sandbox e produción para sincronizar.

## Preguntas frecuentes

**Quero engadir unha propiedade nova e marcala como requirida.** Primeiro debe existir a propiedade en HubSpot. Créaa desde a pantalla de **Propiedades** (ou inclúea ao crear o obxecto) e logo, na edición, márcaa como requirida ou de visualización. HubSpot non permite referenciar unha propiedade que aínda non existe.

**Podo cambiar o tipo dunha propiedade existente?** Non desde aquí: a edición do schema non cambia tipos de propiedades xa creadas.
