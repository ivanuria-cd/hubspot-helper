# Scopes de HubSpot por característica

**Prerrequisitos:** ser administrador (Super Admin) del portal de HubSpot.
**Tiempo estimado:** 10 minutos.

Este tutorial explica cómo crear el *Private App Token* (PAT) con el que la aplicación se conecta a HubSpot y qué *scopes* (ámbitos de permiso) activar según las características que vayas a usar. Para el detalle paso a paso de la creación, consulta también «Crear una Private App en HubSpot y obtener el token».

> **Nota importante:** los scopes de un Private App Token **no se pueden consultar vía API**. La aplicación no detecta ni valida los permisos de forma anticipada. Si activas de menos, HubSpot devuelve un error `403` en la operación concreta indicando el scope que falta. Por eso conviene activar de una vez el conjunto agrupado del final.

## Crear la clave PAT

1. Inicia sesión en HubSpot con una cuenta de administrador.
2. Ve a **Configuración** (icono del engranaje, arriba a la derecha).
3. En el menú lateral, abre **Integraciones → Aplicaciones privadas**.
4. Pulsa **Crear una aplicación privada**.
5. En **Información básica**, escribe un nombre (por ejemplo, `RevOps Assistant`) y una descripción.
6. Abre la pestaña **Ámbitos (scopes)** y activa los que necesites (ver tablas siguientes).
7. Pulsa **Crear aplicación** y confirma.
8. Pulsa **Mostrar token** y **Copiar**. El token empieza por `pat-` (por ejemplo, `pat-eu1-xxxxxxxx`).

Enlaces oficiales de HubSpot:

- Crear aplicaciones privadas: https://knowledge.hubspot.com/integrations/create-private-apps
- Referencia de scopes: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Aplicaciones privadas (guía para desarrolladores): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes por característica

### Conexión básica (siempre)

| Scope | Motivo |
|-------|--------|
| `crm.objects.contacts.read` | Verificación de conectividad del conector base |

### Gestión de propiedades

| Scope | Motivo |
|-------|--------|
| `crm.schemas.contacts.read` | Leer propiedades de contactos |
| `crm.schemas.contacts.write` | Crear/editar propiedades de contactos |
| `crm.schemas.deals.read` | Leer propiedades de deals |
| `crm.schemas.deals.write` | Crear/editar propiedades de deals |
| `crm.schemas.companies.read` | Leer propiedades de companies |
| `crm.schemas.companies.write` | Crear/editar propiedades de companies |

### Objetos custom

| Scope | Motivo |
|-------|--------|
| `crm.schemas.custom.read` | Leer definiciones de objetos custom (CRM Schemas API) |
| `crm.schemas.custom.write` | Crear/editar/archivar definiciones de objetos custom |

### Gestión de formularios

| Scope | Motivo |
|-------|--------|
| `forms` | Leer, crear y actualizar formularios (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resolver propiedades y objetos destino para la cobertura (compartido con Propiedades) |
| `communication_preferences.read` | Listar los tipos de suscripción para el consentimiento legal (Subscription Preferences API). Sin él, HubSpot devuelve `403` |

### Dashboard de estado y Vista general de CRM

No requieren scopes nuevos: reutilizan los ya concedidos por las características anteriores.

## Conjunto agrupado (todos los casos)

Para habilitar toda la aplicación de una vez, activa estos once scopes:

| Scope | Usado por |
|-------|-----------|
| `crm.objects.contacts.read` | Conexión básica |
| `crm.schemas.contacts.read` | Propiedades, Formularios |
| `crm.schemas.contacts.write` | Propiedades |
| `crm.schemas.deals.read` | Propiedades |
| `crm.schemas.deals.write` | Propiedades |
| `crm.schemas.companies.read` | Propiedades |
| `crm.schemas.companies.write` | Propiedades |
| `crm.schemas.custom.read` | Objetos custom |
| `crm.schemas.custom.write` | Objetos custom |
| `forms` | Formularios |
| `communication_preferences.read` | Formularios (consentimiento legal) |

## Resultado esperado

Tienes una Private App con los scopes de las características que vas a usar y un token `pat-…` copiado, listo para introducir en la app (ver «Conectar HubSpot»).

## Preguntas frecuentes

**¿Puedo cambiar los scopes más tarde?** Sí. Vuelve a la aplicación privada, ajusta los ámbitos y guarda; el token no cambia.

**¿Por qué la app no me avisa de que falta un scope antes de operar?** Porque HubSpot no expone los scopes de un PAT vía API. El fallo solo aparece (como `403`) al ejecutar la operación que lo necesita.

**¿Y si solo voy a usar una característica?** Activa la sección «Conexión básica» más la sección de esa característica. Puedes añadir el resto después sin regenerar el token.
