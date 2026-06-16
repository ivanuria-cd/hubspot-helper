import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { ObjectStatusBadge } from './ObjectStatusBadge';

interface ObjectPanelProps {
  definition: CustomObjectDefinition | null;
  busy: boolean;
  onApply: (changeId: string, environment: HubSpotEnvironment) => Promise<void>;
  onClose: () => void;
  onEdit: (definition: CustomObjectDefinition) => void;
  onArchive: (definition: CustomObjectDefinition) => void;
  onDelete: (objectId: string) => Promise<void>;
}

export function ObjectPanel({
  definition,
  busy,
  onApply,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}: ObjectPanelProps): JSX.Element {
  const { t } = useTranslation('common');
  const [confirmArchive, setConfirmArchive] = useState(false);

  return (
    <Drawer anchor="right" open={Boolean(definition)} onClose={onClose}>
      <Box sx={{ width: 420, p: 3 }} role="region" aria-label={t('customObjects.panel.title')}>
        {definition ? (
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {definition.labels.singular}
              </Typography>
              <ObjectStatusBadge status={definition.status} />
            </Stack>
            <Typography color="text.primary">
              {t('customObjects.panel.name')}: {definition.name}
            </Typography>
            <Typography color="text.primary">
              {t('customObjects.panel.primary')}: {definition.primaryDisplayProperty}
            </Typography>

            <Box>
              <Typography variant="subtitle2">{t('customObjects.panel.ids')}</Typography>
              <Typography variant="body2" color="text.primary">
                sandbox: {definition.objectTypeId?.sandbox ?? '—'} · production:{' '}
                {definition.objectTypeId?.production ?? '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('customObjects.panel.properties')}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {definition.properties.map((p) => (
                  <Chip key={p.name} size="small" variant="outlined" label={`${p.label} (${p.type})`} />
                ))}
              </Stack>
            </Box>

            <Divider />
            <Typography variant="subtitle2">{t('customObjects.panel.pendingChanges')}</Typography>
            {(definition.pendingChanges ?? []).length === 0 ? (
              <Typography variant="body2" color="text.primary">
                {t('customObjects.panel.noChanges')}
              </Typography>
            ) : (
              (definition.pendingChanges ?? []).map((change) => (
                <Box key={change.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {change.summary}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy || change.appliedToSandbox}
                      onClick={() => onApply(change.id, 'sandbox')}
                    >
                      {t('customObjects.changes.applySandbox')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy || change.appliedToProduction}
                      onClick={() => onApply(change.id, 'production')}
                    >
                      {t('customObjects.changes.applyProduction')}
                    </Button>
                  </Stack>
                </Box>
              ))
            )}

            <Divider />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" onClick={() => onEdit(definition)}>
                {t('customObjects.panel.edit')}
              </Button>
              {confirmArchive ? (
                <Button
                  color="error"
                  variant="contained"
                  disabled={busy}
                  onClick={() => {
                    onArchive(definition);
                    setConfirmArchive(false);
                  }}
                >
                  {t('customObjects.panel.confirmArchive')}
                </Button>
              ) : (
                <Button color="error" variant="outlined" onClick={() => setConfirmArchive(true)}>
                  {t('customObjects.panel.archive')}
                </Button>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Button color="inherit" onClick={() => void onDelete(definition.id)}>
                {t('customObjects.panel.deleteDraft')}
              </Button>
              <Button onClick={onClose}>{t('customObjects.panel.close')}</Button>
            </Stack>
            {confirmArchive ? (
              <Typography variant="body2" color="error">
                {t('customObjects.panel.archiveWarning')}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
