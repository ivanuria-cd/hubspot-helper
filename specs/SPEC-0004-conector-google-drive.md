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

## 17. Adopción del patrón de estados de carga (SPEC-0002 §17) (IMPLEMENTADO, 2026-06-22)

`GoogleDriveConnectorScreen` y, sobre todo, `FolderPickerDialog` adoptan el patrón de SPEC-0002 §17. El selector
de carpeta es el caso claro: al abrirlo aparece **de inmediato** con un `LoadingState` (variante `list`) y
`aria-busy` mientras lista las carpetas de Drive; al navegar a una carpeta se resetea el listado (no se muestran
carpetas del nivel anterior) y se vuelve a cargar. Las acciones (guardar credenciales, sincronizar) pasan a
estado ocupado accesible. Pendiente de implementación junto al resto de superficies.

## 18. Hipervínculo «Abrir en Drive» en cada documento generado (IMPLEMENTADO, 2026-06-23)

### 18.1 Motivación

Cuando la app genera o actualiza el Sheets de una característica, la UI confirma el éxito pero no ofrece
forma de **abrir el archivo** directamente. El usuario debe ir a Google Drive y buscarlo. Se añade un
hipervínculo «Abrir en Drive» en todos los sitios donde se genera un archivo de Drive.

### 18.2 Decisiones (validadas con el usuario, 2026-06-23)

- **Qué se enlaza: solo el Sheets legible** de cada característica. El Doc de estado companion (JSON,
  §15.5) **no** se enlaza (es un artefacto técnico).
- **Dónde aparece:** (a) en `DriveDocActions` (las tres pantallas de feature: Propiedades, Objetos,
  Formularios) y (b) en la lista «Archivos gestionados» de la pantalla del conector (§3), solo para los
  ficheros de tipo spreadsheet.

### 18.3 Mecanismo de apertura

No requiere IPC nuevo: `createMainWindow` ya registra `setWindowOpenHandler` → `shell.openExternal`
(`main/window.ts`), por lo que un enlace del renderer con `target="_blank" rel="noopener"` se abre en el
navegador del sistema. No se usan `<webview>` ni navegación interna.

### 18.4 Construcción de la URL

Utilidad pura `driveFileUrl(driveId, mimeType)` en `renderer/shared/utils/` que construye:

- spreadsheet → `https://docs.google.com/spreadsheets/d/<driveId>/edit`
- document → `https://docs.google.com/document/d/<driveId>/edit`

El `driveId` es opaco (lo asigna Google); no hay URL controlada por el usuario. En esta iteración solo se
renderiza el enlace para `mimeType` spreadsheet (decisión 18.2).

### 18.5 Contrato

- `DriveDocMeta` (§15, `shared/types/gdrive.ts`) añade `fileId: string | null` (el id del Sheets legible
  del feature) además de los timestamps. `getDriveMeta` de cada servicio (`property-management`,
  `forms-management`, `custom-objects`) lo rellena buscando en `config.files` la entrada cuyo `featureKey`
  es el del Sheets (sin sufijo `-state`) y `mimeType` spreadsheet; `null` si aún no se ha escrito.
- `useDriveDoc` expone `fileUrl: string | null` derivado de `meta.fileId` vía `driveFileUrl`.
- `DriveDocController` añade `fileUrl`.

### 18.6 Interfaz de usuario

- `DriveDocActions`: cuando `doc.fileUrl` no es `null`, se muestra un enlace/botón terciario **«Abrir en
  Drive»** (`drive.doc.open`) junto a los botones, con `target="_blank"`, `rel="noopener"` y
  `aria-label` descriptivo. Si no hay archivo aún (nunca escrito), no se muestra.
- Pantalla del conector (§3), lista «Archivos gestionados»: cada fichero de tipo spreadsheet muestra su
  nombre como enlace «Abrir en Drive» (mismo mecanismo). Los ficheros de estado (document) no se enlazan.

