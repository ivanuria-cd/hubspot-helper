# SPEC-0004 — Conector Google Drive

**Estado:** IMPLEMENTADO  
**Branch:** `feat/spec-0004-conector-google-drive`  
**Fecha:** 2026-06-09 (implementado 2026-06-10; extendido 2026-06-11)  
**Depende de:** SPEC-0002

> **Extensión 2026-06-11 (SPEC-0006):** el conector se amplió para escribir **Google Sheets** además de Google Docs. Se añadió `connectors/google-drive/sheets-client.ts` (Google Sheets API v4, inyectable y testeable) y el método `writeSpreadsheet()` al conector. La estructura concreta de las hojas la define SPEC-0006, no este SPEC.

---

## 1. Objetivo

Implementar el conector Google Drive: autenticación OAuth 2.0, permiso acotado a una carpeta específica por proyecto, sincronización bidireccional de archivos de trabajo (mapas de campos, mapas de decisión, etc.) y gestión de Google Drive como fuente de verdad de esos archivos.

---

## 2. Contexto y Decisiones de Diseño

### Ámbito de permisos
- Se solicita únicamente el scope `https://www.googleapis.com/auth/drive.file` — acceso limitado a los archivos creados por la app o seleccionados explícitamente. Nunca acceso completo al Drive del usuario.
- La carpeta de trabajo se selecciona mediante el **Google Picker API** (UI de selección nativa de Google) para que el usuario elija explícitamente.

### Autenticación
- **OAuth 2.0** con flujo PKCE desde Electron.
- Se abre el navegador del sistema (no una ventana Electron) para la autenticación — mejor UX y más seguro.
- Los tokens (access + refresh) se almacenan en keytar.
- Refresh automático de access token antes de expirar.

### Biblioteca
- **googleapis** (cliente oficial de Google para Node.js) — mantenida por Google, bien tipada.

### Archivos de trabajo
- Los archivos gestionados por la app son Google Docs / Google Sheets (formato nativo Drive).
- Todos los archivos siguen la **identidad corporativa de Cloud District**: paleta de colores, tipografía (Poppins + Libre Baskerville Italic), cabeceras con fondo `#090017`, texto principal `#14072B`, accent `#AFFC41` solo en badges/indicadores. El diseño de cada archivo es cerrado por versión de esquema y no debe alterarse por el usuario salvo en las zonas explícitamente indicadas como editables.
- Al crear un archivo, la app añade una **portada estructurada** (primera sección del documento) con:
  — Qué es el archivo
  — Para qué sirve
  — Cómo interpretarlo
  — Qué puede modificar el usuario
  — Qué NO debe modificar (datos gestionados por la app)
  — Versión de esquema del archivo (ej: `schema_version: 2`) para gestionar migraciones y evitar incompatibilidades entre versiones de la app
- ~~La app usa los archivos Drive como fuente de verdad: al abrir la app, sincroniza el estado local con Drive. Si el usuario modificó manualmente el archivo, prevalece la versión de Drive.~~ **Revocado por §15 (BORRADOR, 2026-06-17).** Drive **ya no es fuente de verdad**. El estado operativo de cada característica vive en `electron-store` (local) y/o HubSpot; el documento de Drive es un **artefacto exportable y reimportable**. El usuario puede solicitar en cualquier momento actualizar el archivo de Drive desde la app, o cargar su contenido de vuelta al estado local. Ver §15.
- Cada archivo tiene metadata de la app almacenada en las `appProperties` del fichero Drive (sin afectar al contenido visible).

### Conflictos
- ~~La sincronización es unidireccional desde el punto de vista de la app: **Drive manda**.~~ **Revocado por §15 (BORRADOR, 2026-06-17).** No hay sincronización automática ni «Drive manda». La escritura a Drive es siempre una acción explícita del usuario (botón crear-o-actualizar) y la lectura de vuelta es una carga explícita. No existe resolución automática de conflictos: la carga desde Drive **sobrescribe** el estado local del feature, previa confirmación. Ver §15.

---

## 3. Interfaz de Usuario — Configuración del Conector

Pantalla en `Config > Conectores > Google Drive`:

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  Conectores / Google Drive                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│                                                         │
│  Cuenta Google                                          │
│  ● Conectado como: nombre@ejemplo.com    [Desconectar]  │
│                                                         │
│  Carpeta de trabajo                                     │
│  📁 /RevOps - Cliente X           [Cambiar carpeta]     │
│                                                         │
│  Última sincronización: hace 3 minutos    [Sincronizar] │
│                                                         │
│  Archivos gestionados: 4                                │
│  — Mapa de campos CRM.gsheet                            │
│  — Mapa de decisión Leads.gdoc                          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de Datos / Contratos

### Tipo `GoogleDriveConfig` (por proyecto)
```typescript
interface GoogleDriveConfig {
  accountEmail: string;
  folderId: string;
  folderName: string;
  folderPath: string;      // ruta legible
  connectedAt: string;
  lastSyncAt: string;
}
```

### Tipo `DriveFile` (archivo gestionado)
```typescript
interface DriveFile {
  driveId: string;
  name: string;
  mimeType: 'application/vnd.google-apps.document' | 'application/vnd.google-apps.spreadsheet';
  featureKey: string;      // qué característica de la app lo gestiona
  lastModifiedDrive: string;
  lastModifiedLocal: string;
  syncStatus: 'synced' | 'conflict' | 'pending';
}
```

