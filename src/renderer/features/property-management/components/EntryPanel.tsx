import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, HsPropertyChange, PropertyEntry } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { StatusBadge } from './StatusBadge';

interface EntryPanelProps {
  entry: PropertyEntry | null;
  origins: DataOrigin[];
  busy?: boolean;
  onClose: () => void;
  onEdit: (entry: PropertyEntry) => void;
  onDelete: (entryId: string) => void;
  onApply: (changeId: string, environment: HubSpotEnvironment) => Promise<void>;
}

function destName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

export function EntryPanel({ entry, origins, busy, onClose, onEdit, onDelete, onApply }: EntryPanelProps): JSX.Element {
  const { t } = useTranslation('common');
  const originName = new Map(origins.map((o) => [o.id, o.name]));
  const [confirm, setConfirm] = useState<HsPropertyChange | null>(null);

  const apply = async (environment: HubSpotEnvironment): Promise<void> => {
    if (!confirm) return;
    await onApply(confirm.id, environment);
    setConfirm(null);
  };

  return (
    <Drawer anchor="right" open={Boolean(entry)} onClose={onClose}>
      <Box sx={{ width: 420, p: 3 }} role="region" aria-label={t('properties.panel.definition')}>
        {entry ? (
          <>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {entry.name}
              </Typography>
              <StatusBadge status={entry.hubspotStatus} />
              <IconButton aria-label={t('properties.wizard.editTitle')} onClick={() => onEdit(entry)}>
                <EditIcon />
              </IconButton>
              <IconButton aria-label={t('properties.panel.delete')} onClick={() => onDelete(entry.id)}>
                <DeleteIcon />
              </IconButton>
              <IconButton aria-label={t('properties.panel.close')} onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.primary">
              {t('properties.panel.object')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              {entry.objectType}
            </Typography>
            <Typography variant="caption" color="text.primary">
              {t('properties.entry.dest')}
            </Typography>
            <Typography variant="body2">
              {destName(entry)}
              {entry.hubspotProperty.mode === 'new' ? ` (${t('properties.wizard.new')})` : ''}
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              {t('properties.entry.sources')}
            </Typography>
            {entry.sources.length === 0 ? (
              <Typography variant="body2" color="text.primary">
                {t('properties.entry.noSources')}
              </Typography>
            ) : (
              <List dense disablePadding>
                {entry.sources.map((source) => (
                  <ListItem key={source.id} disableGutters>
                    <ListItemText
                      primary={`${originName.get(source.originId) ?? source.originId} · ${source.sourceField}`}
                      secondary={`${t('properties.wizard.kind')}: ${t(`properties.kinds.${source.definition.kind}`)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              {t('properties.panel.pendingChanges')}
            </Typography>
            {entry.pendingChanges?.length ? (
              <Stack spacing={1}>
                {entry.pendingChanges.map((change) => {
                  const done = change.appliedToProduction
                    ? t('properties.changes.productionDone')
                    : change.appliedToSandbox
                      ? t('properties.changes.sandboxDone')
                      : null;
                  return (
                    <Stack key={change.id} spacing={0.5}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={busy}
                        onClick={() => setConfirm(change)}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      >
                        {change.summary}
                      </Button>
                      {done ? (
                        <Typography variant="caption" color="text.primary">
                          {t('properties.panel.applied')}: {done}
                        </Typography>
                      ) : null}
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.primary">
                {t('properties.panel.noChanges')}
              </Typography>
            )}
          </>
        ) : null}
      </Box>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <DialogTitle>{t('properties.panel.applyTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>{confirm?.summary}</DialogContentText>
          <DialogContentText variant="body2">{t('properties.panel.applyHint')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>{t('properties.wizard.cancel')}</Button>
          <Button variant="outlined" disabled={busy} onClick={() => apply('sandbox')}>
            {t('properties.changes.applySandbox')}
          </Button>
          <Button variant="contained" disabled={busy} onClick={() => apply('production')}>
            {t('properties.changes.applyProduction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
