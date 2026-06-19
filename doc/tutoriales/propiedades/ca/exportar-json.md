# Exportar JSON per origen

**Prerequisits:** tenir com a mínim un origen amb propietats mapejades.
**Temps estimat:** 2 minuts

L'exportació genera un fitxer JSON amb les propietats associades a un origen, incloent-hi el camp origen i les regles de transformació. És un contracte d'integració pensat perquè l'equip de desenvolupament sàpiga exactament què enviar a HubSpot i com transformar cada valor.

## Passos

1. Entra a **CRM → Propietats**.
2. Prem **Exporta JSON**. Es desplega un menú amb un element per cada origen del projecte.
3. Selecciona l'origen que vulguis exportar.
4. El navegador descarrega un fitxer amb el nom `{nom-origen}_{data}.json`.

## Què conté el fitxer

- `schema_version`: versió del contracte (actualment 1).
- `origin`: identificador, nom i tipus de l'origen.
- `exported_at`: data i hora de l'exportació.
- `properties`: per a cada propietat mapejada a aquest origen, el seu nom tècnic, etiqueta, objecte, tipus, camp origen i les transformacions (valor origen → valor HubSpot).

## Resultat esperat

Un fitxer JSON descarregat, a punt per compartir amb l'equip de desenvolupament o adjuntar a la documentació de la integració.

## Preguntes freqüents

**Es desa el JSON a Google Drive?** No. L'exportació es genera sota demanda i es descarrega localment; no s'emmagatzema automàticament a Drive.

**Per què exportar per origen i no tot junt?** Cada origen sol correspondre a una integració diferent; el contracte per origen és just el que necessita qui desenvolupa aquella integració.
