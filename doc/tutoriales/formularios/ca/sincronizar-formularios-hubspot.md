# Sincronitzar els canvis amb HubSpot

**Prerequisits:** com a mínim un canvi pendent de formularis (creat en crear un formulari o en afegir camps que falten).
**Temps estimat:** 3 minuts

Cap canvi s'escriu a HubSpot automàticament. Els canvis s'acumulen com a pendents i els apliques tu, podent provar primer a sandbox i després a producció.

## Passos

1. Entra a **CRM → Formularis**.
2. Prem **Canvis pendents (N)**.
3. Revisa cada canvi: el seu resum, el tipus d'operació i el seu estat per entorn.
4. Comprova a la barra superior quin entorn està actiu.
5. Prem **Aplica a Sandbox** per provar el canvi sense tocar producció.
6. Quan n'estiguis conforme, prem **Aplica a Producció**.
7. Si un canvi ja no interessa, prem **Descarta**.

## Entendre els estats

- **sandbox ✓ / ✕**: si el canvi s'ha aplicat o no a sandbox.
- **producció ✓ / ✕**: si el canvi s'ha aplicat o no a producció.

Un canvi no es considera completat fins que s'aplica a producció.

## Resultat esperat

Després d'aplicar, el formulari es crea o s'actualitza a HubSpot a l'entorn triat i el canvi queda marcat per a aquell entorn.

## Preguntes freqüents

**Què passa si falta l'scope `forms`?** HubSpot retorna un error de permisos (403) i l'app te'l mostra; el canvi no es marca com a aplicat.

**Puc aplicar directament a producció?** Sí, però es recomana validar abans a sandbox.

**Es poden esborrar formularis des de l'app?** No. L'esborrat de formularis queda fora d'abast.
