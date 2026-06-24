# Scopes de HubSpot per característica

**Prerequisits:** ser administrador (Super Admin) del portal de HubSpot.
**Temps estimat:** 10 minuts.

Aquest tutorial explica com crear el *Private App Token* (PAT) amb què l'aplicació es connecta a HubSpot i quins *scopes* (àmbits de permís) cal activar segons les característiques que faràs servir. Per al detall pas a pas de la creació, consulta també «Crear una Private App a HubSpot i obtenir el token».

> **Nota important:** els scopes d'un Private App Token **no es poden consultar via API**. L'aplicació no detecta ni valida els permisos de manera anticipada. Si actives de menys, HubSpot retorna un error `403` a l'operació concreta indicant el scope que falta. Per això convé activar de cop el conjunt agrupat del final.

## Crear la clau PAT

1. Inicia sessió a HubSpot amb un compte d'administrador.
2. Ves a **Configuració** (icona de l'engranatge, a dalt a la dreta).
3. Al menú lateral, obre **Integracions → Aplicacions privades**.
4. Prem **Crear una aplicació privada**.
5. A **Informació bàsica**, escriu un nom (per exemple, `RevOps Assistant`) i una descripció.
6. Obre la pestanya **Àmbits (scopes)** i activa els que necessitis (vegeu les taules següents).
7. Prem **Crear aplicació** i confirma.
8. Prem **Mostra el token** i **Copia**. El token comença per `pat-` (per exemple, `pat-eu1-xxxxxxxx`).

Enllaços oficials de HubSpot:

- Crear aplicacions privades: https://knowledge.hubspot.com/integrations/create-private-apps
- Referència de scopes: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Aplicacions privades (guia per a desenvolupadors): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes per característica

### Connexió bàsica (sempre)

| Scope | Motiu |
|-------|-------|
| `crm.objects.contacts.read` | Verificació de connectivitat del connector base |

### Gestió de propietats

| Scope | Motiu |
|-------|-------|
| `crm.schemas.contacts.read` | Llegir propietats de contactes |
| `crm.schemas.contacts.write` | Crear/editar propietats de contactes |
| `crm.schemas.deals.read` | Llegir propietats de deals |
| `crm.schemas.deals.write` | Crear/editar propietats de deals |
| `crm.schemas.companies.read` | Llegir propietats de companies |
| `crm.schemas.companies.write` | Crear/editar propietats de companies |

### Objectes custom

| Scope | Motiu |
|-------|-------|
| `crm.schemas.custom.read` | Llegir definicions d'objectes custom (CRM Schemas API) |
| `crm.schemas.custom.write` | Crear/editar/arxivar definicions d'objectes custom |

### Gestió de formularis

| Scope | Motiu |
|-------|-------|
| `forms` | Llegir, crear i actualitzar formularis (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resoldre propietats i objectes destí per a la cobertura (compartit amb Propietats) |
| `communication_preferences.read` | Llistar els tipus de subscripció per al consentiment legal (Subscription Preferences API). Sense ell, HubSpot retorna `403` |

### Dashboard d'estat i Vista general de CRM

No requereixen scopes nous: reutilitzen els ja concedits per les característiques anteriors.

## Conjunt agrupat (tots els casos)

Per habilitar tota l'aplicació de cop, activa aquests onze scopes:

| Scope | Usat per |
|-------|----------|
| `crm.objects.contacts.read` | Connexió bàsica |
| `crm.schemas.contacts.read` | Propietats, Formularis |
| `crm.schemas.contacts.write` | Propietats |
| `crm.schemas.deals.read` | Propietats |
| `crm.schemas.deals.write` | Propietats |
| `crm.schemas.companies.read` | Propietats |
| `crm.schemas.companies.write` | Propietats |
| `crm.schemas.custom.read` | Objectes custom |
| `crm.schemas.custom.write` | Objectes custom |
| `forms` | Formularis |
| `communication_preferences.read` | Formularis (consentiment legal) |

## Resultat esperat

Tens una Private App amb els scopes de les característiques que faràs servir i un token `pat-…` copiat, llest per introduir a l'app (vegeu «Connectar HubSpot»).

## Preguntes freqüents

**Puc canviar els scopes més tard?** Sí. Torna a l'aplicació privada, ajusta els àmbits i desa; el token no canvia.

**Per què l'app no m'avisa que falta un scope abans d'operar?** Perquè HubSpot no exposa els scopes d'un PAT via API. La fallada només apareix (com a `403`) en executar l'operació que el necessita.

**I si només faré servir una característica?** Activa la secció «Connexió bàsica» més la secció d'aquesta característica. Pots afegir la resta després sense regenerar el token.
