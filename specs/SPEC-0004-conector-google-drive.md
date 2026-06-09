# SPEC-0004 — Conector Google Drive

**Estado:** VALIDADO — criterios de aceptación pendientes hasta implementación  
**Branch:** `feat/spec-0004-conector-google-drive`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0002

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
- La app usa los archivos Drive como fuente de verdad: al abrir la app, sincroniza el estado local con Drive. Si el usuario modificó manualmente el archivo, prevalece la versión de Drive. El usuario también puede solicitar una sincronización manual desde la app en cualquier momento sin necesidad de reiniciarla.
- Cada archivo tiene metadata de la app almacenada en las `appProperties` del fichero Drive (sin afectar al contenido visible).

### Conflictos
- La sincronización es unidireccional desde el punto de vista de la app: **Drive manda**.
- Si la app detecta que tiene datos más nuevos que Drive (el usuario cambió algo offline), muestra un aviso y deja al usuario decidir qué versión conservar.

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
| `https://www.googleapis.com/auth/drive.file` | Acceso a archivos creados por la app o seleccionados por el usuario |
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

- [ ] El flujo OAuth abre el navegador del sistema y completa la autenticación
- [ ] La carpeta se selecciona con el Picker de Google (UI nativa)
- [ ] Los archivos creados por la app aparecen en la carpeta de Drive
- [ ] Los archivos tienen portada con contexto en la primera sección
- [ ] La sincronización detecta y notifica conflictos correctamente
- [ ] Al desconectar, el token se revoca en Google y se elimina localmente
- [ ] Todos los tests del SPEC en verde
- [ ] Los tres tutoriales de usuario están creados en `doc/tutoriales/google-drive/`
- [ ] PR creada, revisada y mergeada en `main`
