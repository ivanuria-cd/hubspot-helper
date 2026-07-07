# Crear e reimportar o mapa de campos de planificación

**Prerrequisitos:** ter un proxecto aberto, o conector de Google Drive configurado cunha carpeta de traballo e, para contrastar co portal, o conector de HubSpot. Convén ter definidos os orixes de datos e os seus campos.
**Tempo estimado:** 10 minutos

O mapa de campos de planificación é un documento de Google Sheets **editable** que xera a aplicación para que o cliente decida, sobre o propio documento, como se mapea cada campo de orixe a unha propiedade de HubSpot. A diferenza do arquivo de estado, este documento está pensado para encherse a man: leva despregables, unha pestana por obxecto e follas de catálogo por orixe. Cando o cliente o devolve cheo, a aplicación reléao, amósache un resumo dos cambios e crea borradores que despois revisas.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Preme **Xerar mapa de planificación**. A aplicación crea (ou actualiza) na túa carpeta de Drive un Google Sheets con:
   - unha folla **Lenda** que explica as columnas e os estados;
   - unha pestana por obxecto de HubSpot, co bloque HubSpot (Custom, Name, Internal name, Type…) e un bloque por cada orixe aplicable (Field name, Origin, Comments);
   - unha folla **Orixe …** por cada sistema de orixe, coa propiedade de destino calculada;
   - unha folla **Asociacións** (só informativa).
3. Comparte o documento co cliente. En cada pestana de obxecto pode encher, cos despregables:
   - **Custom**: `No` (xa existe), `Yes (Pending)` (a crear) ou `Yes (Created)` (xa creada);
   - **Field name**: o campo da orixe que alimenta a propiedade;
   - **Origin**: `Migration` ou `Integration`;
   - **Type**: o tipo do campo en linguaxe sinxela (texto, número, moeda, teléfono…).
4. Cando o documento estea cheo, volve a **CRM → Propiedades** e preme **Importar planificación**.
5. Se hai cambios respecto ao proxecto, ábrese un **resumo de cambios** (altas, baixas, cambios de mapeo ou de tipo) e, de ser o caso, a lista de **campos que precisan acción**: son tipos ambiguos (por exemplo, «selección», que pode ser despregable, caixas ou botóns) que hai que concretar. Aínda non se aplica nada.
6. Revisa o resumo e preme **Crear borradores**. A aplicación crea ou actualiza as entradas do mapa. Os campos con tipo sen resolver quedan **bloqueados** e non se crean ata que indiques o tipo concreto.
7. As entradas quedan como borradores no mapa. Revísaas, sincroniza con HubSpot e aplica os cambios co fluxo habitual (ver «Sincronizar con HubSpot» e «Aplicar cambios en HubSpot»).

## Resultado esperado

O documento de planificación xérase en Drive cos seus despregables e, ao reimportalo, a aplicación amósache que cambia antes de tocar nada e crea as entradas como borradores. En ningún momento se aplican cambios en HubSpot: iso segue requirindo sincronizar e aplicar de forma explícita.

## Preguntas frecuentes

**Aplícase algo en HubSpot ao importar?** Non. A importación só crea ou actualiza borradores no mapa do proxecto. Os cambios en HubSpot sempre pasan por sincronizar e aplicar por contorno.

**Que significa que un campo «precisa acción»?** Que o tipo elixido en linguaxe sinxela corresponde a varias configuracións de HubSpot e hai que concretar cal. Ata que non se resolve, ese campo non se crea.

**O documento está protexido?** Non. É editable a propósito, para que o encha o cliente. O arquivo de estado do proxecto si segue sendo o rexistro fiel e non se toca.

**Podo rexeneralo?** Si. Volver a premer «Xerar mapa de planificación» actualiza o documento existente.
