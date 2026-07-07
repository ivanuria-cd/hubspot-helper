# Crear i reimportar el mapa de camps de planificació

**Prerequisits:** tenir un projecte obert, el connector de Google Drive configurat amb una carpeta de treball i, per contrastar amb el portal, el connector de HubSpot. Convé tenir definits els orígens de dades i els seus camps.
**Temps estimat:** 10 minuts

El mapa de camps de planificació és un document de Google Sheets **editable** que genera l'aplicació perquè el client decideixi, sobre el mateix document, com es mapeja cada camp d'origen a una propietat de HubSpot. A diferència de l'arxiu d'estat, aquest document està pensat per omplir-se a mà: porta desplegables, una pestanya per objecte i fulls de catàleg per origen. Quan el client el retorna omplert, l'aplicació el rellegeix, et mostra un resum dels canvis i crea esborranys que després revises.

## Passos

1. Entra a **CRM → Propietats**.
2. Prem **Generar mapa de planificació**. L'aplicació crea (o actualitza) a la teva carpeta de Drive un Google Sheets amb:
   - un full **Llegenda** que explica les columnes i els estats;
   - una pestanya per objecte de HubSpot, amb el bloc HubSpot (Custom, Name, Internal name, Type…) i un bloc per cada origen aplicable (Field name, Origin, Comments);
   - un full **Origen …** per cada sistema d'origen, amb la propietat de destinació calculada;
   - un full **Associacions** (només informatiu).
3. Comparteix el document amb el client. A cada pestanya d'objecte pot omplir, amb els desplegables:
   - **Custom**: `No` (ja existeix), `Yes (Pending)` (a crear) o `Yes (Created)` (ja creada);
   - **Field name**: el camp de l'origen que alimenta la propietat;
   - **Origin**: `Migration` o `Integration`;
   - **Type**: el tipus del camp en llenguatge senzill (text, número, moneda, telèfon…).
4. Quan el document estigui omplert, torna a **CRM → Propietats** i prem **Importar planificació**.
5. Si hi ha canvis respecte al projecte, s'obre un **resum de canvis** (altes, baixes, canvis de mapeig o de tipus) i, si escau, la llista de **camps que necessiten acció**: són tipus ambigus (per exemple, «selecció», que pot ser desplegable, caselles o botons) que cal concretar. Encara no s'aplica res.
6. Revisa el resum i prem **Crear esborranys**. L'aplicació crea o actualitza les entrades del mapa. Els camps amb tipus sense resoldre queden **bloquejats** i no es creen fins que indiquis el tipus concret.
7. Les entrades queden com a esborranys al mapa. Revisa-les, sincronitza amb HubSpot i aplica els canvis amb el flux habitual (vegeu «Sincronitzar amb HubSpot» i «Aplicar canvis a HubSpot»).

## Resultat esperat

El document de planificació es genera a Drive amb els seus desplegables i, en reimportar-lo, l'aplicació et mostra què canvia abans de tocar res i crea les entrades com a esborranys. En cap moment s'apliquen canvis a HubSpot: això segueix requerint sincronitzar i aplicar de manera explícita.

## Preguntes freqüents

**S'aplica alguna cosa a HubSpot en importar?** No. La importació només crea o actualitza esborranys al mapa del projecte. Els canvis a HubSpot sempre passen per sincronitzar i aplicar per entorn.

**Què vol dir que un camp «necessita acció»?** Que el tipus triat en llenguatge senzill correspon a diverses configuracions de HubSpot i cal concretar quina. Fins que no es resol, aquest camp no es crea.

**El document està protegit?** No. És editable expressament, perquè l'ompli el client. L'arxiu d'estat del projecte sí que segueix sent el registre fidel i no es toca.

**Puc regenerar-lo?** Sí. Tornar a prémer «Generar mapa de planificació» actualitza el document existent.