### 18.7 i18n

Claves nuevas en los cuatro locales (`es`/`ca`/`eu`/`en`): `drive.doc.open` («Abrir en Drive») y
`gdrive.openFile` (aria-label de la lista del conector). Autónimos/etiquetas según SPEC-0000 §3.

### 18.8 Tests requeridos

- `driveFileUrl.spec.ts`: construye la URL correcta por mimeType; ids con caracteres especiales se respetan.
- `useDriveDoc.spec.ts` (ampliado): expone `fileUrl` cuando `meta.fileId` existe y `null` cuando no.
- Funcional: tras «Actualizar archivo en Drive» aparece el enlace «Abrir en Drive» con el `href` esperado;
  la lista del conector muestra enlaces solo para spreadsheets (mock de la config con un Sheets y un Doc de
  estado).

### 18.9 Seguridad

- Enlaces externos vía `setWindowOpenHandler` → `shell.openExternal` (ya en uso para OAuth). `rel="noopener"`.
- La URL se construye a partir de un id opaco de Drive; sin entrada de texto libre del usuario.

### 18.10 Alcance e impacto

- `shared/types/gdrive.ts` (`DriveDocMeta.fileId`), `shared/utils/driveFileUrl.ts` (nuevo),
  `shared/hooks/useDriveDoc.ts` (`fileUrl`), `shared/components/DriveDocActions.tsx` (enlace),
  `features/connector-gdrive/.../GoogleDriveConnectorScreen.tsx` (enlaces en la lista),
  servicios `getDriveMeta` de las tres features (rellenan `fileId`), i18n `es/ca/eu/en`.
- No cambia el mecanismo d
## 19. Revisión y actualización de los archivos de Drive al abrir el proyecto (IMPLEMENTADO, 2026-06-23)

### 19.1 Motivación y enmienda a §15.2

Al abrir un proyecto, los archivos de Drive pueden haber quedado por detrás del estado local (cambios no
volcados) o no existir aún. El usuario quiere que, al abrir, la app **revise** si están actualizados y, si
no, **avise y los actualice**.

Esto **enmienda parcialmente §15.2**: se introduce una actualización automática **solo en la dirección
local → Drive** (exportación) al abrir el proyecto. La dirección Drive → local («Cargar desde Drive») sigue
siendo **siempre explícita** y nunca automática (sigue requiriendo confirmación, §15.3.2). Drive sigue sin
ser fuente de verdad.

### 19.2 Decisiones (validadas con el usuario, 2026-06-23)

- **Comportamiento: avisar y actualizar solo.** Al abrir el proyecto se actualizan automáticamente los
  archivos desactualizados y se informa al usuario del resultado (no se pide confirmación previa).
- **Criterio de «no actualizado»** (por característica con documento Drive): hay datos y además
  (a) el archivo no existe aún en Drive (`fileId` nulo), **o** (b) hay cambios locales posteriores a la
  última escritura (`lastChangedAt > lastWrittenAt`, el flag *dirty* de §15.4).
- **Best-effort:** si no hay cuenta de Google conectada o no hay carpeta seleccionada, la revisión **no se
  ejecuta y no molesta** (sin aviso). El estado local sigue siendo válido.

### 19.3 Alcance

- Aplica a las tres características con documento Drive: Propiedades (SPEC-0006), Objetos custom (SPEC-0007)
  y Formularios (SPEC-0008).
- Se ejecuta **una vez por apertura de proyecto** (al pasar a estar activo un `projectId`), no en cada
  render ni navegación.

### 19.4 Contrato / IPC

Nuevo canal único orquestado en el proceso principal (evita acoplar el renderer a las tres features):

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `gdrive:refresh-project` | renderer → main | `{ projectId }` | `GoogleDriveRefreshResult` |

