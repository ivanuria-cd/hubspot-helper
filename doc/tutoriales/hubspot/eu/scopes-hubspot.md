# HubSpot-eko scope-ak ezaugarriaren arabera

**Aurrebaldintzak:** HubSpot atariaren administratzaile (Super Admin) izatea.
**Estimatutako denbora:** 10 minutu.

Tutorial honek aplikazioak HubSpot-era konektatzeko erabiltzen duen *Private App Token* (PAT) nola sortu eta zein *scope* (baimen-eremu) aktibatu behar diren azaltzen du erabiliko dituzun ezaugarrien arabera. Sorkuntzaren urratsez urratseko xehetasunetarako, ikus «HubSpot-en Private App bat sortu eta tokena lortu» ere.

> **Ohar garrantzitsua:** Private App Token baten scope-ak **ezin dira API bidez kontsultatu**. Aplikazioak ez ditu baimenak aldez aurretik antzematen edo balidatzen. Gutxiegi aktibatzen baduzu, HubSpot-ek `403` errore bat itzultzen du operazio zehatzean, falta den scope-a adieraziz. Horregatik komeni da amaierako multzo bilduma aldi berean aktibatzea.

## PAT gakoa sortu

1. Hasi saioa HubSpot-en administratzaile-kontu batekin.
2. Joan **Ezarpenak** atalera (engranaje-ikonoa, goian eskuinean).
3. Alboko menuan, ireki **Integrazioak → Aplikazio pribatuak**.
4. Sakatu **Sortu aplikazio pribatu bat**.
5. **Oinarrizko informazioa** atalean, idatzi izen bat (adibidez, `RevOps Assistant`) eta deskribapen bat.
6. Ireki **Eremuak (scopes)** fitxa eta aktibatu behar dituzunak (ikus hurrengo taulak).
7. Sakatu **Sortu aplikazioa** eta berretsi.
8. Sakatu **Erakutsi tokena** eta **Kopiatu**. Tokena `pat-` hasten da (adibidez, `pat-eu1-xxxxxxxx`).

HubSpot-eko esteka ofizialak:

- Aplikazio pribatuak sortu: https://knowledge.hubspot.com/integrations/create-private-apps
- Scope-en erreferentzia: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Aplikazio pribatuak (garatzaileentzako gida): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scope-ak ezaugarriaren arabera

### Oinarrizko konexioa (beti)

| Scope | Arrazoia |
|-------|----------|
| `crm.objects.contacts.read` | Oinarrizko konektorearen konektagarritasun-egiaztapena |

### Propietateen kudeaketa

| Scope | Arrazoia |
|-------|----------|
| `crm.schemas.contacts.read` | Kontaktuen propietateak irakurri |
| `crm.schemas.contacts.write` | Kontaktuen propietateak sortu/editatu |
| `crm.schemas.deals.read` | Deal-en propietateak irakurri |
| `crm.schemas.deals.write` | Deal-en propietateak sortu/editatu |
| `crm.schemas.companies.read` | Companies propietateak irakurri |
| `crm.schemas.companies.write` | Companies propietateak sortu/editatu |

### Objektu custom-ak

| Scope | Arrazoia |
|-------|----------|
| `crm.schemas.custom.read` | Objektu custom-en definizioak irakurri (CRM Schemas API) |
| `crm.schemas.custom.write` | Objektu custom-en definizioak sortu/editatu/artxibatu |

### Formularioen kudeaketa

| Scope | Arrazoia |
|-------|----------|
| `forms` | Formularioak irakurri, sortu eta eguneratu (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Estaldurarako propietateak eta helburu-objektuak ebatzi (Propietateekin partekatua) |
| `communication_preferences.read` | Baimen legalerako harpidetza motak zerrendatu (Subscription Preferences API). Hori gabe, HubSpot-ek `403` itzultzen du |

### Egoera-Dashboard eta CRM ikuspegi orokorra

Ez dute scope berririk behar: aurreko ezaugarriek dagoeneko emandakoak berrerabiltzen dituzte.

## Multzo bildua (kasu guztiak)

Aplikazio osoa aldi berean gaitzeko, aktibatu hamaika scope hauek:

| Scope | Nork erabiltzen duen |
|-------|----------------------|
| `crm.objects.contacts.read` | Oinarrizko konexioa |
| `crm.schemas.contacts.read` | Propietateak, Formularioak |
| `crm.schemas.contacts.write` | Propietateak |
| `crm.schemas.deals.read` | Propietateak |
| `crm.schemas.deals.write` | Propietateak |
| `crm.schemas.companies.read` | Propietateak |
| `crm.schemas.companies.write` | Propietateak |
| `crm.schemas.custom.read` | Objektu custom-ak |
| `crm.schemas.custom.write` | Objektu custom-ak |
| `forms` | Formularioak |
| `communication_preferences.read` | Formularioak (baimen legala) |

## Espero den emaitza

Erabiliko dituzun ezaugarrien scope-ekin Private App bat duzu eta `pat-…` token bat kopiatuta, aplikazioan sartzeko prest (ikus «HubSpot konektatu»).

## Ohiko galderak

**Scope-ak geroago alda ditzaket?** Bai. Itzuli aplikazio pribatura, doitu eremuak eta gorde; tokena ez da aldatzen.

**Zergatik ez dit aplikazioak abisatzen scope bat falta dela operatu aurretik?** HubSpot-ek ez dituelako PAT baten scope-ak API bidez erakusten. Hutsegitea (`403` gisa) hura behar duen operazioa exekutatzean soilik agertzen da.

**Eta ezaugarri bat baino ez badut erabiliko?** Aktibatu «Oinarrizko konexioa» atala gehi ezaugarri horren atala. Gainerakoa gero gehi dezakezu tokena birsortu gabe.
