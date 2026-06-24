# Private App bat sortu HubSpot-en eta tokena lortu

**Aurrebaldintzak:** HubSpot atariaren administratzaile (Super Admin) izatea.
**Estimatutako denbora:** 5 minutu.

Aplikazioa HubSpot-era *Private App Token* (PAT) baten bidez konektatzen da. HubSpot-ek barne-integrazioetarako gomendatzen duen metodoa da eta lehengo API Key-ak ordezkatzen ditu.

## Urratsak

1. Hasi saioa HubSpot-en administratzaile-kontu batekin.
2. Joan **Konfigurazioa** atalera (engranaje-ikonoa, goian eskuinean).
3. Alboko menuan, ireki **Integrazioak → Aplikazio pribatuak**.
4. Sakatu **Sortu aplikazio pribatu bat**.
5. **Oinarrizko informazioa** fitxan, idatzi izen bat (adibidez, `RevOps Assistant`) eta deskribapen bat.
6. Ireki **Eremuak (scope-ak)** fitxa eta aktibatu, gutxienez:
   - `crm.objects.contacts.read` — oinarrizko konektagarritasun-egiaztapena.

   Gehitu, gainera, erabiliko dituzun funtzioek behar dituzten scope-ak (funtzio bakoitzak bereak dokumentatzen ditu; adibidez, automatizazioak `automation` behar du).

   Zehazki, **formularioen baimen legalak** (harpidetza motak) **`communication_preferences.read`** scope-a behar du (Subscription Preferences API), edozein kontutan erabilgarri. Hori gabe, harpidetza motak zerrendatzeak baimen-errore bat (403) itzultzen du.

   > **Garrantzitsua:** idatzi zein scope aktibatzen dituzun. Aplikazioak **ezin ditu gako pribatu baten scope-ak irakurri ezta erakutsi** (HubSpot-ek ez ditu API bidez ageriko jartzen), beraz baimen-zerrenda hemen soilik da ikusgai, HubSpot-en.
7. Sakatu **Sortu aplikazioa** eta berretsi abisuan.
8. HubSpot-ek **sarbide-tokena** erakutsiko du. Sakatu **Erakutsi tokena** eta gero **Kopiatu**.

## Espero den emaitza

`pat-` hasten den token bat duzu arbelean (adibidez, `pat-eu1-xxxxxxxx`). Gorde leku seguru batean aldi baterako; aplikazioan sartuko duzu hurrengo tutorialean.

## Ohiko galderak

**Scope-ak geroago alda al ditzaket?** Bai. Itzuli aplikazio pribatura, doitu eremuak eta gorde; HubSpot-ek eguneraketa sortzen du tokena aldatu gabe.

**Non gordetzen da tokena aplikazioan?** Zure sistema eragilearen keychain-ean zifratuta. Ez da inoiz pantailan erakusten ezta erregistroetan idazten.

**Sandbox kontu bat dut.** Errepikatu urrats hauek sandbox atariaren barruan token independente bat lortzeko; aplikazioaren *Sandbox* ingurunean erabiliko duzu.
