# Gestionar orígenes de datos

**Prerrequisitos:** tener un proyecto abierto.
**Tiempo estimado:** 5 minutos

Un **origen** representa de dónde proceden los datos de una propiedad: una integración, una migración puntual, la introducción manual por usuarios, o un workflow de HubSpot. Definir bien los orígenes te permite documentar el mapa de propiedades y exportar contratos de integración por origen.

## Pasos

1. En el menú lateral, entra en **CRM → Propiedades**.
2. Pulsa el botón **Orígenes (n)** de la barra superior. Se abre la ventana «Gestionar orígenes».
3. Verás la lista de orígenes existentes. Para crear uno nuevo, rellena el formulario inferior:
   - **Nombre**: un nombre descriptivo, por ejemplo «Migración Salesforce Q1».
   - **Tipo**: elige entre Integración, Migración, Usuario o Workflow.
   - **Descripción** (opcional): contexto adicional.
4. Pulsa **Añadir origen**. El origen aparece en la lista al instante.
5. Para eliminar un origen, pulsa el icono de papelera junto a él. Al eliminarlo se borran también sus mapeos con propiedades.
6. Cierra la ventana con **Cerrar**.

## Cuándo usar cada tipo

- **Integración**: el dato llega de un sistema conectado de forma continua (por ejemplo, un ERP sincronizado).
- **Migración**: el dato se cargó una vez desde otro sistema (por ejemplo, al migrar desde Salesforce).
- **Usuario**: lo introducen personas manualmente en HubSpot.
- **Workflow**: lo calcula o asigna un workflow de HubSpot.

## Resultado esperado

Los orígenes quedan guardados en el proyecto y se reflejan en la hoja `01_Origenes` del Google Sheets del mapa de propiedades. A partir de ahora puedes asociarlos a propiedades.

## Preguntas frecuentes

**¿Puedo cambiar el tipo de un origen después?** Sí, los campos Nombre, Tipo y Descripción son editables.

**¿Qué pasa con las propiedades mapeadas si elimino el origen?** Se eliminan los mapeos de ese origen, pero las propiedades permanecen.