### IPC Channels
| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `gdrive:start-auth` | renderer → main | `{ projectId }` | abre browser OAuth |
| `gdrive:auth-status` | main → renderer | — | `{ connected, email }` (evento) |
| `gdrive:select-folder` | renderer → main | `{ projectId }` | abre Google Picker, devuelve `{ folderId, folderName }` |
| `gdrive:get-status` | renderer → main | `{ projectId }` | `GoogleDriveConfig \| null` |
| `gdrive:sync` | renderer → main | `{ projectId }` | `{ synced: DriveFile[], conflicts: DriveFile[] }` |
| `gdrive:revoke` | renderer → main | `{ projectId }` | `{ success }` |
| `gdrive:write-file` | renderer → main | `{ projectId, featureKey, content }` | `{ driveId }` |
| `gdrive:read-file` | renderer → main | `{ projectId, featureKey }` | `{ content }` |

---

## 5. Scopes OAuth

| Scope | Motivo |
|-------|--------|
| `https://www.googleapis.com/auth/drive.file` | Acceso a archivos creados/gestionados por la app dentro de la carpeta elegida |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Listar carpetas para el selector propio (§14). Scope sensible: requiere verificación de Google para producción con usuarios externos |
| `https://www.googleapis.com/auth/userinfo.email` | Identificar la cuenta conectada |

---

## 6. Estructura de Archivos en Drive

```
[Carpeta seleccionada]/
├── _revops_meta.json          # Metadata de la app (hidden via appProperties)
├── [Feature A]/
│   └── Mapa de campos.gsheet
└── [Feature B]/
    └── Mapa de decisión.gdoc
```

Cada archivo creado por la app tiene en su primera sección (no editable por flujo normal) la portada de contexto.

---

## 7. Implementación — Tareas Atómicas

1. **Instalar dependencias** — `googleapis`, `electron-oauth2` (o implementación PKCE propia)
2. **`connectors/google-drive/auth.ts`** — flujo OAuth PKCE, almacenamiento de tokens en keytar, refresh automático
3. **`connectors/google-drive/picker.ts`** — integración Google Picker API para selección de carpeta
4. **`connectors/google-drive/client.ts`** — cliente Drive API (listar, crear, leer, actualizar archivos)
5. **`connectors/google-drive/sync.ts`** — lógica de sincronización y detección de conflictos
6. **`connectors/google-drive/cover-template.ts`** — generador de portada de contexto para cada tipo de archivo
7. **`connectors/google-drive/index.ts`** — façade público del conector
8. **IPC handlers** en `main/index.ts` — registrar handlers `gdrive:*`
9. **`renderer/features/connector-gdrive/`** — componente de configuración UI
10. **Ruta en sidebar** — añadir entrada en Config > Conectores
11. **Documentación de usuario** — crear tutoriales en `doc/tutoriales/google-drive/`
12. **Commit** — `feat(gdrive): conector base Google Drive con OAuth PKCE y sincronización`

---

## 8. Tests Requeridos

### Unitarios
- `auth.spec.ts` — generación de PKCE code_verifier/challenge, parsing de callback URL
- `sync.spec.ts` — detección de conflictos (mock de timestamps), resolución según política
- `cover-template.spec.ts` — la portada generada contiene las secciones requeridas
- `client.spec.ts` — llamadas a Drive API (mock de googleapis) con parámetros correctos

### Funcionales
- `gdrive-config.spec.ts` — flujo: conectar cuenta → seleccionar carpeta → ver estado "Conectado"
- `gdrive-sync.spec.ts` — sincronización con fixtures de archivos Drive (mock)

---

## 9. Documentación de Usuario

Tutoriales a crear en `doc/tutoriales/google-drive/`:

| Fichero | Tarea que describe |
|---------|-------------------|
| `conectar-google-drive.md` | Cómo autorizar el acceso a Google Drive desde la app, qué permisos se solicitan y por qué están acotados a una carpeta |
| `seleccionar-carpeta.md` | Cómo usar el selector de carpeta de Google para elegir o cambiar la carpeta de trabajo del proyecto |
| `sincronizar-archivos.md` | Cómo funciona la sincronización, cuándo se actualiza automáticamente, cómo forzarla manualmente y qué hacer si hay un conflicto |

---

## 10. Consideraciones de Seguridad

- Los tokens OAuth se almacenan en keytar, nunca en texto plano.
- El refresh token nunca se expone al renderer.
- El scope `drive.file` garantiza que la app solo puede ver/modificar sus propios archivos.
- El flujo OAuth usa PKCE — sin client secret expuesto en el binario.
- Al revocar la conexión: se revoca el token en la API de Google y se elimina de keytar.

---

## 11. Criterios de Aceptación

- [x] El flujo OAuth abre el navegador del sistema y completa la autenticación — implementado (`runElectronAuthFlow`: `shell.openExternal` + servidor loopback). _Pendiente de validación manual con credenciales reales._
- [x] La carpeta se selecciona con el Picker de Google (UI nativa) — implementado (`picker.ts` + ventana del façade). _Pendiente de validación manual._
- [x] Los archivos creados por la app aparecen en la carpeta de Drive — implementado (`createManagedDocument` con `appProperties`).
- [x] Los archivos tienen portada con contexto en la primera sección — implementado (`cover-template.ts`, test `cover-template.spec.ts`).
- [x] La sincronización detecta y notifica conflictos correctamente — implementado (`sync.ts`, test `sync.spec.ts`; aviso en la UI).
- [x] Al desconectar, el token se revoca en Google y se elimina localmente — implementado (`revoke` → `revokeToken` + `tokens.remove` + `configs.delete`).
- [ ] Todos los tests del SPEC en verde — **pendiente de ejecutar en la máquina del usuario.** El sandbox de esta sesión clonaba ficheros truncados (corrupción del clonado, no del repo); usar `scripts\verify-spec-0004.cmd`.
- [x] Los tres tutoriales de usuario están creados en `doc/tutoriales/google-drive/`
- [ ] PR creada, revisada y mergeada en `main` — pendiente (gestión Git del usuario).