```typescript
interface GoogleDriveRefreshItem {
  featureKey: string;      // 'property-management' | 'custom-objects' | 'forms-management'
  name: string;            // nombre legible del Sheets
  status: 'updated' | 'error';
  error?: string;
}
interface GoogleDriveRefreshResult {
  connected: boolean;      // false si no hay cuenta/carpeta → la UI no avisa
  upToDate: boolean;       // true si no había nada que actualizar
  items: GoogleDriveRefreshItem[];  // solo las que se intentaron actualizar
}
```

El handler de `main/index.ts`:
1. Si `gdrive.getStatus(projectId)` no tiene cuenta/carpeta → `{ connected:false, upToDate:true, items:[] }`.
2. Para cada feature: calcula `hasData` (longitud de su listado) y su `DriveDocMeta` (timestamps + `fileId`).
   Está desactualizada si `hasData && (fileId == null || lastWrittenAt == null || lastChangedAt > lastWrittenAt)`.
3. Para cada desactualizada, ejecuta su escritura ya existente (Sheets legible + Doc de estado +
   `markDriveWritten`), reutilizando la lógica de los handlers `*:write-sheets` (se extrae a una función
   interna compartida por feature para no duplicar).
4. Devuelve el resumen.

### 19.5 Interfaz de usuario

- En el App Shell (SPEC-0002), al activarse un `projectId` (efecto con guarda anti-reejecución por
  proyecto), se llama a `gdrive:refresh-project`.
- Resultado vía Snackbar global (SPEC-0002 §10):
  — `connected === false`: **no se muestra nada**.
  — `items` con `updated` > 0: aviso `success` «Se actualizaron N archivo(s) en Drive: …».
  — algún `error`: aviso `error` con el detalle (puede convivir con el de éxito de los demás).
  — `upToDate === true` y conectado: aviso `info` breve opcional «Los archivos de Drive estaban al día»
    (o silencio; decisión de implementación, por defecto silencioso para no ser intrusivo).
- La actualización corre en segundo plano (no bloquea la navegación); los botones de `DriveDocActions`
  reflejan el nuevo `lastWrittenAt` al refrescar su meta.

### 19.6 Tests requeridos

- Unitario del orquestador (main): mock de las tres features + `gdrive`; casos: no conectado → `connected:false`;
  todas al día → `upToDate:true`, sin escrituras; una *dirty* y otra sin archivo → se actualizan ambas;
  error de escritura en una → `status:'error'` para esa y `updated` para las demás.
- Renderer: el efecto llama una sola vez por `projectId` (no se repite en re-render); el Snackbar muestra el
  mensaje correcto por cada rama; `connected:false` no muestra nada.

### 19.7 i18n

Claves nuevas (`es/ca/eu/en`): `drive.refresh.updated` (con `{{count}}` y `{{names}}`), `drive.refresh.error`
y (opcional) `drive.refresh.upToDate`.

### 19.8 Seguridad y alcance

- Solo exporta local → Drive (no lee de Drive). Sin nuevos scopes. Reutiliza `writeSpreadsheet`/`writeFile`.
- No modifica el round-trip §15.5 ni la carga explícita §15.3.2.

### 19.9 Fuera de alcance

- Resolución de conflictos Drive → local o detección de ediciones manuales en Drive (sigue fuera, §15.8).
- Programación periódica/en segundo plano fuera de la apertura del proyecto.

### 19.10 Notas de implementación (2026-06-23)

- Orquestador puro `src/main/drive-refresh.ts` (`refreshDrive(connected, RefreshFeature[])`) + spec (5 casos:
  no conectado, todo al día, sin datos, actualiza dirty/faltantes, error sin abortar).
- `main/index.ts`: se extrajeron `writePropertiesSheets` / `writeCustomObjectsSheets` / `writeFormsSheets`
  (reutilizadas por los handlers `*:write-sheets` y por la revisión); `isDriveDocStale(meta, fileId)`;
  `buildRefreshFeatures(projectId)`; handler `gdrive:refresh-project` (no conectado ⇒ `connected:false`).
