# Aldaketak HubSpot-en aplikatu

**Aurrebaldintzak:** mapa sinkronizatuta izatea eta aldaketa zainak edukitzea. Sandbox-en balidatzeko, ingurune hori HubSpot konektorean konfiguratuta izatea.
**Estimatutako denbora:** 5 minutu

Aplikazioak ez du inoiz HubSpot-en automatikoki idazten. Beharrezko aldaketak (propietateak sortzea, etiketak, aukerak edo motak doitzea) zerrenda gisa aurkezten dira, zuk berrikusi eta esplizituki aplikatzeko. Gomendioa lehenik **sandbox**-en aplikatzea da, balidatzea, eta soilik ondoren **produkzioan**.

## Urratsak

1. Sartu **CRM → Propietateak** atalean.
2. Sakatu **Aldaketa zain (n)** aldaketen ikuspegia irekitzeko. Txartel bakoitzak propietatea, eragiketa eta dagokion API deia erakusten ditu.
3. Aldaketa bakoitzeko:
   - Sakatu **Aplikatu Sandbox-en** proba-ingurunean exekutatzeko. Arrakastaz amaitzean, egoera `sandbox ✓`-ra pasatzen da.
   - Balidatu zure HubSpot sandbox-ean emaitza espero zenuena dela.
   - Sakatu **Aplikatu Produkzioan** benetako atarian exekutatzeko. Egoera `produkzioa ✓`-ra pasatzen da.
4. Aldaketa bat ez badagokio, sakatu **Baztertu** zerrendatik kentzeko.

## Espero den emaitza

Aldaketa bakoitzak bere inguruneka egoera islatzen du (sandbox eta produkzioa). Aldaketa bat ez da osatutzat hartzen produkzioan aplikatu arte.

## Ohiko galderak

**Zuzenean produkzioan aplika al dezaket sandbox-etik pasatu gabe?** Bai, baina ez da gomendatua. Sandbox-en balidatzeak benetako atarian erroreen arriskua murrizten du.

**Zer gertatzen da HubSpot-erako deia huts egiten badu?** Aldaketa ez da aplikatutzat markatzen eta errore-mezua ikusiko duzu. Zuzendu kausa eta saiatu berriz.

**Hau gai sentikorra da:** produkzioan aldaketak aplikatzeak bezero baten benetako ataria aldatzen du. Ziurtatu ingurune aktiboa berretsi aurretik.
