# Xestionar orixes de datos

**Prerrequisitos:** ter un proxecto aberto.
**Tempo estimado:** 5 minutos

Unha **orixe** representa de onde proceden os datos dunha propiedade: unha integración, unha migración puntual, a introdución manual por usuarios, ou un workflow de HubSpot. Definir ben as orixes permíteche documentar o mapa de propiedades e exportar contratos de integración por orixe.

## Pasos

1. No menú lateral, entra en **CRM → Propiedades**.
2. Preme o botón **Orixes (n)** da barra superior. Ábrese a xanela «Xestionar orixes».
3. Verás a lista de orixes existentes. Para crear unha nova, cobre o formulario inferior:
   - **Nome**: un nome descritivo, por exemplo «Migración Salesforce Q1».
   - **Tipo**: elixe entre Integración, Migración, Usuario ou Workflow.
   - **Descrición** (opcional): contexto adicional.
4. Preme **Engadir orixe**. A orixe aparece na lista ao instante.
5. Para eliminar unha orixe, preme a icona de papeleira xunto a ela. Ao eliminala bórranse tamén os seus mapeos con propiedades.
6. Pecha a xanela con **Pechar**.

## Cando usar cada tipo

- **Integración**: o dato chega dun sistema conectado de forma continua (por exemplo, un ERP sincronizado).
- **Migración**: o dato cargouse unha vez desde outro sistema (por exemplo, ao migrar desde Salesforce).
- **Usuario**: introdúceno persoas manualmente en HubSpot.
- **Workflow**: calcúlao ou asígnao un workflow de HubSpot.

## Resultado esperado

As orixes quedan gardadas no proxecto e reflíctense na folla `01_Origenes` do Google Sheets do mapa de propiedades. A partir de agora podes asocialas a propiedades.

## Preguntas frecuentes

**Podo cambiar o tipo dunha orixe despois?** Si, os campos Nome, Tipo e Descrición son editables.

**Que pasa coas propiedades mapeadas se elimino a orixe?** Elimínanse os mapeos desa orixe, pero as propiedades permanecen.