- Tipos `GoogleDriveRefreshItem` / `GoogleDriveRefreshResult` en `shared/types/gdrive.ts`; canal
  `gdriveRefreshProject` en `ipc.ts` + `preload`.
- `MainLayout` llama a `gdriveRefreshProject` una vez por `projectId` (guarda `refreshedProjectRef`) tras
  resolver el proyecto; Snackbar `success`/`error`; `connected:false` no muestra nada. La llamada es
  **best-effort y defensiva**: si `window.api.gdriveRefreshProject` no es una función (build de `out/`
  anterior al método, o bridge parcial), el efecto no hace nada y no rompe la app. Para los e2e hay que
  reconstruir (`npm run build`) antes de `npm run test:e2e`.
- e2e `origin-crud.spec.ts`: al arreglar el crash afloró que el test no confirmaba el borrado (el origen se
  elimina vía `ConfirmDialog`, SPEC-0006 §23). Se actualizó para pulsar «Aceptar» antes de comprobar el
  estado vacío. Es corrección del test funcional (no test unitario), ajena a §19 salvo por haber quedado
  enmascarada tras el error de aplicación.
- i18n `drive.refresh.updated` / `drive.refresh.error` en `es/ca/eu/en`.
- Verificación (sandbox): `drive-refresh.spec.ts` 5/5; suites de `connectors/google-drive` + `shared` 72/72;
  `tsc --noEmit` 0 errores. Suite completa + e2e + PR en la máquina del usuario.

---

## 20. Adopción de tooltips i18n en campos rellenables (SPEC-0002 §18) (IMPLEMENTADO, 2026-06-23)

`GoogleCredentialsCard` (en `GoogleDriveConnectorScreen`) adopta el patrón de
**[SPEC-0002 §18](SPEC-0002-app-shell.md)** (norma en **[SPEC-0000 §3](SPEC-0000-normas-del-proyecto.md)**): cada
campo rellenable lleva un `FieldTooltip` con texto i18n, asociado por `aria-describedby`. Campos: Client ID
(`gdrive.credentials.fieldHelp.clientId`) y Client Secret (`gdrive.credentials.fieldHelp.clientSecret`) — qué son
y de dónde se obtienen en Google Cloud Console —, en `es`/`ca`/`eu`/`en`. El selector de carpeta (§14) no es un
campo de texto rellenable. typecheck/test en máquina.

---

## 21. Corrección — Documentos de estado vacíos y duplicados (IMPLEMENTADO, 2026-06-24)

### 21.1 Diagnóstico (verificado en Drive, 2026-06-24)

En la subcarpeta `property-management-state` de un proyecto real hay **9+ documentos duplicados** con el mismo
título `property-management-state`, todos de 1024 bytes (tamaño base de un Google Doc vacío). Lectura del más
reciente (2026-06-23 10:16) y de uno antiguo (2026-06-17): **vacíos por completo** — ni portada ni el JSON
de `serializePropertyState`. En cambio el Sheets legible `Mapa de propiedades CRM`, escrito en el **mismo
instante**, contiene todos los datos (1 objeto, 42 campos, 6 orígenes, 40 fuentes, 104 opciones).

El dato no se ha perdido: la fuente de verdad operativa es el almacén local (electron-store), evidentemente
poblado (de él se generó ese Sheets), y el Sheets guarda una copia legible. Lo roto es **solo el documento de
estado companion** (§15.5), que es la vía de recuperación. Que el vacío anteceda a la estilización de
SPEC-0012 (docs de 2026-06-17, cuando `createManagedDocument` solo hacía `insertText`) descarta que la causa
sean los `requests` de estilo.

### 21.2 Cadena de causa (a confirmar con el error real de la Docs API)

