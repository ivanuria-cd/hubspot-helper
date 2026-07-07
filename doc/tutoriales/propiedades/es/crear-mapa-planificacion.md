# Crear y reimportar el mapa de campos de planificación

**Prerrequisitos:** tener un proyecto abierto, el conector de Google Drive configurado con una carpeta de trabajo y, para contrastar con el portal, el conector de HubSpot. Conviene tener definidos los orígenes de datos y sus campos.
**Tiempo estimado:** 10 minutos

El mapa de campos de planificación es un documento de Google Sheets **editable** que genera la aplicación para que el cliente decida, sobre el propio documento, cómo se mapea cada campo de origen a una propiedad de HubSpot. A diferencia del archivo de estado, este documento está pensado para rellenarse a mano: lleva desplegables, una pestaña por objeto y hojas de catálogo por origen. Cuando el cliente lo devuelve relleno, la aplicación lo relee, te muestra un resumen de los cambios y crea borradores que después revisas.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Pulsa **Generar mapa de planificación**. La aplicación crea (o actualiza) en tu carpeta de Drive un Google Sheets con:
   - una hoja **Leyenda** que explica las columnas y los estados;
   - una pestaña por objeto de HubSpot, con el bloque HubSpot (Custom, Name, Internal name, Type…) y un bloque por cada origen aplicable (Field name, Origin, Comments);
   - una hoja **Origen …** por cada sistema de origen, con la propiedad de destino calculada;
   - una hoja **Asociaciones** (solo informativa).
3. Comparte el documento con el cliente. En cada pestaña de objeto puede rellenar, con los desplegables:
   - **Custom**: `No` (ya existe), `Yes (Pending)` (a crear) o `Yes (Created)` (ya creada);
   - **Field name**: el campo del origen que alimenta la propiedad;
   - **Origin**: `Migration` o `Integration`;
   - **Type**: el tipo del campo en lenguaje sencillo (texto, número, moneda, teléfono…).
4. Cuando el documento esté relleno, vuelve a **CRM → Propiedades** y pulsa **Importar planificación**.
5. Si hay cambios respecto al proyecto, se abre un **resumen de cambios** (altas, bajas, cambios de mapeo o de tipo) y, en su caso, la lista de **campos que necesitan acción**: son tipos ambiguos (por ejemplo, «selección», que puede ser desplegable, casillas o botones) que hay que concretar. Nada se aplica todavía.
6. Revisa el resumen y pulsa **Crear borradores**. La aplicación crea o actualiza las entradas del mapa. Los campos con tipo sin resolver quedan **bloqueados** y no se crean hasta que indiques el tipo concreto.
7. Las entradas quedan como borradores en el mapa. Revísalas, sincroniza con HubSpot y aplica los cambios con el flujo habitual (ver «Sincronizar con HubSpot» y «Aplicar cambios en HubSpot»).

## Resultado esperado

El documento de planificación se genera en Drive con sus desplegables y, al reimportarlo, la aplicación te muestra qué cambia antes de tocar nada y crea las entradas como borradores. En ningún momento se aplican cambios en HubSpot: eso sigue requiriendo sincronizar y aplicar de forma explícita.

## Preguntas frecuentes

**¿Se aplica algo en HubSpot al importar?** No. La importación solo crea o actualiza borradores en el mapa del proyecto. Los cambios en HubSpot siempre pasan por sincronizar y aplicar por entorno.

**¿Qué significa que un campo «necesita acción»?** Que el tipo elegido en lenguaje sencillo corresponde a varias configuraciones de HubSpot y hay que concretar cuál. Hasta que se resuelva, ese campo no se crea.

**¿El documento está protegido?** No. Es editable a propósito, para que lo rellene el cliente. El archivo de estado del proyecto sí sigue siendo el registro fiel y no se toca.

**¿Puedo regenerarlo?** Sí. Volver a pulsar «Generar mapa de planificación» actualiza el documento existente.
