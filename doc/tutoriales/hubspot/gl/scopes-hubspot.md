# Scopes de HubSpot por característica

**Prerrequisitos:** ser administrador (Super Admin) do portal de HubSpot.
**Tempo estimado:** 10 minutos.

Este tutorial explica como crear o *Private App Token* (PAT) co que a aplicación se conecta a HubSpot e que *scopes* (ámbitos de permiso) activar segundo as características que vaias usar. Para o detalle paso a paso da creación, consulta tamén «Crear unha Private App en HubSpot e obter o token».

> **Nota importante:** os scopes dun Private App Token **non se poden consultar vía API**. A aplicación non detecta nin valida os permisos de forma anticipada. Se activas de menos, HubSpot devolve un erro `403` na operación concreta indicando o scope que falta. Por iso convén activar dunha vez o conxunto agrupado do final.

## Crear a clave PAT

1. Inicia sesión en HubSpot cunha conta de administrador.
2. Vai a **Configuración** (icona da engrenaxe, arriba á dereita).
3. No menú lateral, abre **Integracións → Aplicacións privadas**.
4. Preme **Crear unha aplicación privada**.
5. En **Información básica**, escribe un nome (por exemplo, `RevOps Assistant`) e unha descrición.
6. Abre a lapela **Ámbitos (scopes)** e activa os que necesites (ver táboas seguintes).
7. Preme **Crear aplicación** e confirma.
8. Preme **Mostrar token** e **Copiar**. O token comeza por `pat-` (por exemplo, `pat-eu1-xxxxxxxx`).

Ligazóns oficiais de HubSpot:

- Crear aplicacións privadas: https://knowledge.hubspot.com/integrations/create-private-apps
- Referencia de scopes: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Aplicacións privadas (guía para desenvolvedores): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes por característica

### Conexión básica (sempre)

| Scope | Motivo |
|-------|--------|
| `crm.objects.contacts.read` | Verificación de conectividade do conector base |

### Xestión de propiedades

| Scope | Motivo |
|-------|--------|
| `crm.schemas.contacts.read` | Ler propiedades de contactos |
| `crm.schemas.contacts.write` | Crear/editar propiedades de contactos |
| `crm.schemas.deals.read` | Ler propiedades de deals |
| `crm.schemas.deals.write` | Crear/editar propiedades de deals |
| `crm.schemas.companies.read` | Ler propiedades de companies |
| `crm.schemas.companies.write` | Crear/editar propiedades de companies |

### Obxectos custom

| Scope | Motivo |
|-------|--------|
| `crm.schemas.custom.read` | Ler definicións de obxectos custom (CRM Schemas API) |
| `crm.schemas.custom.write` | Crear/editar/arquivar definicións de obxectos custom |

### Xestión de formularios

| Scope | Motivo |
|-------|--------|
| `forms` | Ler, crear e actualizar formularios (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resolver propiedades e obxectos destino para a cobertura (compartido con Propiedades) |
| `communication_preferences.read` | Listar os tipos de subscrición para o consentimento legal (Subscription Preferences API). Sen el, HubSpot devolve `403` |

### Dashboard de estado e Vista xeral de CRM

Non requiren scopes novos: reutilizan os xa concedidos polas características anteriores.

## Conxunto agrupado (todos os casos)

Para habilitar toda a aplicación dunha vez, activa estes once scopes:

| Scope | Usado por |
|-------|-----------|
| `crm.objects.contacts.read` | Conexión básica |
| `crm.schemas.contacts.read` | Propiedades, Formularios |
| `crm.schemas.contacts.write` | Propiedades |
| `crm.schemas.deals.read` | Propiedades |
| `crm.schemas.deals.write` | Propiedades |
| `crm.schemas.companies.read` | Propiedades |
| `crm.schemas.companies.write` | Propiedades |
| `crm.schemas.custom.read` | Obxectos custom |
| `crm.schemas.custom.write` | Obxectos custom |
| `forms` | Formularios |
| `communication_preferences.read` | Formularios (consentimento legal) |

## Resultado esperado

Tes unha Private App cos scopes das características que vas usar e un token `pat-…` copiado, listo para introducir na app (ver «Conectar HubSpot»).

## Preguntas frecuentes

**Podo cambiar os scopes máis tarde?** Si. Volve á aplicación privada, axusta os ámbitos e garda; o token non cambia.

**Por que a app non me avisa de que falta un scope antes de operar?** Porque HubSpot non expón os scopes dun PAT vía API. O fallo só aparece (como `403`) ao executar a operación que o necesita.

**E se só vou usar unha característica?** Activa a sección «Conexión básica» máis a sección desa característica. Podes engadir o resto despois sen rexenerar o token.
