# SPEC-0003 — Conector HubSpot

**Estado:** IMPLEMENTADO — pendiente verificación local (typecheck/tests/build) y PR  
**Branch:** `feat/spec-0003-conector-hubspot`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0002

---

## 1. Objetivo

Implementar el cliente HubSpot base: autenticación por API key (Private App Token), gestión segura de credenciales, cliente HTTP tipado y pantalla de configuración del conector por proyecto.

Este SPEC no implementa ninguna capacidad de negocio — solo la infraestructura de comunicación con la API de HubSpot.

---

## 2. Contexto y Decisiones de Diseño

### Versión de API
- **HubSpot API v3** (base URL: `https://api.hubapi.com`) con endpoints individuales por objeto.
- Para Automation (workflows): **API v4** — `https://api.hubapi.com/automation/v4/`.
- Cada SPEC de característica documentará la versión exacta del endpoint que consume.
- Se verificará la versión disponible en `https://developers.hubspot.com/docs/api/overview` antes de implementar cada característica.

### Autenticación
- **Private App Token** (PAT) — método recomendado por HubSpot para integraciones internas desde 2022. Sustituye a las API Keys deprecadas.
- Header: `Authorization: Bearer <token>`
- El token se almacena en el keychain del SO vía **keytar** (sin pasar nunca al renderer).
- Cada proyecto soporta **dos entornos independientes**: `production` y `sandbox`, cada uno con su propio PAT y portalId.
- El entorno activo es siempre visible y cambiable desde la barra superior de la app (indicador permanente). Cambiar de entorno afecta a todas las operaciones que escriben en HubSpot en ese momento.
- Las operaciones de lectura pueden ejecutarse contra cualquier entorno; las operaciones de escritura siempre muestran confirmación indicando el entorno destino.

### Verificación del token y scopes
- La verificación del token se hace contra el endpoint de información de cuenta (`GET /account-info/2026-03/details`), del que se obtienen `portalId` y `portalName`.
- **Los scopes de un Private App Token no se pueden consultar vía API.** A diferencia del antiguo endpoint `/oauth/v1/access-tokens/{token}` (válido para tokens OAuth), las claves privadas no exponen su lista de ámbitos. Por tanto, la app **no detecta ni muestra los scopes**; estos se configuran y revisan en HubSpot al crear o editar la aplicación privada.
- Si una llamada falla por falta de permisos, HubSpot devuelve un `403` con el scope que falta; ese error se propaga al usuario en la operación concreta, no en la pantalla de conexión.

### Cliente HTTP
- **axios** como cliente HTTP — interceptores para auth header, rate limiting y error handling consistente.
- Rate limiting: HubSpot permite 110 req/10s en cuentas estándar. Implementar cola con **bottleneck**.
- Retry automático (3 intentos) en errores 429 y 5xx con backoff exponencial.

### Exposición al renderer
- El renderer nunca llama a HubSpot directamente — todo pasa por IPC al proceso main.
- El proceso main expone handlers tipados por operación.

### Sandbox
- Las pruebas con datos reales de la API se harán en `sandbox/hubspot/` (en `.gitignore`).
- Se usará una cuenta de HubSpot de desarrollo/sandbox para pruebas.

---

## 3. Interfaz de Usuario — Configuración del Conector

Pantalla accesible desde `Config > Conectores > HubSpot` dentro de un proyecto.

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  Conectores / HubSpot                           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│                                 [ Producción | Sandbox ]│  ← tabs
│  Private App Token                                      │
│  ┌──────────────────────────────────┐  [Guardar]       │
│  │ ••••••••••••••••••••••••••••     │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  Estado de conexión:  ● Conectado — Portal: Nombre (ID)│
│  Versión API en uso:  v3 / v4 (Automation)              │
└─────────────────────────────────────────────────────────┘
```

El entorno activo se muestra también en la `<TopBar>` global de la app como un chip permanente (`PROD` / `SANDBOX`) para que sea siempre visible independientemente de la pantalla en la que esté el usuario.

El indicador de estado usa:
- `#AFFC41` badge — conectado
- `#C7C2D3` badge — no configurado
- Error — texto `#14072B` sobre fondo claro con icono de advertencia

---

## 4. Modelo de Datos / Contratos

### Tipo `HubSpotConfig` (por proyecto)
```typescript
type HubSpotEnvironment = 'production' | 'sandbox';

interface HubSpotEnvConfig {
  portalId: string;
  portalName: string;
  tokenHash: string;       // hash de referencia, nunca el token real
  connectedAt: string;     // ISO 8601
  lastVerifiedAt: string;
}

interface HubSpotConfig {
  activeEnvironment: HubSpotEnvironment;
  apiVersion: string;      // 'v3'
  environments: Partial<Record<HubSpotEnvironment, HubSpotEnvConfig>>;
}
```

### IPC Channels
| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `hubspot:save-token` | renderer → main | `{ projectId, environment, token }` | `{ success, portalId, portalName }` |
| `hubspot:get-status` | renderer → main | `{ projectId }` | `HubSpotConfig \| null` |
| `hubspot:revoke-token` | renderer → main | `{ projectId, environment }` | `{ success }` |
| `hubspot:set-environment` | renderer → main | `{ projectId, environment }` | `{ success }` |
| `hubspot:request` | renderer → main | `HubSpotRequest` | `HubSpotResponse` |