---

## 12. Notas de Implementación (iteración 2026-06-10)

Decisiones tomadas durante la implementación, registradas según SPEC-0000 («cada iteración sobre un código debe modificar el spec»):

- **Ubicación del conector:** `src/main/connectors/google-drive/` (no la carpeta `connectors/` raíz), replicando el patrón ya establecido por el conector HubSpot (SPEC-0003). La carpeta raíz `connectors/` mantiene solo un README que apunta a la implementación.
- **PKCE propio en lugar de `electron-oauth2`:** se descartó `electron-oauth2` (sin mantenimiento) y se implementó PKCE con `node:crypto` (verifier/challenge S256), alineado con SPEC-0000 §11 (minimizar dependencias de riesgo). Vector de la RFC 7636 cubierto en tests.
- **Redirect URI:** loopback dinámico `http://127.0.0.1:<puerto>` con servidor `http` efímero; no se configura en `.env` (se elimina `GOOGLE_REDIRECT_URI`). Se añade `GOOGLE_API_KEY` para el Picker.
- **Inyección de dependencias:** todos los módulos del núcleo (`auth`, `token-store`, `client`, `sync`, `cover-template`, façade) reciben sus dependencias externas (HTTP, keytar, `DriveApi`, electron) por parámetro. `googleapis` y `keytar` se cargan con `require` diferido en el wiring real, igual que keytar en HubSpot, para no acoplar los tests ni el typecheck a módulos nativos/no instalados.
- **Modelo de contenido de archivos gestionados:** el cuerpo del documento es `portada + delimitador + datos gestionados`. `write-file`/`read-file` transportan una cadena genérica; la estructura concreta de cada archivo la define cada SPEC de característica (coherente con §2). `appProperties` marca el archivo como gestionado (`revops_managed`, `revops_feature`, `revops_schema_version`).
- **Picker:** se sirve el HTML del Picker desde un loopback y se carga en una `BrowserWindow` con `partition` propia para evitar la CSP de la sesión por defecto (solo activa en build empaquetada). La selección vuelve vía `document.title`.
- **Dependencias:** `keytar` ya estaba declarado; `googleapis` se instala con `scripts\setup-gdrive-deps.cmd`, que aplica SPEC-0000 §11 (verificación de antigüedad ≥10 días y `npm audit`). No se fija una versión a ciegas: la resuelve npm tras la verificación manual.
- **Carga de `.env` en runtime (fix 2026-06-10):** Electron no carga `.env` en `process.env`, y electron-vite solo expone variables con prefijo a `import.meta.env`. Se añadió `src/main/env.ts` (`loadEnv`, parser propio sin dependencias) invocado en `whenReady` antes de registrar los handlers, que carga `.env` desde `cwd`, `app.getAppPath()` y `userData`. Sin esto, `GOOGLE_CLIENT_ID` llegaba vacío y Google devolvía `Error 400: invalid_request — Missing required parameter: client_id`. Además se añadieron guardas que devuelven un error legible en la app si falta `GOOGLE_CLIENT_ID` (al conectar) o `GOOGLE_API_KEY` (al seleccionar carpeta).
- **Pendiente / fuera de esta iteración:** validación manual del flujo OAuth y Picker con credenciales reales; E2E de sincronización con fixtures mockeados del proceso principal (la lógica de reconciliación queda cubierta por `sync.spec.ts`); refinamiento del cuerpo de Sheets (la portada actual usa el modelo de Docs).

### Archivos creados / modificados

- Conector: `src/main/connectors/google-drive/{auth,token-store,client,sync,cover-template,picker,index}.ts` (+ specs de `auth`, `token-store`, `client`, `sync`, `cover-template`).
- Contrato: `src/renderer/shared/types/gdrive.ts`; canales y API en `ipc.ts`, `preload/index.ts`, handlers en `main/index.ts`.
- UI: `src/renderer/features/connector-gdrive/` (hook + pantalla), ruta en `router.tsx`, entrada en `ConfigSection.tsx`, claves i18n en `es/ca/eu/en`.
- Docs/QA: `doc/tutoriales/google-drive/{conectar-google-drive,seleccionar-carpeta,sincronizar-archivos}.md`; `tests/functional/{gdrive-config,gdrive-sync}.spec.ts`.
- Infra: `.env.example`, `scripts/setup-gdrive-deps.cmd`, `scripts/verify-spec-0004.cmd`.

---

## 13. Configuración de credenciales desde la interfaz (IMPLEMENTADO, 2026-06-15)

### 13.1 Contexto y objetivo

Hoy las credenciales de Google solo se leen de `.env` al arrancar (`src/main/env.ts` → `readEnv()`). El
objetivo es introducirlas y actualizarlas desde la pantalla del conector, sin tocar `.env` ni reiniciar.

**Decisión asociada (§14):** se elimina el Google Picker y, con él, la `GOOGLE_API_KEY`. La selección de
carpeta pasa a un selector propio (§14). Por tanto, las credenciales configurables se reducen a
**Client ID** y **Client Secret** (opcional). La API key desaparece del modelo, del `.env` y de la UI.

### 13.2 Decisiones (validadas con el usuario)

- **Alcance: globales de la app** (un único set). No por proyecto.
- **Aplicación: al instante.** El conector resuelve las credenciales de forma diferida en cada operación
  (no se capturan una sola vez al arrancar); guardar surte efecto sin reiniciar.
- **Almacenamiento: keytar + electron-store.** `clientSecret` en el llavero del SO (keytar, como el PAT de
  HubSpot y los tokens de Drive); `clientId` (no secreto) en electron-store. `.env` queda como **fallback
  de solo lectura**: si un campo no está configurado en la app, se usa el de `.env`.

