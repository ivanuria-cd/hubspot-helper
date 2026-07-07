# Sortu eta berriro inportatu plangintzako eremu-mapa

**Aurrebaldintzak:** proiektu bat irekita izatea, Google Drive konektorea lan-karpeta batekin konfiguratuta eta, atariarekin alderatzeko, HubSpot konektorea. Komeni da datu-jatorriak eta haien eremuak definituta izatea.
**Estimatutako denbora:** 10 minutu

Plangintzako eremu-mapa aplikazioak sortzen duen Google Sheets dokumentu **editagarri** bat da, bezeroak dokumentuan bertan erabaki dezan jatorrizko eremu bakoitza HubSpoteko propietate batera nola mapatzen den. Egoera-fitxategiaren aldean, dokumentu hau eskuz betetzeko dago pentsatuta: goitibeherak, objektu bakoitzeko fitxa bat eta jatorriko katalogo-orriak ditu. Bezeroak beteta itzultzen duenean, aplikazioak berriro irakurtzen du, aldaketen laburpen bat erakusten dizu eta zirriborroak sortzen ditu, gero berrikusteko.

## Urratsak

1. Sartu **CRM → Propietateak** atalean.
2. Sakatu **Sortu plangintza-mapa**. Aplikazioak zure Drive karpetan Google Sheets bat sortzen (edo eguneratzen) du, honekin:
   - **Legenda** orri bat, zutabeak eta egoerak azaltzen dituena;
   - HubSpot objektu bakoitzeko fitxa bat, HubSpot blokearekin (Custom, Name, Internal name, Type…) eta aplikagarri den jatorri bakoitzeko bloke batekin (Field name, Origin, Comments);
   - jatorri-sistema bakoitzeko **Origen …** orri bat, helburuko propietate kalkulatuarekin;
   - **Asociaciones** orri bat (informatiboa soilik).
3. Partekatu dokumentua bezeroarekin. Objektu-fitxa bakoitzean bete dezake, goitibeheren bidez:
   - **Custom**: `No` (badago), `Yes (Pending)` (sortzeko) edo `Yes (Created)` (sortuta);
   - **Field name**: propietatea elikatzen duen jatorriko eremua;
   - **Origin**: `Migration` edo `Integration`;
   - **Type**: eremu-mota hizkera errazean (testua, zenbakia, moneta, telefonoa…).
4. Dokumentua beteta dagoenean, itzuli **CRM → Propietateak** atalera eta sakatu **Inportatu plangintza**.
5. Proiektuarekiko aldaketak badaude, **aldaketen laburpen** bat irekitzen da (altak, bajak, mapaketa- edo mota-aldaketak) eta, hala badagokio, **ekintza behar duten eremuen** zerrenda: mota anbiguoak dira (adibidez, «aukeraketa», goitibehera, laukiak edo botoiak izan daitezkeenak) eta zehaztu behar dira. Oraindik ez da ezer aplikatzen.
6. Berrikusi laburpena eta sakatu **Sortu zirriborroak**. Aplikazioak mapako sarrerak sortu edo eguneratzen ditu. Mota ebatzi gabeko eremuak **blokeatuta** geratzen dira eta ez dira sortzen mota zehatza adierazi arte.
7. Sarrerak zirriborro gisa geratzen dira mapan. Berrikusi, sinkronizatu HubSpotekin eta aplikatu aldaketak ohiko fluxuarekin («Sinkronizatu HubSpotekin» eta «Aplikatu aldaketak HubSpoten» ikusi).

## Espero den emaitza

Plangintza-dokumentua Driven sortzen da bere goitibeherekin eta, berriro inportatzean, aplikazioak zer aldatzen den erakusten dizu ezer ukitu aurretik eta sarrerak zirriborro gisa sortzen ditu. Une batean ere ez dira aldaketak HubSpoten aplikatzen: horrek sinkronizatzea eta modu esplizituan aplikatzea eskatzen du oraindik.

## Ohiko galderak

**Zerbait aplikatzen da HubSpoten inportatzean?** Ez. Inportazioak proiektuaren mapan zirriborroak sortu edo eguneratzen ditu soilik. HubSpoteko aldaketek beti sinkronizatu eta ingurunearen arabera aplikatu behar dute.

**Zer esan nahi du eremu batek «ekintza behar duela»?** Hizkera errazean aukeratutako motak HubSpoteko hainbat konfiguraziori dagokiela eta zein zehaztu behar dela. Ebatzi arte, eremu hori ez da sortzen.

**Dokumentua babestuta dago?** Ez. Nahita da editagarria, bezeroak bete dezan. Proiektuaren egoera-fitxategia erregistro fidela izaten jarraitzen du eta ez da ukitzen.

**Berriro sor dezaket?** Bai. «Sortu plangintza-mapa» berriro sakatzeak lehendik dagoen dokumentua eguneratzen du.
