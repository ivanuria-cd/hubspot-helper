# Importar els formularis existents

**Prerequisits:** connector de HubSpot configurat al projecte (amb l'scope `forms`).
**Temps estimat:** 3 minuts

La importació porta a l'app tots els formularis del portal —tant els de l'eina nova com els capturats de l'eina legacy— per poder associar-los a orígens i revisar-ne la cobertura.

## Passos

1. Entra a **CRM → Formularis**.
2. Comprova a la barra superior quin entorn de HubSpot està actiu (producció o sandbox).
3. Prem **Sincronitza HubSpot**. L'app llegeix els formularis mitjançant la Marketing Forms API v3 (i, com a suport, l'API legacy v2 només de lectura per a formularis molt antics).
4. En acabar veuràs un resum amb quants formularis s'han importat i quants s'han actualitzat.

## Entendre els tipus de formulari

- **hubspot**: formulari de HubSpot (editor nou o legacy). És l'únic tipus que l'app pot crear.
- **captured**: formulari HTML extern capturat per l'eina de formularis no-HubSpot (la captura «legacy»).
- **flow**: formulari emergent (pop-up).
- **blog_comment**: formulari de comentaris de blog.

## Resultat esperat

La taula mostra cada formulari amb el seu tipus i el seu estat de cobertura. Pots cercar per nom i filtrar per tipus o cobertura.

## Preguntes freqüents

**La importació modifica HubSpot?** No. Només llegeix. L'estat de veritat dels formularis continua sent HubSpot.

**Per què no apareix un formulari?** Si és molt antic pot ser que només estigui a l'eina legacy; la sincronització l'intenta importar igualment com a només lectura.
