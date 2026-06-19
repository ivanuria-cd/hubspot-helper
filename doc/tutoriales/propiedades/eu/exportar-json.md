# JSON jatorriz esportatu

**Aurrebaldintzak:** propietate mapatuak dituen jatorri bat gutxienez izatea.
**Estimatutako denbora:** 2 minutu

Esportazioak JSON fitxategi bat sortzen du jatorri bati lotutako propietateekin, jatorri-eremua eta transformazio-arauak barne. Integrazio-kontratu bat da, garapen-taldeak HubSpot-era zer bidali eta balio bakoitza nola transformatu zehazki jakin dezan pentsatua.

## Urratsak

1. Sartu **CRM → Propietateak** atalean.
2. Sakatu **Esportatu JSON**. Proiektuaren jatorri bakoitzeko elementu bat duen menu bat zabaltzen da.
3. Hautatu esportatu nahi duzun jatorria.
4. Nabigatzaileak `{jatorri-izena}_{data}.json` izeneko fitxategi bat deskargatzen du.

## Zer du fitxategiak

- `schema_version`: kontratuaren bertsioa (gaur egun 1).
- `origin`: jatorriaren identifikatzailea, izena eta mota.
- `exported_at`: esportazioaren data eta ordua.
- `properties`: jatorri horretara mapatutako propietate bakoitzeko, bere izen teknikoa, etiketa, objektua, mota, jatorri-eremua eta transformazioak (jatorri balioa → HubSpot balioa).

## Espero den emaitza

JSON fitxategi bat deskargatuta, garapen-taldearekin partekatzeko edo integrazioaren dokumentazioari eransteko prest.

## Ohiko galderak

**JSONa Google Drive-n gordetzen al da?** Ez. Esportazioa eskaeraren arabera sortzen da eta tokian deskargatzen da; ez da automatikoki Drive-n gordetzen.

**Zergatik esportatu jatorriz eta ez dena batera?** Jatorri bakoitza normalean integrazio desberdin bati dagokio; jatorriko kontratua integrazio hori garatzen duenak behar duena da hain zuzen.
