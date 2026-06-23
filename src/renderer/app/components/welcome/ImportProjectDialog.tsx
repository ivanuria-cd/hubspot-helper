import { useState } from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import type { ImportStrategy, ImportSummary } from '@shared/types/project-file';

interface ImportProjectDialogProps {
  open: boolean;
  summary: ImportSummary | null;
  onCancel: () => void;
  onImport: (strategy: ImportStrategy) => void;
}

/** Resumen previo + estrategia de colisión antes de aplicar un `.rvproj` (SPEC-0013 §3.2). */
export function ImportProjectDialog({
  open,
  summary,
  onCancel,
  onImport,
}: ImportProjectDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [strategy, setStrategy] = useState<ImportStrategy>('copy');

  const sectionStatusLabel = (status: string): string => {
    if (status === 'apply') return t('projectFile.sectionApply');
    if (status === 'skipped-newer') return t('projectFile.sectionSkippedNewer');
    return t('projectFile.sectionUnknown');
  };

  const connectors = summary?.project.connectors ?? {};
  const connectorNames = [
    connectors.hubspot ? 'HubSpot' : null,
    connectors.googleDrive ? 'Google Drive' : null,
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="import-dialog-title" maxWidth="sm" fullWidth>
      <DialogTitle id="import-dialog-title">{t('projectFile.importTitle')}</DialogTitle>
      <DialogContent dividers>
        {summary ? (
          <Stack spacing={2}>
            <Typography variant="h6" component="p">
              {summary.project.name}
            </Typography>

            {summary.warnings.includes('checksum-mismatch') ? (
              <Alert severity="warning">{t('projectFile.checksumWarning')}</Alert>
            ) : null}

            <Typography variant="body2" color="text.primary">
              {t('projectFile.summaryConnectors')}:{' '}
              {connectorNames.length > 0
                ? connectorNames.join(', ')
                : t('projectFile.summaryNoConnectors')}
            </Typography>

            <div>
              <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                {t('projectFile.summarySections')}
              </Typography>
              <List dense disablePadding>
                {summary.sections.map((section) => (
                  <ListItem key={section.feature} disableGutters>
                    <ListItemText
                      primary={section.feature}
                      secondary={`${sectionStatusLabel(section.status)}${
                        section.count !== null
                          ? ` · ${t('projectFile.sectionItems', { count: section.count })}`
                          : ''
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            </div>

            {summary.collidesWithExistingId ? (
              <div>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  {t('projectFile.collisionBody', { name: summary.project.name })}
                </Typography>
                <RadioGroup
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value as ImportStrategy)}
                >
                  <FormControlLabel
                    value="copy"
                    control={<Radio />}
                    label={t('projectFile.strategyCopy')}
                  />
                  <FormControlLabel
                    value="overwrite"
                    control={<Radio />}
                    label={t('projectFile.strategyOverwrite')}
                  />
                </RadioGroup>
              </div>
            ) : null}

            <Alert severity="info">{t('projectFile.reconnectNotice')}</Alert>
          </Stack>
        ) : (
          <Typography>{t('projectFile.importValidating')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('projectFile.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!summary}
          onClick={() => onImport(summary?.collidesWithExistingId ? strategy : 'overwrite')}
        >
          {t('projectFile.import')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
