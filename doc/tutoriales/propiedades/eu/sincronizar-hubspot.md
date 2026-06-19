# Mapa HubSpot-ekin sinkronizatu

**Aurrebaldintzak:** HubSpot konektorea proiektuan konfiguratuta.
**Estimatutako denbora:** 3 minutu

Sinkronizazioak proiektuaren propietate-definizioa HubSpot atariaren benetako egoerarekin alderatzen du eta propietate bakoitza bere egoeraren arabera sailkatzen du.

## Urratsak

1. Sartu **CRM → Propietateak** atalean.
2. Egiaztatu aplikazioaren goiko barran zein HubSpot ingurune dagoen aktibo (produkzioa edo sandbox).
3. Sakatu **Sinkronizatu HubSpot**. Aplikazioak atariko propietateak irakurtzen ditu HubSpot-en propietate-API bidez.
4. Amaitzean laburpen bat ikusiko duzu: zenbat propietate dauden egunean, zenbat dibergente eta zenbat sortu gabe.

## Egoerak ulertu

- **exists** (badge lima berdea): propietatea HubSpot-en existitzen da eta proiektuaren definizioarekin bat dator.
- **divergent** (badge grisa): existitzen da baina desberdina da (adibidez, etiketa edo aukera desberdinak). Aldaketa zainak sortzen ditu.
- **missing** (badge gris iluna): ez da HubSpot-en existitzen. Sortze-aldaketa zain bat sortzen du.

## Espero den emaitza

Taulak propietate bakoitza erakusten du bere egoera-badge-arekin. Oraindik mapan ez zeuden atariko propietateak `exists` gisa inportatzen dira. Eguneratutako mapa proiektuaren Google Sheets-era isurtzen da.

## Ohiko galderak

**Sinkronizazioak HubSpot aldatzen al du?** Ez. Irakurri soilik egiten du. Atariko edozein aldaketa aldaketa zain gisa proposatzen da eta zure berrespena eskatzen du.

**Zein objektuen gainean sinkronizatzen du?** Mapan present dauden objektuen gainean; hutsik badago, contacts, deals eta companies-en gainean lehenetsita.
