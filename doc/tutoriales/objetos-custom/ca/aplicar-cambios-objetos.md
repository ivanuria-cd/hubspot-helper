# Aplicar canvis d'objectes a HubSpot

**Prerequisits:** tenir objectes personalitzats amb canvis pendents (creació, edició o arxivat).
**Temps estimat:** 3–5 minuts

L'app mai no escriu a HubSpot de manera automàtica. Els canvis s'acumulen com a **pendents** i els apliques tu, primer a **sandbox** per validar i després a **producció**.

## Passos

1. Obre **CRM → Objectes personalitzats**.
2. Prem **Canvis pendents** (mostra el nombre entre parèntesis) o obre el plafó d'un objecte concret.
3. Per cada canvi veuràs l'operació (crear / actualitzar schema / arxivar) i el seu estat per entorn.
4. Prem **Aplica al Sandbox**. Revisa al teu portal sandbox que l'objecte ha quedat com esperaves.
5. Quan n'estiguis conforme, prem **Aplica a Producció**.
6. Si un canvi ja no t'interessa, prem **Descarta**.

## Resultat esperat

- Després d'aplicar a sandbox, l'estat del canvi mostra «sandbox ✓».
- Després d'aplicar a producció, mostra «producció ✓».
- En crear, l'app desa l'identificador que HubSpot assigna **a cada entorn** (són diferents a sandbox i a producció).

## Preguntes freqüents

**Per què cal aplicar dues vegades (sandbox i producció)?** Per validar el canvi en un entorn segur abans de tocar producció. A més, HubSpot assigna identificadors diferents per portal, així que cada entorn es gestiona per separat.

**Em dona error en actualitzar o arxivar en un entorn.** Assegura't que l'objecte ja existeix en aquell entorn (s'hi ha d'haver creat primer). Si no, crea'l abans d'aplicar altres canvis.

**L'entorn actiu importa?** La sincronització llegeix de l'entorn actiu de HubSpot. Canvia l'entorn actiu des del connector si vols reconciliar contra l'altre portal.
