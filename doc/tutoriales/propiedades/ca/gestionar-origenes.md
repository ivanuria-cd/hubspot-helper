# Gestionar orígens de dades

**Prerequisits:** tenir un projecte obert.
**Temps estimat:** 5 minuts

Un **origen** representa d'on procedeixen les dades d'una propietat: una integració, una migració puntual, la introducció manual per part dels usuaris, o un workflow de HubSpot. Definir bé els orígens et permet documentar el mapa de propietats i exportar contractes d'integració per origen.

## Passos

1. Al menú lateral, entra a **CRM → Propietats**.
2. Prem el botó **Orígens (n)** de la barra superior. S'obre la finestra «Gestiona orígens».
3. Veuràs la llista d'orígens existents. Per crear-ne un de nou, emplena el formulari inferior:
   - **Nom**: un nom descriptiu, per exemple «Migració Salesforce Q1».
   - **Tipus**: tria entre Integració, Migració, Usuari o Workflow.
   - **Descripció** (opcional): context addicional.
4. Prem **Afegeix origen**. L'origen apareix a la llista a l'instant.
5. Per eliminar un origen, prem la icona de paperera al seu costat. En eliminar-lo s'esborren també els seus mapejos amb propietats.
6. Tanca la finestra amb **Tanca**.

## Quan usar cada tipus

- **Integració**: la dada arriba d'un sistema connectat de manera contínua (per exemple, un ERP sincronitzat).
- **Migració**: la dada es va carregar un cop des d'un altre sistema (per exemple, en migrar des de Salesforce).
- **Usuari**: la introdueixen persones manualment a HubSpot.
- **Workflow**: la calcula o assigna un workflow de HubSpot.

## Resultat esperat

Els orígens queden desats al projecte i es reflecteixen al full `01_Origenes` del Google Sheets del mapa de propietats. A partir d'ara pots associar-los a propietats.

## Preguntes freqüents

**Puc canviar el tipus d'un origen després?** Sí, els camps Nom, Tipus i Descripció són editables.

**Què passa amb les propietats mapejades si elimino l'origen?** S'eliminen els mapejos d'aquell origen, però les propietats es mantenen.
