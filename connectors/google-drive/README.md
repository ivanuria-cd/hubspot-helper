# connectors/google-drive

Cliente de la API de Google Drive (SPEC-0004). **Implementado** en
`src/main/connectors/google-drive/` (proceso principal de Electron), siguiendo el mismo patrón
de inyección de dependencias que el conector HubSpot.

Módulos:

- `auth.ts` — PKCE (verifier/challenge), construcción de URLs OAuth, intercambio y refresco de tokens (lógica pura e inyectable).
- `token-store.ts` — almacenamiento del `TokenSet` por proyecto en keytar (backend inyectable).
- `client.ts` — `DriveApi` (subconjunto de googleapis) + cliente de alto nivel (listar/crear/leer/actualizar, portada y `appProperties`).
- `sync.ts` — reconciliación y detección de conflictos (política «Drive manda»).
- `cover-template.ts` — generador de la portada de contexto con `schema_version`.
- `picker.ts` — HTML del Google Picker para la selección de carpeta.
- `index.ts` — façade: núcleo de orquestación con DI + wiring real (Electron, googleapis lazy, axios, keytar, electron-store).

Credenciales OAuth vía `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (opcional) y `GOOGLE_API_KEY`
para el Picker. Los tokens se guardan cifrados en el keychain del SO; nunca se exponen al renderer.

Instalar dependencias: `scripts\setup-gdrive-deps.cmd` (Windows).
