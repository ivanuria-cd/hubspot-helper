/**
 * Integración con la Google Picker API (SPEC-0004 §2). El Picker es una UI web de Google que
 * debe cargarse en un contexto de navegador con el access token del usuario. El façade abre una
 * BrowserWindow con este HTML; la selección se comunica de vuelta vía `document.title`.
 */

export const PICKER_TITLE_PREFIX = 'REVOPS_PICKER:';

export interface PickerHtmlParams {
  accessToken: string;
  apiKey: string;
  appId: string;
}

/** Resultado que el façade extrae del título de la ventana del Picker. */
export interface PickerSelection {
  folderId: string;
  folderName: string;
}

export function parsePickerTitle(title: string): PickerSelection | null {
  if (!title.startsWith(PICKER_TITLE_PREFIX)) return null;
  try {
    const payload = JSON.parse(title.slice(PICKER_TITLE_PREFIX.length)) as Partial<PickerSelection>;
    if (!payload.folderId) return null;
    return { folderId: payload.folderId, folderName: payload.folderName ?? payload.folderId };
  } catch {
    return null;
  }
}

export function buildPickerHtml(params: PickerHtmlParams): string {
  const config = JSON.stringify({
    token: params.accessToken,
    apiKey: params.apiKey,
    appId: params.appId,
    prefix: PICKER_TITLE_PREFIX,
  });
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><title>Selecciona la carpeta de trabajo</title></head>
<body>
<script>
  const CFG = ${config};
  function onApiLoad() { gapi.load('picker', createPicker); }
  function createPicker() {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(CFG.token)
      .setDeveloperKey(CFG.apiKey)
      .setAppId(CFG.appId)
      .setCallback(function (data) {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          document.title = CFG.prefix + JSON.stringify({ folderId: doc.id, folderName: doc.name });
        } else if (data.action === google.picker.Action.CANCEL) {
          document.title = CFG.prefix + JSON.stringify({ folderId: '' });
        }
      })
      .build();
    picker.setVisible(true);
  }
</script>
<script async defer src="https://apis.google.com/js/api.js?onload=onApiLoad"></script>
</body>
</html>`;
}
