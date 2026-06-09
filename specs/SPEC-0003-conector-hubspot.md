# SPEC-0003 — Conector HubSpot

**Estado:** VALIDADO — criterios de aceptación pendientes hasta implementación  
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
│                                                         │
│  Scopes detectados:              [Ver todos]            │
│  ✓ crm.objects.contacts.read                           │
│  ✓ automation                                           │
│  ...                                                    │
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
  scopes: string[];
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
| `hubspot:save-token` | renderer → main | `{ projectId, environment, token }` | `{ success, portalId, portalName, scopes }` |
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
| `oauth` | Verificación de token (GET /oauth/v1/access-tokens) |
| `crm.objects.contacts.read` | Verificación de conectividad básica |

Cada SPEC de característica documentará sus scopes adicionales requeridos en su sección §7.

---

## 6. Implementación — Tareas Atómicas

1. **Instalar dependencias** — `axios`, `bottleneck`, `keytar`
2. **`connectors/hubspot/client.ts`** — instancia axios con interceptor de auth y retry logic
3. **`connectors/hubspot/rate-limiter.ts`** — cola Bottleneck (110 req/10s)
4. **`connectors/hubspot/token-store.ts`** — read/write token en keytar por projectId
5. **`connectors/hubspot/verify.ts`** — llama a `/oauth/v1/access-tokens` para validar token y obtener portalId, portalName y scopes
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
- `verify.spec.ts` — parsea correctamente la respuesta de `/oauth/v1/access-tokens`
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

- [ ] Introducir un PAT válido muestra el portal conectado con nombre e ID
- [ ] Un PAT inválido muestra error descriptivo
- [ ] El token no aparece en ningún log ni en el renderer store
- [ ] Las requests respetan el rate limit de HubSpot (verificado en sandbox)
- [ ] El retry funciona en errores 429 (verificado con mock)
- [ ] Todos los tests del SPEC en verde
- [ ] Los tres tutoriales de usuario están creados en `doc/tutoriales/hubspot/`
- [ ] PR creada, revisada y mergeada en `main`