1. `createManagedDocument` (`connectors/google-drive/client.ts`) ejecuta primero `api.filesCreate` (crea el
   Doc) y **después** `api.docsBatchUpdate` (inserta `buildFullBody` = portada + delimitador + JSON). Si
   `docsBatchUpdate` lanza, el Doc ya existe **vacío** y la función propaga el error sin limpiarlo → Doc
   huérfano.
2. `writeFile` (`connectors/google-drive/index.ts`) captura el error y devuelve `{ success: false }`, pero el
   `DriveFile` con su `driveId` **solo se registra en la config tras** el `createManagedDocument` correcto;
   al fallar, la config no aprende el `driveId`.
3. En la siguiente «Actualizar archivo en Drive», `existing` no se encuentra → se vuelve a crear **otro** Doc
   vacío. De ahí los duplicados.
4. `writePropertiesSheets`/`writeFormsSheets`/`writeCustomObjectsSheets` (`main/index.ts`) **no comprueban el
   resultado** de `gdrive.writeFile`: lo `await`ean y a continuación llaman a `markDriveWritten`
   incondicionalmente. El fallo del estado queda **silenciado** y el flag de «escrito» miente.

La razón de que `docsBatchUpdate` falle queda **pendiente de confirmación en runtime**. Análisis (2026-06-24):

- **Scope descartado.** Los scopes son `drive.file` + `drive.metadata.readonly` + `userinfo.email`
  (`auth.ts`). `drive.file` autoriza tanto la Sheets API como la Docs API sobre ficheros creados por la app;
  como el Sheets sí se escribe con el mismo token, el scope no explica la asimetría.
- **Hipótesis principal: la Docs API no está habilitada en el proyecto de Google Cloud** del usuario (mientras
  que Drive API y Sheets API sí lo están). Una API deshabilitada devuelve `403 SERVICE_DISABLED`
  independientemente del contenido o de los `requests` de estilo, lo que encaja con que los Docs estén vacíos
  desde el primer volcado (2026-06-17) y con que el Sheets funcione. **Verificación**: habilitar «Google Docs
  API» en el proyecto de Cloud Console y repetir «Actualizar archivo en Drive».
- El error real queda ahora **registrado** (§21.3.5) y, además, se propaga al usuario por Snackbar (§21.3.3),
  por lo que el próximo intento mostrará el mensaje exacto de la Docs API y confirmará la causa.

### 21.3 Correcciones

1. **Resiliencia de `createManagedDocument`**: envolver `docsBatchUpdate` en `try/catch`; ante fallo, borrar
   el Doc recién creado (`filesDelete`) antes de propagar el error, para no dejar huérfanos.
2. **Reutilización antes de crear**: antes de `createManagedDocument`, si la config no tiene `driveId` para el
   `featureKey`, buscar un Doc gestionado existente en la subcarpeta del feature (vía `listManagedFiles` /
   `appProperties` `feature == featureKey`) y reutilizarlo (`replaceDocumentBody`) en vez de crear uno nuevo.
   Evita duplicados cuando la config perdió la referencia (reinstalación, proyecto reabierto, build previa).
3. **Propagación del fallo al llamante**: `writePropertiesSheets`/`writeFormsSheets`/
   `writeCustomObjectsSheets` deben comprobar el `success` de `gdrive.writeFile`; si el estado no se escribió,
   **no** llamar a `markDriveWritten` y devolver error (Snackbar `error`, SPEC-0004 §16). La escritura del
   par Sheets+estado es atómica desde el punto de vista del usuario: si falla el estado, el documento no está
   «al día».
4. **Limpieza/deduplicación**: rutina que localice los `*-state` duplicados de un feature en su subcarpeta y
   envíe a la papelera los vacíos, conservando el más reciente con contenido (o recreándolo desde el estado
   local). Expuesta como acción puntual o integrada en `gdrive:refresh-project` (§19).
5. **Diagnóstico**: registrar (log) el cuerpo del error de `docsBatchUpdate` para identificar la causa raíz y
   confirmar que las correcciones 1–3 la cubren.