### 13.3 Modelo de datos / contratos

```typescript
// Credenciales resueltas (uso interno del conector). Sin apiKey (se elimina el Picker).
interface GoogleCredentials {
  clientId: string;
  clientSecret?: string;
}

// Estado expuesto al renderer: NUNCA devuelve secretos en claro.
type CredentialSource = 'app' | 'env' | 'none';
interface GoogleCredentialsStatus {
  clientId: { set: boolean; source: CredentialSource; preview: string };  // preview = últimos 4 / ''
  clientSecret: { set: boolean; source: CredentialSource };               // sin preview
}

// Entrada para guardar (campos opcionales: solo se escriben los presentes).
interface GoogleCredentialsInput {
  clientId?: string;
  clientSecret?: string;
}
```

`GoogleCredentialsStore` (nuevo, en `connectors/google-drive/credentials-store.ts`):

- `resolve(): GoogleCredentials` — fusiona valor de la app (prioridad) con `.env` (fallback) campo a campo.
- `status(): GoogleCredentialsStatus` — para la UI; calcula `source` y enmascara.
- `set(input: GoogleCredentialsInput): void` — escribe solo los campos presentes (string vacío = borrar ese
  campo de la app y volver al fallback de `.env`). `clientId` → electron-store; `clientSecret` → keytar.
- `clear(): void` — borra ambos de la app (vuelve a `.env`).

Servicio keytar: `revops-gdrive`, cuenta `client_secret`. electron-store: fichero `gdrive-credentials`,
clave `clientId`.

### 13.4 Cambio en el conector (resolución diferida)

`GoogleDriveConnectorDeps.env: GoogleDriveEnv` (valor estático) se sustituye por
`getEnv: () => GoogleDriveEnv`. Todas las lecturas internas (`deps.env.*` en `getValidAccessToken`,
`startAuth`, `runAuthFlow`) pasan a `getEnv()`. `GoogleDriveEnv` pierde `apiKey`. En el wiring de Electron,
`getEnv` lee de `GoogleCredentialsStore.resolve()`. Los tests existentes pasan `getEnv: () => env`
(cambio mecánico, sin alterar la lógica probada).

### 13.5 IPC

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `gdrive:get-credentials-status` | renderer → main | — | `GoogleCredentialsStatus` |
| `gdrive:set-credentials` | renderer → main | `GoogleCredentialsInput` | `{ success, error? }` |
| `gdrive:clear-credentials` | renderer → main | — | `{ success }` |

El renderer envía los valores en claro por IPC (canal local) y main los persiste; `get-credentials-status`
**solo** devuelve booleanos, `source` y preview enmascarada, nunca el secreto completo.

### 13.6 Interfaz de usuario

Nueva tarjeta **«Credenciales de Google Cloud»** al inicio de la pantalla del conector (encima de
«Cuenta Google»):

```
┌─────────────────────────────────────────────────────────┐
│  Credenciales de Google Cloud            [.env] / [App]  │
│                                                          │
│  Client ID        [____________________________]  ●set   │
│  Client Secret    [•••••••••• (opcional)        ]        │
│                                                          │
│  ⓘ Solo se necesita el ID de cliente de OAuth.           │
│    Cómo crearlo → (enlace a pasos en Google Cloud)       │
│                                                          │
│              [Borrar]                      [Guardar]     │
└──────────────────────────────────────────────────────────┘
```

- Campo de secreto como `password`; si ya hay valor, placeholder enmascarado con preview (últimos 4) y no
  se reenvía salvo que el usuario escriba uno nuevo.
- Badge por campo indicando origen: `App`, `.env` o vacío.
- Validación ligera al guardar (`clientId` suele acabar en `.apps.googleusercontent.com`); la validación
  real ocurre al conectar.
- «Conectar» se habilita cuando hay `clientId`.

### 13.7 Tests requeridos

- `credentials-store.spec.ts`: precedencia app > `.env`; `set` con string vacío revierte a `.env`;
  `status` enmascara y calcula `source`; keytar y electron-store mockeados.
- Actualización de specs del conector al nuevo `getEnv` (cambio mecánico).

### 13.8 Seguridad

- `clientSecret` en keytar; `clientId` en electron-store; `.env` solo lectura.
- El secreto **no** sale de main en claro: la UI solo recibe estado enmascarado.
- No se registran secretos en logs. Entrada por IPC local; sin envío a terceros.

### 13.9 Fuera de alcance

- Credenciales por proyecto (se mantiene global).
- Creación/gestión del proyecto de Google Cloud o del OAuth client (lo hace el usuario en la consola).

### 13.10 Impacto

- `connectors/google-drive/credentials-store.ts` (nuevo) + `index.ts` (`getEnv` en deps; `apiKey` fuera; wiring).
- `shared/types/gdrive.ts`, `ipc.ts`, `preload/index.ts`, handlers en `main/index.ts` (3 canales nuevos).
- `renderer/features/connector-gdrive/` (tarjeta de credenciales + hook), claves i18n `es/ca/eu/en`.
- Tutorial `doc/tutoriales/google-drive/configurar-credenciales.md`.

---

## 14. Selección de carpeta sin Picker — selector propio (IMPLEMENTADO, 2026-06-15)

### 14.1 Contexto y decisión

El Google Picker exige **a la vez** token OAuth y una developer key (API key) — es un requisito propio del
widget, confirmado en la documentación de Google (`PickerBuilder` requiere `setOAuthToken` **y**
`setDeveloperKey`). Para evitar depender de una API key, se sustituye el Picker por un **selector de
carpetas propio** dentro de la app, que navega el Drive del usuario vía la Drive API (solo OAuth).

### 14.2 Coste en permisos (scope)

