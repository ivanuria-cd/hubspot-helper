# Aplikazioa HubSpot-ekin konektatu

**Aurrebaldintzak:** aplikazio pribatuaren token bat izatea (ikus *Private App bat sortu HubSpot-en eta tokena lortu*) eta aplikazioan proiektu bat sortuta.
**Estimatutako denbora:** 2 minutu.

## Urratsak

1. Ireki zure proiektua aplikazioan.
2. Alboko menuan, sakatu **Konfigurazioa**.
3. **Konektoreak** atalean, sakatu **HubSpot**.
4. Ziurtatu konfiguratu nahi duzun ingurunearen fitxa hautatuta duzula: **Produkzioa** edo **Sandbox**.
5. Itsatsi tokena **Private App Token** eremuan.
6. Sakatu **Gorde**.

Aplikazioak tokena HubSpot-en aurka egiaztatzen du eta, baliozkoa bada, konexioaren egoera erakusten du.

## Espero den emaitza

- **Konektatuta** adierazlea (badge lima berdea).
- **Ataria: _izena_ (_id_)** lerroa zure HubSpot kontuaren datuekin.
- Erabiltzen ari den **API bertsioa**.

Tokena baliozkoa ez bada, errore-mezu bat ikusiko duzu arrazoia azalduz eta konexioa ez da gordeko.

> **Baimenei buruz (scope-ak):** aplikazioak ez ditu tokenaren scope-ak erakusten. HubSpot-eko gako pribatuek ez dute uzten beren eremuak API bidez kontsultatzen, beraz aplikazioak ezin ditu zerrendatu. Berrikusi eta doitu scope-ak zuzenean HubSpot-en, aplikazio pribatuaren barruan (ikus *Private App bat sortu HubSpot-en eta tokena lortu*). Funtzio bati baimen bat falta bazaio, erabiltzean nabarituko duzu, ez pantaila honetan.

## Ohiko galderak

**Nire tokena nonbait ikusten al da?** Ez. Eremua pasahitz motakoa da, tokena sistemaren keychain-ean zifratuta gordetzen da eta erregistro guztietan ezkutatzen da (`[REDACTED]`).

**Nola deskonektatzen dut ataria?** Pantaila berean, ingurunea hautatuta, sakatu **Errebokatu**. Ingurune horretako tokena ezabatzen da.

**Zer gertatzen da tokena iraungitzen bada edo aldatzen badut?** Itsatsi token berria berriz eta sakatu **Gorde**; aplikazioak berregiaztatzen du eta atariko datuak eguneratzen ditu.
