# Sincronitzar el mapa amb HubSpot

**Prerequisits:** connector de HubSpot configurat al projecte.
**Temps estimat:** 3 minuts

La sincronització compara la definició de propietats del projecte amb l'estat real del portal de HubSpot i classifica cada propietat segons el seu estat.

## Passos

1. Entra a **CRM → Propietats**.
2. Comprova a la barra superior de l'app quin entorn de HubSpot està actiu (producció o sandbox).
3. Prem **Sincronitza HubSpot**. L'app llegeix les propietats del portal mitjançant l'API de propietats de HubSpot.
4. En acabar veuràs un resum: quantes propietats estan al dia, quantes divergents i quantes sense crear.

## Entendre els estats

- **existeix** (distintiu verd llima): la propietat existeix a HubSpot i coincideix amb la definició del projecte.
- **divergeix** (distintiu gris): existeix però difereix (per exemple, etiqueta o opcions diferents). Genera canvis pendents.
- **falta** (distintiu gris fosc): no existeix a HubSpot. Genera un canvi pendent de creació.

## Resultat esperat

La taula mostra cada propietat amb el seu distintiu d'estat. Les propietats del portal que encara no eren al mapa s'importen com a `existeix`. El mapa actualitzat es bolca al Google Sheets del projecte.

## Preguntes freqüents

**La sincronització modifica HubSpot?** No. Només llegeix. Qualsevol canvi al portal es proposa com a canvi pendent i requereix la teva confirmació.

**Sobre quins objectes sincronitza?** Sobre els objectes presents al mapa; si està buit, sobre contacts, deals i companies per defecte.
