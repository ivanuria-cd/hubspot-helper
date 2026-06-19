# Aplicar canvis a HubSpot

**Prerequisits:** haver sincronitzat el mapa i tenir canvis pendents. Per validar a sandbox, tenir configurat aquell entorn al connector de HubSpot.
**Temps estimat:** 5 minuts

L'app mai no escriu a HubSpot de manera automàtica. Els canvis necessaris (crear propietats, ajustar etiquetes, opcions o tipus) es presenten com una llista que tu revises i apliques explícitament. La recomanació és aplicar primer a **sandbox**, validar, i només després a **producció**.

## Passos

1. Entra a **CRM → Propietats**.
2. Prem **Canvis pendents (n)** per obrir la vista de canvis. Cada targeta mostra la propietat, l'operació i la crida d'API corresponent.
3. Per a cada canvi:
   - Prem **Aplica a Sandbox** per executar-lo a l'entorn de proves. En acabar amb èxit, l'estat passa a `sandbox ✓`.
   - Valida al teu sandbox de HubSpot que el resultat és l'esperat.
   - Prem **Aplica a Producció** per executar-lo al portal real. L'estat passa a `producció ✓`.
4. Si un canvi no escau, prem **Descarta** per retirar-lo de la llista.

## Resultat esperat

Cada canvi reflecteix el seu estat per entorn (sandbox i producció). Un canvi no es considera completat fins que s'ha aplicat a producció.

## Preguntes freqüents

**Puc aplicar directament a producció sense passar per sandbox?** Sí, però no és el recomanat. Validar a sandbox redueix el risc d'errors al portal real.

**Què passa si la crida a HubSpot falla?** El canvi no es marca com a aplicat i veuràs el missatge d'error. Corregeix la causa i torna a intentar-ho.

**Aquest és un tema sensible:** aplicar canvis a producció modifica el portal real d'un client. Assegura't de l'entorn actiu abans de confirmar.
