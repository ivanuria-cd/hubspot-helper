# Propietate bat mapara gehitu

**Aurrebaldintzak:** proiektu bat irekita izatea. Propietatea HubSpot-ekin alderatzeko, komeni da HubSpot konektorea konfiguratuta izatea.
**Estimatutako denbora:** 5 minutu

Propietate-mapa proiektuaren propietateen zerrenda nagusia da eta HubSpot-en aurreikusitako haien definizioa. Propietateak bi modutara sar ditzakezu: HubSpot-etik inportatuz sinkronizatzean, edo eskuz gehituz oraindik atarian existitzen ez direnean.

## Urratsak

1. Sartu **CRM → Propietateak** atalean.
2. Sakatu **Propietatea** (ekintza-barrako botoia). «Gehitu propietatea» elkarrizketa irekitzen da.
3. Bete eremuak:
   - **Izen teknikoa (HubSpot)**: propietatearen barne-izena, adibidez `custom_tier`.
   - **Etiketa**: erabiltzaileek ikusiko duten izen irakurgarria.
   - **Objektua**: zein objekturi dagokion (contacts, deals edo companies).
   - **Mota**: datu mota (testua, zenbakia, data, enumerazioa, etab.).
   - **Eremu mota**: nola sartzen den (text, select, checkbox…).
   - **Taldea**: propietatea biziko den HubSpot propietate-taldea.
   - **Deskribapena** (aukerakoa).
4. Sakatu **Sortu**. Propietatea taulan agertzen da **missing** egoerarekin (oraindik ez da HubSpot-en existitzen).
5. Egin klik errenkadan alboko panela irekitzeko eta jatorriak lotzeko (ikus «Jatorriak eta transformazioak mapatu» tutoriala).

## Espero den emaitza

Propietatea mapan geratzen da `missing` egoerarekin. HubSpot-ekin sinkronizatzean «Sortu propietatea» motako aldaketa zain bat sortuko da, berrikusi eta aplika dezakezuna.

## Ohiko galderak

**Propietatea hemen sortzeak HubSpot-en sortzen al du?** Ez. Aplikazioak ez du inoiz HubSpot-en automatikoki idazten. Propietatea atarian sortzeak aldaketa zain esplizituki aplikatzea eskatzen du.

**HubSpot-etik inportatutako propietate bat edita al dezaket?** Bere etiketa eta deskribapena edita ditzakezu; gainerako eremuek atariaren benetako egoera islatzen dute.