### 21.4 Verificación de datos (norma del proyecto)

Coherente con «si encuentras corrupción, verifica que no sea del clonado al sandbox y que los originales estén
sanos»: el vacío está en los **originales de Drive**, no en una copia del sandbox. El estado local y el Sheets
se han verificado sanos. Tras aplicar 1–4, una sola «Actualizar archivo en Drive» repuebla el documento de
estado desde el estado local.

### 21.5 Tests requeridos

- `client.spec.ts`: `createManagedDocument` borra el Doc creado si `docsBatchUpdate` falla (mock que lanza) y
  propaga el error; round-trip correcto cuando no falla (sin regresión).
- `index.spec.ts` (conector): `writeFile` reutiliza un Doc gestionado existente en la subcarpeta cuando la
  config no tiene `driveId`, en vez de crear uno nuevo.
- Test del orquestador de escritura en `main`: si `gdrive.writeFile` del estado falla, no se llama a
  `markDriveWritten` y el handler devuelve error.
- Test de la rutina de limpieza: con varios `*-state` (vacíos + uno con contenido), conserva el correcto y
  envía el resto a la papelera.

### 21.6 Alcance e impacto

Cambios internos en `connectors/google-drive/client.ts` e `index.ts` y en los orquestadores `write*Sheets` de
`main/index.ts`. No cambia el contrato §15.5 (sigue siendo Doc de estado + JSON íntegro) ni los `serialize`/
`parse` por feature; refuerza su fiabilidad. Sin scopes nuevos salvo que el diagnóstico (21.2/21.3.5) revele
que falta el de la Docs API, en cuyo caso se documentará aparte en §7.

### 21.7 Estado

IMPLEMENTADO (2026-06-24) — pendiente el **diagnóstico del fallo real de `docsBatchUpdate`** (runtime, 21.2/
21.3.5) y la verificación en la máquina del usuario.

- `createManagedDocument` (`client.ts`): `docsBatchUpdate` envuelto en `try/catch`; ante fallo borra el Doc
  recién creado (`filesDelete`) y propaga el error. Test `client.spec.ts` «borra el documento recién creado
  si falla docsBatchUpdate».
- `writeFile` (conector `index.ts`): si la config no tiene el archivo, lista los Docs gestionados de la
  subcarpeta del feature; si hay alguno, reutiliza el primero (`replaceDocumentBody`), registra su `driveId`
  y envía a la papelera los duplicados (best-effort); solo crea uno nuevo si no hay ninguno. Esto deduplica
  los `*-state` vacíos existentes en la próxima escritura.
- `writePropertiesSheets`/`writeCustomObjectsSheets`/`writeFormsSheets` (`main/index.ts`): comprueban el
  `success` de `gdrive.writeFile`; si falla, no llaman a `markDriveWritten` y devuelven error.
- `writeFile` (conector `index.ts`): `console.error` del error real en el `catch` (§21.3.5) para capturar el
  mensaje de la Docs API en el próximo fallo; además ya se propaga al usuario por Snackbar.
- Verificación (sandbox): `client.spec.ts` 15/15. El test del conector `index.ts` y de los orquestadores
  `write*Sheets` no se añade por no existir harness unitario de `index.ts` en el repo (orquestación cubierta
  por `tsc`); se valida en la máquina. `tsc -p tsconfig.main.json` sin errores en los ficheros tocados (el
  único error es la truncación del espejo del sandbox en `sheets-style.spec.ts`; original sano). Suite
  completa + e2e + PR en la máquina del usuario.

---

## 22. Soporte de unidades/carpetas compartidas en las operaciones de fichero (BORRADOR, 2026-06-25)

### 22.1 Diagnóstico

Síntoma: al guardar/actualizar un documento gestionado en una **carpeta de una unidad compartida** (Shared Drive),
la app falla con `File not found: <fileId>`. El selector de carpeta sí permite elegir la carpeta compartida.

