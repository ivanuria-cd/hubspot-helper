# Crear un objecte personalitzat

**Prerequisits:** tenir configurat el connector de HubSpot (almenys un entorn) i haver obert un projecte.
**Temps estimat:** 5–10 minuts

Els objectes personalitzats et permeten representar a HubSpot entitats pròpies del teu negoci (màquines, contractes, vehicles…) que no encaixen als objectes estàndard. Aquesta pantalla crea la **definició** de l'objecte; els registres (instàncies) es gestionen després a HubSpot.

## Passos

1. Al menú lateral, dins de **CRM**, obre **Objectes personalitzats**.
2. Prem **Objecte personalitzat** per obrir l'assistent de creació.
3. **Identitat**:
   - **Nom intern**: identificador tècnic (només minúscules, números i guions baixos; comença per lletra). **No el podràs canviar després.**
   - **Etiqueta singular** i **Etiqueta plural**: com s'anomenarà l'objecte a la interfície (p. ex. «Màquina» / «Màquines»).
   - **Descripció** (opcional): per a què serveix l'objecte.
4. **Propietats inicials**: afegeix les propietats que tindrà l'objecte. Per cadascuna indica **Nom intern** (identificador tècnic), **Etiqueta**, **Tipus** i **Tipus de camp**. El **Tipus de camp** és un desplegable que s'ajusta automàticament al tipus triat (no has d'endevinar el valor). Marca **Únic** si aquesta propietat identifica de manera unívoca cada registre. Usa **Afegeix propietat** per sumar-ne més.
5. **Visualització** (els desplegables mostren l'**etiqueta** de cada propietat):
   - **Propietat principal**: la propietat que dona nom a cada registre (obligatòria).
   - **Requerides**, **Secundàries** i **Cerca**: selecciona, entre les propietats definides, quines són obligatòries, quines es mostren sota el nom i quines s'indexen per cercar.
6. **Associacions** (opcional): tria amb quins objectes (contactes, empreses, altres custom) es podrà relacionar.
7. Prem **Desa**. L'objecte s'afegeix com a **esborrany** amb un canvi pendent de tipus «crear».

## Resultat esperat

L'objecte apareix a la llista amb estat **esborrany** (✕). Encara no existeix a HubSpot: per crear-lo, ves als seus canvis pendents i aplica'l primer a sandbox i després a producció (vegeu «Aplicar canvis d'objectes a HubSpot»).

## Preguntes freqüents

**Per què no puc canviar el nom intern després?** És una restricció de HubSpot: el nom és immutable un cop creat l'objecte. Les etiquetes sí que es poden canviar.

**He de crear totes les propietats aquí?** No. Pots crear l'objecte amb les mínimes i afegir més propietats després des de la pantalla de **Propietats**.