El scope actual `drive.file` no permite **listar** carpetas que la app no creó, así que el selector propio
necesita añadir un scope de lectura de metadatos:

- **`drive.metadata.readonly`** — listar nombres/IDs/padres de carpetas para navegar. Es un scope sensible:
  con usuarios externos, Google exige verificación de la app para producción; en modo *testing* o dentro de
  un dominio Workspace propio no aplica. El usuario acepta este coste a cambio de eliminar la API key.
- Se conserva `drive.file` para crear/gestionar los archivos de la app dentro de la carpeta elegida (crear
  un archivo con `parents:[folderId]` es válido bajo `drive.file`).

> Actualiza la tabla de §5 añadiendo `drive.metadata.readonly`. Al cambiar scopes, los tokens existentes
> deben re-autorizarse (el usuario verá de nuevo la pantalla de consentimiento).

### 14.3 Façade del conector

Se elimina `openPicker`/`buildPickerHtml`/`picker.ts` y la dependencia de la API key. Nuevas operaciones:

```typescript
interface DriveFolder { id: string; name: string; }
// Lista subcarpetas de un padre. parentId vacío/'root' = raíz «Mi unidad».
listFolders(parentId: string): Promise<DriveFolder[]>;
// Persiste la carpeta elegida en GoogleDriveConfig (folderId/folderName/folderPath).
setFolder(projectId: string, folder: { id: string; name: string; path: string }): Promise<GoogleDriveFolderResult>;
```

`listFolders` usa `files.list` con
`q="mimeType='application/vnd.google-apps.folder' and trashed=false and '<parentId>' in parents"`,
`fields=files(id,name)`, ordenado por nombre; paginación con `pageToken`.

### 14.4 IPC

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `gdrive:list-folders` | renderer → main | `{ projectId, parentId }` | `DriveFolder[]` |
| `gdrive:set-folder` | renderer → main | `{ projectId, folderId, folderName, folderPath }` | `GoogleDriveConfig` |

Se retira `gdrive:select-folder` (Picker) y su handler.

### 14.5 Interfaz de usuario

Modal **«Seleccionar carpeta de trabajo»** lanzado desde «Cambiar carpeta»:

```
┌──────────────────────────────────────────────┐
│  Seleccionar carpeta de trabajo               │
│  Mi unidad / Clientes / ▸                      │  ← breadcrumb navegable
│  ──────────────────────────────────────────   │
│  📁 Cliente X                                  │  ← clic = entrar
│  📁 Cliente Y                                  │
│  📁 Plantillas                                 │
│  ──────────────────────────────────────────   │
│        [Cancelar]   [Seleccionar esta carpeta] │  ← elige el directorio actual
└──────────────────────────────────────────────┘
```

- Arranca en «Mi unidad» (`root`); cada carpeta es navegable; breadcrumb para subir.
- «Seleccionar esta carpeta» fija el directorio actualmente abierto y construye `folderPath` desde el breadcrumb.
- Estado de carga y vacío («Esta carpeta no tiene subcarpetas»).

### 14.6 Tests requeridos

- `client.spec.ts`: `listFolders` arma el `q` correcto y mapea la respuesta; paginación.
- Funcional: abrir modal → navegar → seleccionar → la UI muestra la carpeta elegida (mock de `list-folders`/`set-folder`).

### 14.7 Fuera de alcance

- Crear carpetas nuevas desde el selector (posible iteración futura).
- Unidades compartidas (Shared Drives) — primera versión solo «Mi unidad»; se puede ampliar con
  `supportsAllDrives`/`corpora` más adelante.

### 14.8 Impacto

- `connectors/google-drive/`: elimina `picker.ts` y `openPicker`; `client.ts`/`index.ts` añaden `listFolders`
  y `setFolder`; `GoogleDriveEnv` sin `apiKey`; `runAuthFlow` añade scope `drive.metadata.readonly`.
- `shared/types/gdrive.ts`, `ipc.ts`, `preload/index.ts`, `main/index.ts`: canales `list-folders`/`set-folder`,
  retirada de `select-folder`.
- `renderer/features/connector-gdrive/`: modal selector + hook; claves i18n `es/ca/eu/en`.
- `.env.example`: eliminar `GOOGLE_API_KEY`. Tutorial `seleccionar-carpeta.md` reescrito (sin Picker).
- §5 (scopes) actualizado.

### 14.10 Ampliación — «Compartido conmigo» (IMPLEMENTADO, 2026-06-15)

El selector inicial lista solo subcarpetas de «Mi unidad». Para incluir carpetas **compartidas con el
usuario** (sección «Compartido conmigo», que no cuelgan de `root`):

- **Nivel raíz virtual en la UI.** Al abrir, el modal muestra dos ubicaciones de entrada: **Mi unidad**
  (`root`) y **Compartido conmigo** (`sharedWithMe`). La miga de pan arranca en «Ubicaciones». Ninguna de
  estas dos entradas «virtuales» (`locations`) es seleccionable como carpeta de trabajo; sí lo son «Mi
  unidad» y cualquier carpeta real al entrar en ella.
- **`client.listFolders(parentId)`** añade una rama:
  - `parentId === 'sharedWithMe'` → `q = "sharedWithMe = true and mimeType = '<folder>' and trashed = false"`.
  - resto de IDs (incluido `root`) → consulta por `'<parentId>' in parents` (como ahora).
- **No seleccionable:** se deshabilita «Seleccionar esta carpeta» cuando el nodo actual es el raíz virtual
  (`locations`) o el contenedor `sharedWithMe`; al entrar en una carpeta compartida concreta, su `id` real
  ya es seleccionable.
