# Configurar i canviar entre Producció i Sandbox

**Prerequisits:** tenir el connector HubSpot configurat en almenys un entorn (vegeu *Connectar l'app amb HubSpot*).
**Temps estimat:** 3 minuts.

Cada projecte admet dos entorns independents de HubSpot: **Producció** i **Sandbox**, cadascun amb el seu propi token i portal. L'entorn actiu és el destí de totes les operacions d'escriptura.

## Passos

### Configurar l'entorn sandbox

1. Obre el teu projecte → **Configuració → Connectors → HubSpot**.
2. Selecciona la pestanya **Sandbox**.
3. Enganxa el token del teu portal sandbox i prem **Desa**.

### Canviar l'entorn actiu

1. A la mateixa pantalla, selecciona la pestanya de l'entorn que vols activar.
2. Si està connectat i no és l'actiu, prem **Usa com a entorn actiu**.

L'entorn actiu es mostra de manera permanent com una etiqueta a la barra superior (**PROD** o **SANDBOX**), visible des de qualsevol pantalla.

## Resultat esperat

- L'etiqueta de la barra superior reflecteix l'entorn actiu.
- Les operacions de lectura es poden executar contra qualsevol entorn configurat.
- Les operacions d'escriptura usen sempre l'entorn actiu i mostren confirmació indicant el destí.

## Preguntes freqüents

**Per a què serveix el sandbox?** Per provar automatitzacions i canvis sense tocar dades reals. Configura primer a sandbox, valida, i després replica a producció.

**Puc tenir només producció?** Sí. L'entorn sandbox és opcional; si no el configures, l'app treballa únicament amb producció.

**He canviat d'entorn per error.** Torna a la pantalla del connector, selecciona l'entorn correcte i prem **Usa com a entorn actiu**. El canvi és immediat.