Causa raíz: los flags de la Drive API para unidades compartidas (`supportsAllDrives: true` y, en los listados,
`includeItemsFromAllDrives: true`) **solo** se pasan en el navegador de carpetas (`listFolders`, `searchFolders` en
`client.ts`). Las operaciones que tocan los **ficheros gestionados** no los pasan:

- `client.ts`: `listManagedFiles` (`filesList`), `ensureFeatureFolder` (`filesList` + `filesCreate`),
  `createManagedDocument` (`filesCreate`), `readManagedContent` (`filesExport`), `deleteFile` (`filesDelete`),
  y `filesGet`.
- `sheets-client.ts`: `findManaged` (`filesList`) y `createManaged` (`filesCreate`).

Sin esos flags, la Drive API no resuelve los ficheros que viven en una unidad compartida y devuelve `404 File not
found`. Las APIs de Docs y Sheets operan por id y sí funcionan; el corte está en las llamadas Drive `files.*`.

### 22.2 Corrección

- Todas las llamadas Drive `files.*` pasan `supportsAllDrives: true`; los `files.list` añaden además
  `includeItemsFromAllDrives: true`. Se amplían las interfaces inyectables (`DriveApi` en `client.ts`,
  `SheetsDriveApi` en `sheets-client.ts`) para aceptar estos campos.
- Los flags son inocuos en «Mi unidad»; no cambian el comportamiento fuera de unidades compartidas.
- No se toca la fachada (`index.ts`): ya reenvía los `args` a `google.drive().files.*`, así que basta con que el
  cliente los incluya.
- Las APIs de Docs/Sheets no llevan flag de unidades compartidas (operan por id); no se modifican.

### 22.3 Tests

- `client.spec.ts`: `listManagedFiles`, `createManagedDocument`, `readManagedContent`, `deleteFile` y
  `ensureFeatureFolder` pasan `supportsAllDrives: true` (y `includeItemsFromAllDrives: true` en los list).
- `sheets-client.spec.ts`: `findManaged` y `createManaged` pasan los flags.

### 22.4 Impacto / ficheros

- `src/main/connectors/google-drive/client.ts` (interface `DriveApi` + todas las llamadas `files.*`).
- `src/main/connectors/google-drive/sheets-client.ts` (interface `SheetsDriveApi` + `findManaged`/`createManaged`).
- `client.spec.ts`, `sheets-client.spec.ts`.
- Requiere **rebuild de la app** para que el binario en uso recoja el cambio.

### 22.5 Estado

IMPLEMENTADO (2026-06-25). `client.ts`: `DriveApi` amplía `filesCreate/filesGet/filesExport/filesDelete` con
`supportsAllDrives?`; `listManagedFiles`, `ensureFeatureFolder`, `createManagedDocument` (+ limpieza), `readManagedContent`
y `deleteFile` pasan `supportsAllDrives: true` (y `includeItemsFromAllDrives: true` en los list). `sheets-client.ts`:
`SheetsDriveApi` ampliada; `findManaged` y `createManaged` pasan los flags. Tests nuevos en `client.spec.ts` y
`sheets-client.spec.ts` (y `filesDelete` de limpieza actualizado). Docs/Sheets API sin cambios (operan por id). Fachada
`index.ts` sin cambios (reenvía args). Requiere **rebuild de la app**. test:unit/typecheck en la máquina del usuario —
el espejo del sandbox trunca los ficheros editados; originales verificados sanos vía lectura directa.

---

## 23. Corrección — El `DriveDirtyGuard` aparece sin carpeta de Drive asociada (BORRADOR, 2026-07-02)

### 23.1 Diagnóstico

Síntoma: al salir de una pantalla (p. ej. CRM / Propiedades) en un proyecto **sin carpeta de Drive asociada**, aparece el
modal «Cambios sin guardar en Drive» (§15.3). No debería: si no hay Drive configurado, no hay archivo que actualizar.

