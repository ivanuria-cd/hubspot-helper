import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useTranslation } from 'react-i18next';
import { BusyButton, useSnackbar } from '@shared/components/feedback';
import type { PlanningChangelog } from '@shared/types/planning';

interface PlanningMapActionsProps {
  projectId: string;
  disabled?: boolean;
  onApplied?: () => void;
}

/**
 * Acciones del mapa de campos editable (SPEC-0016): generar el documento y ejecutar la ingest
 * (alerta + changelog antes de crear borradores, §2.6). La resolucion de tipos ambiguos inline
 * queda pendiente (incremento 7b): de momento se aplican con resolutions=[] y los ambiguos se
 * informan como bloqueados.
 */
export function PlanningMapActions({
  projectId,
  disabled,
  onApplied,
}: PlanningMapActionsProps): JSX.Element {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [changelog, setChangelog] = useState<PlanningChangelog | null>(null);

  const p = (key: string, opts?: Record<string, unknown>): string =>
    t(`properties.planningMap.${key}`, opts);

  async function handleGenerate(): Promise<void> {
    setGenerating(true);
    try {
      const result = await window.api.propertiesWritePlanningMap({ projectId });
      notify(
        result.success
          ? { message: p('generateDone'), severity: 'success' }
          : { message: p('error', { error: result.error ?? '' }), severity: 'error' },
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleImport(): Promise<void> {
    setImporting(true);
    try {
      const result = await window.api.propertiesImportPlanningMap({ projectId });
      if (!result.success || !result.changelog) {
        notify({ message: p('error', { error: result.error ?? '' }), severity: 'error' });
        return;
      }
      if (result.changelog.changes.length === 0 && result.changelog.needsAction.length === 0) {
        notify({ message: p('noChanges'), severity: 'info' });
        return;
      }
      setChangelog(result.changelog);
    } finally {
      setImporting(false);
    }
  }

  async function handleApply(): Promise<void> {
    setApplying(true);
    try {
      const result = await window.api.propertiesApplyPlanningImport({ projectId, resolutions: [] });
      if (!result.success) {
        notify({ message: p('error', { error: result.error ?? '' }), severity: 'error' });
        return;
      }
      notify({ message: p('applyDone', { applied: result.applied ?? 0 }), severity: 'success' });
      if (result.blocked && result.blocked.length > 0) {
        notify({
          message: p('applyBlocked', { blocked: result.blocked.length }),
          severity: 'warning',
        });
      }
      setChangelog(null);
      onApplied?.();
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        <BusyButton
          busy={generating}
          onClick={handleGenerate}
          disabled={disabled}
          startIcon={<TableChartIcon />}
          variant="outlined"
        >
          {p('generate')}
        </BusyButton>
        <BusyButton
          busy={importing}
          onClick={handleImport}
          startIcon={<MoveToInboxIcon />}
          variant="outlined"
        >
          {p('import')}
        </BusyButton>
      </Stack>

      <Dialog open={changelog !== null} onClose={() => setChangelog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{p('changelogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {p('changelogIntro')}
          </Typography>
          <List dense>
            {changelog?.changes.map((change, index) => (
              <ListItem key={`change-${index}`} disableGutters>
                <ListItemText
                  primary={`${t(`properties.planningMap.kind.${change.kind}`)}: ${change.hubspotName ?? change.entryName}`}
                  secondary={change.detail}
                />
              </ListItem>
            ))}
          </List>
          {changelog && changelog.needsAction.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">{p('needsActionTitle')}</Typography>
              <List dense>
                {changelog.needsAction.map((action, index) => (
                  <ListItem key={`needs-${index}`} disableGutters>
                    <ListItemText primary={`${action.entryName} — ${action.userFriendlyType}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangelog(null)}>{p('cancel')}</Button>
          <BusyButton busy={applying} onClick={handleApply} startIcon={<PlaylistAddCheckIcon />}>
            {p('apply')}
          </BusyButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
