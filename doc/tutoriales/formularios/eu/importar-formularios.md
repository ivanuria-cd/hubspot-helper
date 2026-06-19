# Lehendik dauden inprimakiak inportatu

**Aurrebaldintzak:** HubSpot konektorea proiektuan konfiguratuta (`forms` scope-arekin).
**Estimatutako denbora:** 3 minutu

Inportazioak atariko inprimaki guztiak ekartzen ditu aplikaziora —bai tresna berrikoak, bai tresna legacy-tik jasotakoak—, jatorriei lotu eta haien estaldura berrikusi ahal izateko.

## Urratsak

1. Sartu **CRM → Inprimakiak** atalean.
2. Egiaztatu goiko barran zein HubSpot ingurune dagoen aktibo (ekoizpena edo sandbox).
3. Sakatu **Sinkronizatu HubSpot**. Aplikazioak inprimakiak irakurtzen ditu Marketing Forms API v3 bidez (eta, laguntza gisa, legacy v2 API irakurketa-soilekoa inprimaki oso zaharretarako).
4. Amaitzean laburpen bat ikusiko duzu zenbat inprimaki inportatu eta zenbat eguneratu diren adieraziz.

## Inprimaki motak ulertu

- **hubspot**: HubSpot inprimakia (editore berria edo legacy). Aplikazioak sor dezakeen mota bakarra da.
- **captured**: HubSpot ez den inprimaki-tresnak jasotako kanpoko HTML inprimakia («legacy» jasoketa).
- **flow**: inprimaki gainerakor (pop-up).
- **blog_comment**: blogeko iruzkin-inprimakia.

## Espero den emaitza

Taulak inprimaki bakoitza erakusten du bere motarekin eta estaldura-egoerarekin. Izenez bila dezakezu eta motaren edo estalduraren arabera iragazi.

## Ohiko galderak

**Inportazioak HubSpot aldatzen al du?** Ez. Irakurri soilik egiten du. Inprimakien egia-iturria HubSpot izaten jarraitzen du.

**Zergatik ez da inprimaki bat agertzen?** Oso zaharra bada, baliteke legacy tresnan soilik egotea; sinkronizazioak hura ere inportatzen saiatzen da irakurketa-soileko gisa.
