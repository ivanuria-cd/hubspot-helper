# Jatorriak eta transformazioak mapatu

**Aurrebaldintzak:** mapan propietate bat gutxienez eta sortutako jatorri bat izatea.
**Estimatutako denbora:** 7 minutu

Mapaketa batek propietate bat datu-jatorri batekin konektatzen du, jatorri-sistemaren zein eremutik datorren eta HubSpot-en sartzeko zein balio-transformazio aplikatu behar diren adieraziz.

## Urratsak

1. Sartu **CRM → Propietateak** atalean eta egin klik mapatu nahi duzun propietatean. Alboko panela irekitzen da.
2. **Mapatutako jatorriak** atalean, sakatu **Gehitu jatorria**.
3. «Mapatu jatorria» elkarrizketan:
   - **Jatorria**: aukeratu datu-jatorria.
   - **Jatorri eremua**: jatorri-sistemako eremuaren izena, adibidez `Account_Tier__c`.
   - **Transformazioak**: sakatu **Gehitu araua** balio-baliokidetza bakoitzeko. Ezkerrean jatorritik iristen den balioa, eskuinean HubSpot-en baliozkoa den balioa. Adibidez `GOLD → enterprise`.
   - **Oharrak** (aukerakoa): taldearentzako edozein azalpen.
4. Sakatu **Gorde**. Mapaketa panelean eta taularen «Jatorriak» zutabean agertzen da.
5. Mapaketa bat editatzeko edo ezabatzeko, erabili bere ondoko arkatz eta zakarrontzi ikonoak panelean.

## Espero den emaitza

Mapaketa gordeta geratzen da eta Google Sheets-eko `03_Mapeo_Origenes` orrian islatzen da. Transformazioak jatorri balioa → HubSpot balioa bikote gisa gordetzen dira, jatorriaren JSON kontratuan esportatzeko prest.

## Ohiko galderak

**Logika konplexua defini al dezaket transformazioetan?** Ez. Segurtasunagatik balio-baliokidetzak (mapaketak) soilik onartzen dira, inoiz ez script-ak.

**Propietate batek jatorri bat baino gehiago izan al ditzake?** Bai. Gehitu mapaketa bat propietate hori elikatzen duen jatorri bakoitzeko.