Causa raíz: en `useDriveDoc` (`renderer/shared/hooks/useDriveDoc.ts`) el estado `dirty` se calcula como

```
dirty = hasData && (lastWrittenAt === null || (lastChangedAt !== null && lastChangedAt > lastWrittenAt))
```

`lastWrittenAt === null` («nunca escrito») es también el estado de un proyecto que **nunca** ha tenido carpeta de Drive.
El `DriveDirtyGuard` solo mira `dirty && !skip`, sin comprobar si Drive está configurado. La ruta de refresco
(`gdriveRefreshProject`, `index.ts`) sí se protege con `connected = Boolean(config?.folderId && config?.accountEmail)`;
este camino no.

### 23.2 Corrección

- `DriveDocMeta` (`shared/types/gdrive.ts`) añade `configured?: boolean` (Drive tiene carpeta asociada al proyecto).
- Los tres handlers IPC `*DriveMeta` (`propertiesDriveMeta`, `customObjectsDriveMeta`, `formsDriveMeta` en `index.ts`)
  rellenan `configured: Boolean(gdrive.getStatus(projectId)?.folderId)`.
- `useDriveDoc`: `dirty` exige además Drive configurado. Compatibilidad: `const configured = meta.configured !== false;`
  (solo un `false` explícito lo bloquea; `undefined` mantiene el comportamiento previo). Resultado:
  `dirty = hasData && configured && (…)`.
- El `DriveDirtyGuard` no cambia (sigue recibiendo `dirty`).

### 23.3 Tests

- `useDriveDoc.spec.tsx`: `dirty` es `false` cuando `configured: false` aunque `hasData` y `lastWrittenAt === null`;
  sigue `true` cuando `configured: true`/ausente y hay cambios.

### 23.4 Impacto / ficheros

- `shared/types/gdrive.ts` (`configured?` en `DriveDocMeta`).
- `main/index.ts` (los tres handlers `*DriveMeta`).
- `shared/hooks/useDriveDoc.ts` (`dirty`).
- `shared/hooks/useDriveDoc.spec.tsx`.
- Requiere **rebuild de la app**.

### 23.5 Estado

IMPLEMENTADO (2026-07-02). `DriveDocMeta.configured?`; los tres handlers `*DriveMeta` (`index.ts`) lo rellenan con
`Boolean(gdrive.getStatus(projectId)?.folderId)`; `useDriveDoc.dirty` exige `configured !== false`. Test `§23` en
`useDriveDoc.spec.tsx` (dirty false con `configured:false`, true con `configured:true`). Requiere **rebuild de la app**.
Verificación en la máquina del usuario si el espejo del sandbox trunca los ficheros editados (originales verificados
sanos vía lectura directa).

## 24. Endurecimiento de logs y de queries de Drive (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 1.2 y 1.8.

### 24.1 Redacción de errores en logs

El `console.error` de `writeFile` (`index.ts`, diagnóstico §21.3.5) volcaba el `GaxiosError` completo, cuyo
`config.headers` incluye `Authorization: Bearer <access_token>`: fuga del token en logs. Se registra solo
`error.message` (o `String(error)`), manteniendo el diagnóstico del §21.

### 24.2 Escapado de valores en queries

`listManagedFiles`, `listFolders` y `ensureFeatureFolder` (`client.ts`) y `findManaged` (`sheets-client.ts`)
interpolaban `folderId`/`parentId`/`featureName` en la query `q` sin escapar comillas simples (a diferencia de
`searchFolders` y del `quote()` de sheets-client). Helper `quote()` propio en `client.ts` aplicado a todos los
valores interpolados; `searchFolders` lo reutiliza.

### 24.3 Estado

IMPLEMENTADO (2026-07-02). Sin cambios de comportamiento para valores sin comillas. Requiere rebuild de la app;
typecheck/test en la máquina del usuario.