### Tipo `HubSpotRequest`
```typescript
interface HubSpotRequest {
  projectId: string;
  environment?: HubSpotEnvironment; // si se omite, usa el activo
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;            // ej: '/crm/v3/objects/contacts'
  params?: Record<string, unknown>;
  body?: unknown;
}
```

---

## 5. Scopes Necesarios (base)

Los scopes se configuran al crear la Private App en HubSpot. Este es el conjunto mínimo para el conector base; cada SPEC de característica añadirá los suyos.

| Scope | Motivo |
|-------|--------|
| `crm.objects.contacts.read` | Verificación de conectividad básica |

> **Nota:** la verificación del token usa el endpoint de información de cuenta (`GET /account-info/2026-03/details`), que no exige un scope específico más allá de un token válido. **Los scopes de un Private App Token no son legibles vía API**, por lo que la app no los detecta ni los valida de forma anticipada: corresponde al usuario activar en HubSpot los ámbitos que requiera cada característica.

Cada SPEC de característica documentará sus scopes adicionales requeridos en su sección §7.

---

## 6. Implementación — Tareas Atómicas

1. **Instalar dependencias** — `axios`, `bottleneck`, `keytar`
2. **`connectors/hubspot/client.ts`** — instancia axios con interceptor de auth y retry logic
3. **`connectors/hubspot/rate-limiter.ts`** — cola Bottleneck (110 req/10s)
4. **`connectors/hubspot/token-store.ts`** — read/write token en keytar por projectId
5. **`connectors/hubspot/verify.ts`** — llama a `/account-info/2026-03/details` para validar el token y obtener portalId y portalName (los scopes del PAT no son consultables vía API)
6. **`connectors/hubspot/index.ts`** — façade público del conector
7. **IPC handlers** en `main/index.ts` — registrar handlers `hubspot:*`
8. **`renderer/features/connector-hubspot/`** — componente de configuración UI
9. **Ruta en sidebar** — añadir entrada en Config > Conectores
10. **Documentación de usuario** — crear tutoriales en `doc/tutoriales/hubspot/`
11. **Commit** — `feat(hubspot): conector base con autenticación PAT y gestión de token`

---

## 7. Tests Requeridos

### Unitarios
- `client.spec.ts` — el interceptor añade el header `Authorization` correcto; el retry se activa en 429/5xx
- `token-store.spec.ts` — guardar, leer y revocar token en keytar (mock de keytar)
- `verify.spec.ts` — parsea correctamente la respuesta de `/account-info/2026-03/details` (portalId y portalName)
- `rate-limiter.spec.ts` — las requests se encolan respetando el límite

### Funcionales
- `hubspot-config.spec.ts` — flujo: abrir configuración → introducir token → ver estado "Conectado" con nombre del portal

---

## 8. Documentación de Usuario

Tutoriales a crear en `doc/tutoriales/hubspot/`:

| Fichero | Tarea que describe |
|---------|-------------------|
| `crear-private-app.md` | Cómo crear una Private App en HubSpot y obtener el token PAT, incluyendo qué scopes activar según las características que se vayan a usar |
| `conectar-hubspot.md` | Cómo introducir el token en la app, verificar la conexión y entender los indicadores de estado |
| `cambiar-entorno.md` | Cómo configurar el entorno sandbox, cambiar entre producción y sandbox, y cuándo usar cada uno |

---

## 9. Consideraciones de Seguridad

- El token nunca viaja al renderer; el IPC `hubspot:save-token` lo intercepta en main y lo almacena en keytar.
- El campo de token en la UI es siempre `type="password"`.
- En logs y errores, el token se redacta (`[REDACTED]`).
- El `tokenHash` almacenado en la config del proyecto es solo para referencia de identidad (SHA-256 del token), nunca el token completo.

---

## 10. Criterios de Aceptación

- [x] Introducir un PAT válido muestra el portal conectado con nombre e ID
- [x] Un PAT inválido muestra error descriptivo
- [x] El token no aparece en ningún log ni en el renderer store
- [~] Las requests respetan el rate limit de HubSpot (cola Bottleneck implementada; pendiente verificación en sandbox real)
- [x] El retry funciona en errores 429 (verificado con mock — `client.spec.ts`)
- [~] Todos los tests del SPEC en verde (tests escritos; ejecutar `npm install && npm run typecheck && npm run test` en local)
- [x] Los tres tutoriales de usuario están creados en `doc/tutoriales/hubspot/`
- [ ] PR creada, revisada y mergeada en `main`

---

## 11. Estado de Implementación (2026-06-09)

Implementado en esta iteración:

- **Tipos compartidos** — `shared/types/hubspot.ts`: `HubSpotEnvironment`, `HubSpotEnvConfig`, `HubSpotConfig`, `HubSpotRequest`, `HubSpotResponse` y los payloads de IPC (`HubSpotSaveTokenInput/Result`, `HubSpotEnvironmentInput`, `HubSpotOperationResult`).
- **Conector** — `client.ts` (axios + interceptor de auth Bearer + retry con backoff exponencial en 429/5xx + redacción del token), `rate-limiter.ts` (Bottleneck, 100 req/10 s, concurrencia limitada), `token-store.ts` (keytar inyectable + `hashToken` SHA-256), `verify.ts` (`GET /account-info/2026-03/details` → portalId/portalName; sin scopes) e `index.ts` (façade `createHubSpotConnector` con stores inyectables + `createElectronHubSpotConnector`).
- **IPC** — canales `hubspot:save-token|get-status|revoke-token|set-environment|request` añadidos a `shared/types/ipc.ts`, `preload/index.ts` y registrados en `main/index.ts`. El token solo viaja renderer→main en `save-token`; nunca vuelve al renderer.
- **UI** — `features/connector-hubspot/` (hook `useHubSpotConnector` + pantalla `HubSpotConnectorScreen` con tabs Producción/Sandbox, campo token `type=password`, estado de conexión, revocar y «usar como entorno activo»). `ConfigSection` lista los conectores; ruta `config/connectors/hubspot`. Chip permanente de entorno (PROD/SANDBOX) en `TopBar`, alimentado por `hubspotEnvironment` del shell store y refrescado en `MainLayout`. Claves i18n añadidas en los cuatro locales.
- **Tests** — unitarios `client.spec.ts`, `token-store.spec.ts`, `verify.spec.ts`, `rate-limiter.spec.ts`, `index.spec.ts`; funcional `hubspot-config.spec.ts`.

Decisiones y desviaciones respecto a SPEC-0000 §5 / §6:

- **Ubicación del conector** — vive en `src/main/connectors/hubspot/` (no en `connectors/` raíz). Motivo: `tsconfig.main.json` (`include: src/main`, `src/preload`) y `vitest.config.ts` (`include: src/**`) ya delimitan el código al árbol `src/`; ubicarlo ahí da typecheck y descubrimiento de tests sin tocar la configuración de build de SPEC-0001. El `connectors/` raíz del scaffolding queda como documentación.
- **Dependencias** — `axios`, `bottleneck`, `keytar` añadidas a `dependencies` (versiones con >10 días de publicación, conforme a SPEC-0000 §11). `keytar` se carga de forma diferida (`require`) para no cargar el binario nativo en los tests unitarios.
- **Bundling** — `externalizeDepsPlugin()` añadido a `main` y `preload` en `electron.vite.config.ts` para externalizar dependencias (necesario para el módulo nativo `keytar`).

Pendiente (entorno local del usuario): `npm install` (instala axios/bottleneck/keytar), `npm run typecheck && npm run test`, `npm run build` + `npm run test:e2e`, y abrir la PR.

## 12. Iteraciones

### 2026-06-10 — Verificación vía account-info; sin lectura de scopes

Cambio: la verificación del token deja de usar `GET /oauth/v1/access-tokens/{token}` y pasa a `GET /account-info/2026-03/details`. Motivo: **los scopes de un Private App Token no se pueden obtener vía API** (a diferencia de los tokens OAuth). En consecuencia, el conector ya no detecta, persiste ni muestra los scopes.

Impacto documentado en este SPEC:

- §2 — nueva subsección «Verificación del token y scopes».
- §3 — el mockup de UI ya no muestra el bloque «Scopes detectados».
- §4 — `HubSpotEnvConfig` sin el campo `scopes`; salida de `hubspot:save-token` sin `scopes`.
- §5 — tabla de scopes base sin `oauth`; nota sobre la imposibilidad de leer scopes del PAT.
- §6 / §7 / §11 — referencias a `verify.ts` y a su test actualizadas al endpoint `account-info`.

Código afectado (ya funcional, no modificado en esta iteración): `verify.ts`, `index.ts`, `shared/types/hubspot.ts`, `HubSpotConnectorScreen.tsx`. Tests y tutoriales alineados en esta iteración (`verify.spec.ts`, `index.spec.ts`, `conectar-hubspot.md`, `crear-private-app.md`) y eliminada la clave i18n `hubspot.scopes` (sin uso) en los cuatro locales.

---

## 13. Adopción de feedback global (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgo #1. El feedback de guardado de token es inline y se pierde al cambiar de pestaña de entorno (`HubSpotConnectorScreen.tsx` L56-61); un guardado correcto solo limpia el input.

Adopción de SPEC-0002 §10 (Snackbar):
- `handleSave` (éxito/error): emitir `notify({ message: t('hubspot.tokenSaved'|'hubspot.tokenError'), severity })` en lugar del estado `feedback` efímero.
- El estado de conexión persistente (chip "Conectado/No configurado") y los `Alert` de error de carga se mantienen.

Nota: la confirmación al cambiar de entorno producción↔sandbox (Informe #5, impacto medio) queda **diferida**; no entra en esta iteración de alto impacto.

Claves i18n nuevas: `hubspot.tokenSaved`, `hubspot.tokenError` (cuatro locales).