- **Permisos:** `drive.metadata.readonly` (ya añadido) cubre el listado de «Compartido conmigo». Para que
  la app cree sus archivos dentro de una carpeta compartida, el usuario debe tener permiso de edición sobre
  ella (si es de solo lectura, la escritura fallará en tiempo de ejecución; se mostrará el error de la API).
- **Unidades compartidas (Shared Drives):** siguen fuera de alcance (requieren `supportsAllDrives`/`corpora`).
- **Tests:** `client.spec.ts` añade un caso de `listFolders('sharedWithMe')` que arma el `q` con
  `sharedWithMe = true`. Funcional: la raíz del modal muestra «Mi unidad» y «Compartido conmigo».

### 14.11 Ampliación — Unidades compartidas y búsqueda por nombre (IMPLEMENTADO, 2026-06-15)

Dos añadidos al selector de carpeta.

#### A. Unidades compartidas (Shared Drives)

- **Tercera ubicación** en la raíz virtual del modal: **Mi unidad**, **Compartido conmigo** y
  **Unidades compartidas** (sentinela `sharedDrives`).
- Al entrar en «Unidades compartidas» se listan las unidades a las que el usuario tiene acceso
  (`drive.drives.list`). Cada unidad se muestra como carpeta (su `id` es la raíz de esa unidad).
- Navegar dentro de una unidad compartida usa la misma `files.list` por padre, pero con
  `supportsAllDrives = true` e `includeItemsFromAllDrives = true`. Estos flags se activan de forma
  general en `listFolders` (inocuos para «Mi unidad»), de modo que un único camino sirve para todo.
- El contenedor `sharedDrives` no es seleccionable; sí lo son la raíz de una unidad y sus subcarpetas.
- **Contrato:** `DriveApi` añade `drivesList(args)` y `filesList` admite los flags
  `supportsAllDrives`/`includeItemsFromAllDrives`. El façade `listFolders(projectId, parentId)` enruta
  `parentId === 'sharedDrives'` a `client.listSharedDrives()`; el resto a `client.listFolders(parentId)`.
  No se añade canal IPC nuevo para esto (se reutiliza `gdrive:list-folders` con el sentinela).

#### B. Búsqueda por nombre

- Campo de búsqueda en el modal. Al escribir un término y buscar, se consulta Drive por nombre:
  `q = "name contains '<term>' and mimeType = '<folder>' and trashed = false"` con los flags de todas las
  unidades. Resultados en lista plana (sin jerarquía); seleccionar uno fija la carpeta de trabajo
  (`folderPath` = nombre de la carpeta). Borrar el término vuelve a la navegación normal.
- Las comillas simples del término se escapan (`'` → `\'`) para no romper el `q`.
- **Contrato:** nuevo canal `gdrive:search-folders` (input `{ projectId, query }` → `DriveFolder[]`),
  façade `searchFolders`, y `client.searchFolders(query)`.

#### Permisos y alcance

- `drive.metadata.readonly` (ya concedido) cubre `drives.list`, la navegación con flags de todas las
  unidades y la búsqueda por nombre. Crear archivos dentro de una unidad/ carpeta compartida exige permiso
  de edición del usuario (si no, falla en escritura con el error de la API).

#### Tests

- `client.spec.ts`: `listSharedDrives` llama a `drivesList`; `listFolders` envía
  `supportsAllDrives/includeItemsFromAllDrives`; `searchFolders` arma `name contains` y escapa comillas.

#### Impacto

- `client.ts` (`listSharedDrives`, `searchFolders`, flags en `listFolders`; `DriveApi` ampliado),
  `index.ts` (façade `listFolders` enruta sentinela; `searchFolders`; wiring `drivesList`),
  `ipc.ts`/`preload`/`main` (canal `search-folders`), `FolderPickerDialog.tsx` (tercera ubicación + buscador),
  i18n `gdrive.folderPicker.*` (sharedDrives, search, searchPlaceholder, searchResults, clearSearch).

### 14.9 Notas de implementación (2026-06-15)

- **Credenciales (§13):** `connectors/google-drive/credentials-store.ts` con `createGoogleCredentialsManager`
  (puro, backends inyectables) y `createElectronGoogleCredentialsManager` (electron-store para `clientId`,
  keytar `revops-app:google-drive-credentials`/`client_secret`, `.env` como fallback). Caché en memoria
  con `ready()` para que `resolve()` sea síncrono. Test `credentials-store.spec.ts` (5 casos).
- **Conector (§13.4/§14):** `GoogleDriveConnectorDeps.env` → `getEnv()`; `GoogleDriveEnv` sin `apiKey`;
  se retiran `openPicker`/`buildPickerHtml` (`picker.ts` queda vacío) y `readEnv`. Nuevos `listFolders`/
  `setFolder` y métodos `getCredentialsStatus`/`setCredentials`/`clearCredentials` en el façade. `client.ts`
  añade `listFolders`. Scope `drive.metadata.readonly` en `auth.ts`.
- **IPC:** se retira `gdrive:select-folder`; se añaden `list-folders`, `set-folder`,
  `get-credentials-status`, `set-credentials`, `clear-credentials` (ipc.ts/preload/main).
- **UI:** `GoogleCredentialsCard.tsx` (tarjeta de credenciales) y `FolderPickerDialog.tsx` (selector
  navegable); `useGoogleDriveConnector` y `GoogleDriveConnectorScreen` actualizados; claves i18n
  `gdrive.credentials.*` y `gdrive.folderPicker.*` en es/ca/eu/en.
- **Verificación:** 41 tests del conector en verde (incluye `credentials-store` y `listFolders`). El
  typecheck completo debe ejecutarse en la máquina del usuario (`npm run typecheck`): el clonado al
  sandbox de esta sesión truncaba ficheros, por lo que la verificación de contrato se hizo sobre los
  originales. Al cambiar los scopes, las cuentas conectadas deben reautorizar.

