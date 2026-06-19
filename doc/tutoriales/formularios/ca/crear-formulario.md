# Crear un formulari nou (només camps)

**Prerequisits:** com a mínim un origen i les seves entrades de propietats definides a **CRM → Propietats**.
**Temps estimat:** 4 minuts

L'assistent crea un formulari de HubSpot definint únicament els seus camps a partir d'un origen. No edita estils, passos, lògica condicional ni consentiment legal (això es gestiona a HubSpot).

## Passos

1. Entra a **CRM → Formularis** i prem **Formulari**.
2. Escriu el **nom** del formulari.
3. Tria l'**objecte** de HubSpot (estàndard o custom existent).
4. Marca un o diversos **orígens**. L'app preselecciona els camps que aquests orígens defineixen per a l'objecte.
5. Ajusta la llista de camps: marca o desmarca cadascun i edita'n l'etiqueta i els indicadors **obligatori**/**ocult**.
6. Prem **Crea**. Es genera un **canvi pendent** de tipus «crear formulari» (encara no s'escriu a HubSpot).
7. Aplica el canvi des de **Canvis pendents** (vegeu «Sincronitzar els canvis amb HubSpot»).

## Resultat esperat

Apareix un canvi pendent «Crear formulari «…»». En aplicar-lo, el formulari es crea a HubSpot amb tipus `hubspot` i queda associat automàticament als orígens triats.

## Preguntes freqüents

**Per què només camps?** L'abast de l'app és l'estructura de camps i la seva relació amb els orígens; el disseny i la lògica del formulari es mantenen a HubSpot.

**Quin tipus de camp s'usa?** El que correspon al tipus de la propietat d'origen (per exemple, desplegable per a una propietat d'opcions); la propietat `email` de contacte usa el camp d'email.
