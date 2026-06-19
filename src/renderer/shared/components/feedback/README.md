# shared/components/feedback

Primitivas de feedback de shell, compartidas por todas las features (SPEC-0002 §10 y §11). Se montan una sola vez en `app/App.tsx`.

## Snackbar global (§10)

```ts
import { useSnackbar } from '@shared/components/feedback';
const { notify } = useSnackbar();
notify({ message: t('forms.syncToastDone'), severity: 'success' });
```

- `message`: texto **ya traducido** (el provider no traduce).
- `severity`: `success` (def.) | `info` | `warning` | `error`.
- `autoHideMs`: opcional. Por defecto `success`/`info` 4 s, `warning` 6 s, `error` persistente.
- Una notificación visible a la vez; el resto se encola (FIFO).
- Accesible: `role="status"` (`aria-live="polite"`) salvo `error` → `role="alert"` (`assertive`).

## ConfirmDialog (§11)

```ts
import { useConfirm } from '@shared/components/feedback';
const confirm = useConfirm();
const ok = await confirm({ tone: 'danger', title: t('...'), body: t('...') });
if (!ok) return;
```

- Basado en promesa: resuelve `true` (aceptar) o `false` (cancelar/Escape).
- Foco inicial en **Cancelar**; `tone: 'danger'` pinta el botón confirmar en `color="error"`.
- Etiquetas por defecto: `common:confirm.accept` / `common:confirm.cancel`.

**Obligatorio** antes de cualquier acción destructiva (borrar, archivar, regenerar, descartar).