---

## 15. Unificación de los documentos de Drive — patrón común (IMPLEMENTADO, 2026-06-17)

### 15.1 Motivación

Las características que producen un documento en Drive lo hacían de forma inconsistente: Propiedades
(SPEC-0006) y Formularios (SPEC-0008) ofrecen un botón de volcado, pero con etiquetas y claves i18n
distintas («Volcar a Google Sheets» vs «Volcar a Sheets») y sin componente compartido; Objetos custom
(SPEC-0007) no ofrecía documento alguno. Además, el §2 de este SPEC declaraba a Drive como **fuente de
verdad** con sincronización donde «Drive manda», en contradicción con lo realmente implementado en
SPEC-0006 §18 y SPEC-0008 (la fuente operativa es el estado local). Esta sección unifica el patrón y
formaliza la decisión.

Esta sección es **transversal**: define el patrón canónico y los componentes compartidos. Cada SPEC de
característica (0006, 0007, 0008) añade su propia sección que lo referencia y describe su builder/parser
concreto.

### 15.2 Decisión: Drive no es fuente de verdad

- El estado operativo de cada característica vive en `electron-store` (local) y/o HubSpot.
- El documento de Drive es un **artefacto exportable y reimportable**, no la fuente de verdad.
- No hay sincronización automática al abrir la app ni resolución automática de conflictos.
- Toda escritura a Drive es una **acción explícita** del usuario (botón crear-o-actualizar).
- Toda lectura de vuelta es una **carga explícita** que sobrescribe el estado local del feature, previa
  confirmación.

### 15.3 Patrón de UI unificado

Tres elementos comunes, idénticos en todas las características que tengan documento Drive:

1. **Botón único «Actualizar archivo en Drive»** (crear-o-actualizar):
   - Si el documento del feature no existe en la carpeta seleccionada, lo **crea**; si existe (mismo
     `featureKey`/`appProperties`), lo **actualiza** reescribiendo su contenido.
   - **Best-effort**: si no hay cuenta de Google conectada o carpeta seleccionada, la acción no falla;
     muestra un aviso indicando que falta configurar Drive. El estado local sigue siendo válido.
   - Sustituye a los actuales «Volcar a Google Sheets» / «Volcar a Sheets». Se elimina el verbo «volcar».
   - Tras éxito, registra el `lastWrittenAt` (timestamp) del documento en el estado del feature (ver 15.4).

2. **Botón «Cargar desde Drive»** (reimportar):
   - Lee el documento del feature desde Drive y **reconstruye el estado local** a partir del esquema
     versionado que la propia app escribió (ver 15.5).
   - Pide **confirmación** antes de sobrescribir el estado local (la carga es destructiva).
   - Best-effort igual que el botón de actualizar.

3. **Modal recordatorio al salir con cambios sin actualizar**:
   - Cada feature mantiene un flag *dirty* = «hay cambios locales posteriores al último
     `lastWrittenAt`».
   - Al navegar fuera de la pantalla del feature con estado *dirty*, se muestra un modal:
     «Tienes cambios sin guardar en Drive. ¿Actualizar el archivo ahora?» con acciones
     **[Actualizar y salir]** / **[Salir sin actualizar]** / **[Cancelar]** y un checkbox
     **«No volver a preguntar en este proyecto»**.
   - La preferencia «no volver a preguntar» se persiste por proyecto en `electron-store`.

### 15.4 Componentes y contratos compartidos

Por ser interacción genérica con el conector de Drive, los elementos compartidos se definen aquí:

- **Hook `useDriveDoc`** (`renderer/shared/hooks/`): encapsula el estado *dirty*, el `lastWrittenAt`, y las
  acciones `update()` / `load()` para un feature dado. Recibe el canal IPC de escritura/lectura y un
  selector del timestamp del último cambio local.
- **Componente `DriveDocActions`** (`renderer/shared/components/`): renderiza los dos botones
  («Actualizar archivo en Drive», «Cargar desde Drive») con estados busy/disabled y el aviso de
  éxito/error, usando claves i18n compartidas `drive.doc.*` (`update`, `updating`, `load`, `loading`,
  `updateSuccess`, `updateError`, `loadSuccess`, `loadError`, `noFolder`).
- **Componente `DriveDirtyGuard`** (`renderer/shared/components/`): el modal recordatorio descrito en
  15.3.3, con claves i18n compartidas `drive.dirtyGuard.*`. Se integra con el router del App Shell
  (SPEC-0002) mediante un guard de navegación; el estado *dirty* lo aporta cada feature.
- **Persistencia de «no volver a preguntar»**: clave por proyecto en `electron-store`
  (`driveDirtyGuard.skip.<featureKey>`).

### 15.5 Lectura de vuelta — documento de estado companion (decisión de implementación)

**Decisión 2026-06-17 (implementada).** En lugar de parsear el Google Sheets «bonito» (que es un
resumen legible y, por tanto, *lossy*: aplana entradas→fuentes→opciones, guarda nombres en vez de IDs,
no serializa la estructura completa de formularios u objetos), la carga se hace desde un **documento de
estado companion**: un Google Doc gestionado, por característica, cuyo cuerpo es el **JSON íntegro** del
estado local. Ventajas: round-trip 100% fiel, reutiliza el `writeFile`/`readFile` ya probados del
conector (cero cambios en `sheets-client`/`sheets-style` ni en sus tests), y mantiene el Sheets limpio
para humanos. Por ello **no** se implementa `readSpreadsheet`.

