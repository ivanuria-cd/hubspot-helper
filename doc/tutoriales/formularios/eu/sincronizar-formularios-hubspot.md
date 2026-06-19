# Aldaketak HubSpot-ekin sinkronizatu

**Aurrebaldintzak:** inprimakien aldaketa zain bat gutxienez (inprimaki bat sortzean edo falta diren eremuak gehitzean sortua).
**Estimatutako denbora:** 3 minutu

Aldaketarik ez da automatikoki idazten HubSpot-en. Aldaketak zain pilatzen dira eta zuk aplikatzen dituzu, lehenik sandbox-en eta ondoren ekoizpenean probatu ahal izanik.

## Urratsak

1. Sartu **CRM → Inprimakiak** atalean.
2. Sakatu **Aldaketa zain (N)**.
3. Berrikusi aldaketa bakoitza: bere laburpena, eragiketa mota eta inguruneka egoera.
4. Egiaztatu goiko barran zein ingurune dagoen aktibo.
5. Sakatu **Aplikatu Sandbox-ean** aldaketa ekoizpena ukitu gabe probatzeko.
6. Pozik zaudenean, sakatu **Aplikatu Produkzioan**.
7. Aldaketa batek jada interesatzen ez bazaizu, sakatu **Baztertu**.

## Egoerak ulertu

- **sandbox ✓ / ✕**: aldaketa sandbox-en aplikatu den ala ez.
- **produkzioa ✓ / ✕**: aldaketa produkzioan aplikatu den ala ez.

Aldaketa bat ez da osatutzat hartzen produkzioan aplikatu arte.

## Espero den emaitza

Aplikatu ondoren, inprimakia HubSpot-en sortzen edo eguneratzen da aukeratutako ingurunean eta aldaketa ingurune horretarako markatuta geratzen da.

## Ohiko galderak

**Zer gertatzen da `forms` scope-a falta bada?** HubSpot-ek baimen-errore bat (403) itzultzen du eta aplikazioak erakusten dizu; aldaketa ez da aplikatutzat markatzen.

**Zuzenean produkziora aplika al dezaket?** Bai, baina gomendagarria da aurretik sandbox-en balidatzea.

**Aplikaziotik inprimakiak ezaba al daitezke?** Ez. Inprimakien ezabaketa irismenetik kanpo dago.
