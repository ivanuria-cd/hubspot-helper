# Google kredentzialak konfiguratu

**Zertarako balio du:** aplikazioari Google Drive-rekin konektatzeko erabiltzen diren **OAuth bezero-IDa** (eta, zure bezeroak eskatzen badu, **sekretua**) adieraztea. Lehen hau `.env` fitxategian soilik bizi zen; orain aplikaziotik bertatik egin dezakezu.
**Estimatutako denbora:** 2 minutu.

## Zer behar duzu Google Cloud-etik

Google Cloud proiektuaren **OAuth bezero-IDa** soilik (`.apps.googleusercontent.com` amaieran duen balio bat). Ez da API key-rik behar: aplikazioaren karpeta-hautatzaileak ez du Google Picker erabiltzen.

> Zure OAuth bezeroa «Mahaigaineko aplikazioa» motakoa bada eta sekretua eskatzen badu, izan eskura **bezero-sekretua** ere. PKCE duten bezeroentzat normalean ez da beharrezkoa.

## Urratsak

1. Joan **Konfigurazioa > Konektoreak > Google Drive** atalera.
2. **Google Cloud kredentzialak** txartelean, itsatsi zure **bezero-IDa** dagokion eremuan.
3. (Aukerakoa) Sartu **bezero-sekretua** zure bezeroak eskatzen badu.
4. Sakatu **Gorde**. Aldaketak berehala du eragina: ez da berrabiarazi behar.

## Kredentzial bakoitzaren jatorria

Eremu bakoitzak bere jatorria duen etiketa bat erakusten du:

- **App** — balioa aplikazioan gordeta dago (IDa tokiko konfigurazioan; sekretua sistema eragilearen keychain-ean).
- **.env** — ez dago baliorik aplikazioan eta `.env` fitxategikoa erabiltzen ari da ordezko gisa.

Aplikazioan konfiguratutako balioak `.env`-en gainetik du lehentasuna.

## Kredentzialak ezabatu

Sakatu **Ezabatu** IDa eta sekretua aplikaziotik kentzeko. `.env`-en baliorik badago, aplikazioak automatikoki berreskuratuko du erabilera.

## Ohiko galderak

**Non gordetzen da sekretua?**
Sistema eragilearen keychain-ean (sarbide-tokenak gordetzen diren leku berean), inoiz ez testu lauan. Aplikazioak konfiguratuta dagoen ala ez erakusten du soilik, balioa erakutsi gabe.

**Zergatik ez da jada API key-rik eskatzen?**
Karpeta-hautaketak zure Drive OAuth-ekin soilik nabigatzen duen hautatzaile propio bat erabiltzen du. Google Picker-ek, API key eskatzen zuenak, kenduta dago.

**Bezero-IDa aldatu dut eta kontuak konektatuta jarraitzen du.**
Lehendik dagoen konexioa mantentzen da deskonektatu arte. Google Cloud proiektua aldatzen baduzu, deskonektatu eta berriz konektatu kredentzial berriekin baimentzeko.