- **Escritura.** «Actualizar archivo en Drive» escribe **dos** ficheros gestionados en la carpeta del
  proyecto: el Sheets legible (`featureKey` del feature, vía `writeSpreadsheet`) y el Doc de estado
  (`featureKey` + sufijo `-state`, vía `writeFile`) con `serializeXState(snapshot)` →
  `JSON.stringify({ schema_version, …datos })`.
- **Lectura.** «Cargar desde Drive» hace `readFile({ featureKey: '<feature>-state' })` y
  `parseXState(content)`: valida `schema_version`; si es **mayor** que la soportada, aborta con aviso (la
  app es más antigua que el documento); reconstruye el estado local **sobrescribiéndolo**.
- Canales IPC por feature: `properties:load-sheets` / `forms:load-sheets` / `custom-objects:load-sheets`
  (carga) y `properties:drive-meta` / `forms:drive-meta` / `custom-objects:drive-meta` (timestamps para
  el flag *dirty*). No se añade `gdrive:read-spreadsheet`.
- `featureKey` de estado: `property-management-state`, `forms-management-state`, `custom-objects-state`.

### 15.6 Alcance e impacto

- **SPEC-0004 (este)**: revoca Drive-fuente-de-verdad (§2); define `useDriveDoc`
  (`renderer/shared/hooks/`), `DriveDocActions` y `DriveDirtyGuard` (`renderer/shared/components/`) y las
  claves i18n compartidas `drive.doc.*` / `drive.dirtyGuard.*`. La carga usa el documento de estado
  companion vía `writeFile`/`readFile` (15.5), **no** `readSpreadsheet`.
- **SPEC-0006/0007/0008**: cada uno adopta el patrón (sección propia): botón unificado, modal al salir,
  carga desde el documento de estado con su `serialize`/`parse`. Objetos custom (0007) estrena documento
  Drive.

### 15.9 Notas de implementación (2026-06-17)

- **Componentes compartidos.** `useDriveDoc` (estado *dirty*, mensajes, `update()`/`load()`),
  `DriveDocActions` (los dos botones + Alert) y `DriveDirtyGuard` (modal). El guard usa `useBlocker` de
  react-router (la app monta `RouterProvider` con `createMemoryRouter`, un data router), por lo que **no**
  hizo falta tocar `router.tsx`.
- **«No volver a preguntar».** Se persiste en `localStorage` del renderer con clave
  `revops:driveGuardSkip:<projectId>:<featureKey>` (en lugar de electron-store, para no añadir un canal
  IPC). Es persistencia por proyecto + característica equivalente.
- **Tipos compartidos.** `DriveDocMeta` y `LoadSheetsResult` en `shared/types/gdrive.ts`.
- **Cableado.** Canales y métodos `*LoadSheets` / `*DriveMeta` (y `customObjectsWriteSheets`) en
  `ipc.ts`/`preload`/`main`. Los handlers de escritura ahora escriben Sheets + Doc de estado y registran
  `lastWrittenAt`.
- **Estado *dirty*.** Cada servicio persiste `lastWrittenAt`/`lastChangedAt` por proyecto; las mutaciones
  fijan `lastChangedAt`, la escritura fija `lastWrittenAt` y la carga iguala ambos.
- **Verificación.** Pendiente `npm run typecheck` / `npm run test` en la máquina del usuario (el espejo del
  sandbox corrompe ficheros; los originales se verificaron sanos vía herramienta de lectura).

### 15.7 Tests requeridos

- `client.spec.ts` / conector: `readSpreadsheet` localiza por `appProperties` y mapea hojas; devuelve
  `null` si no existe.
- `useDriveDoc.spec.ts`: cálculo del flag *dirty* a partir de `lastWrittenAt` vs último cambio local.
- Funcional: salir de una pantalla *dirty* dispara el modal; «no volver a preguntar» lo silencia en el
  proyecto; «Cargar desde Drive» pide confirmación y reconstruye el estado (mock del conector).

### 15.8 Fuera de alcance

- Interpretar ediciones manuales del usuario fuera del esquema (la carga reimporta el documento generado
  por la app; las celdas editadas a mano que no encajen en el esquema se ignoran).
- Sincronización automática o en segundo plano.

---

## 16. Adopción de feedback global (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgo #1. El feedback de "credenciales guardadas" solo limpia el input sin confirmar (`GoogleCredentialsCard.tsx`); el resultado de sincronización y los conflictos no se confirman con un toast.

Adopción de SPEC-0002 §10 (Snackbar):
- Guardado de credenciales (éxito/error) → `notify(...)`.
- Resultado de sincronización (archivos subidos/bajados) y aviso de conflictos → `notify(...)` (los conflictos pueden seguir mostrando además su `Alert` de detalle).

No hay acciones destructivas en este conector que requieran `ConfirmDialog` en esta iteración (la selección de carpeta no es destructiva).

Claves i18n nuevas: `gdrive.credentialsSaved`, `gdrive.credentialsError`, `gdrive.syncDone` (cuatro locales).

> 2026-06-19 (a11y, SPEC-0002 §16): `SearchIcon` decorativo del selector de carpeta marcado `aria-hidden`.

## 17. Adopción del patrón de estados de carga (SPEC-0002 §17) (BORRADOR, 2026-06-22)

`GoogleDriveConnectorScreen` y, sobre todo, `FolderPickerDialog` adoptan el patrón de SPEC-0002 §17. El selector
de carpeta es el caso claro: al abrirlo aparece **de inmediato** con un `LoadingState` (variante `list`) y
`aria-busy` mientras lista las carpetas de Drive; al navegar a una carpeta se resetea el listado (no se muestran
carpetas del nivel anterior) y se vuelve a cargar. Las acciones (guardar credenciales, sincronizar) pasan a
estado ocupado accesible. Pendiente de implementación junto al resto de superficies.
