import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { SIDE_PANEL_WIDTH } from '@shared/components/layout-constants';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { FormCoverageReport, FormOriginLink, HubSpotForm } from '@shared/types/forms';
import type { DataOrigin } from '@shared/types/properties';

export interface FormPanelProps {
  form: HubSpotForm | null;
  links: FormOriginLink[];
  reports: FormCoverageReport[];
  origins: DataOrigin[];
  busy: boolean;
  onClose: () => void;
  onAddMissing: (originId: string) => void;
  onLinkOrigin: () => void;
}

export function FormPanel({
  form,
  links,
  reports,
  origins,
  busy,
  onClose,
  onAddMissing,
  onLinkOrigin,
}: FormPanelProps): JSX.Element {
  const { t } = useTranslation('common');
  const originName = (id: string): string => origins.find((o) => o.id === id)?.name ?? id;
  const fields = form?.fieldGroups.flatMap((group) => group.fields) ?? [];

  return (
    <Drawer anchor="right" open={Boolean(form)} onClose={onClose}>
      <Box sx={{ width: SIDE_PANEL_WIDTH, p: 3 }} role="region" aria-label={t('forms.panel.title')}>
        {form ? (
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center">
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {form.name}
              </Typography>
              <IconButton aria-label={t('forms.panel.close')} onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Chip size="small" label={form.formType} />
              <Chip size="small" variant="outlined" label={form.objectTypes.join(', ') || '—'} />
            </Stack>

            <Divider />
            <Typography variant="subtitle2">{t('forms.panel.fields')}</Typography>
            <List dense disablePadding>
              {fields.map((field) => (
                <ListItem key={`${field.objectTypeId}:${field.name}`} disableGutters>
                  <Typography sx={{ fontWeight: 600, minWidth: 180 }}>{field.name}</Typography>
                  <Typography color="text.primary" sx={{ flexGrow: 1 }}>
                    {field.label}
                  </Typography>
                  <Chip size="small" variant="outlined" label={field.fieldType} />
                </ListItem>
              ))}
            </List>

            <Divider />
            <Stack direction="row" alignItems="center">
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t('forms.panel.origins')}
              </Typography>
              <Button size="small" onClick={onLinkOrigin}>
                {t('forms.panel.linkOrigin')}
              </Button>
            </Stack>
            {links.length === 0 ? (
              <Typography color="text.primary">{t('forms.panel.noOrigins')}</Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {links.flatMap((link) =>
                  link.originIds.map((id) => (
                    <Chip key={`${link.id}:${id}`} size="small" label={originName(id)} />
                  )),
                )}
              </Stack>
            )}

            <Divider />
            <Typography variant="subtitle2">{t('forms.panel.coverage')}</Typography>
            {reports.length === 0 ? (
              <Typography color="text.primary">{t('forms.panel.noCoverage')}</Typography>
            ) : (
              reports.map((report) => (
                <Box key={report.originId} sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 600 }}>{originName(report.originId)}</Typography>
                    <Typography color="text.primary">
                      {t('forms.panel.coverageSummary', {
                        present: report.present,
                        expected: report.expected,
                      })}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    {report.missing > 0 ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => onAddMissing(report.originId)}
                      >
                        {t('forms.panel.addMissing', { count: report.missing })}
                      </Button>
                    ) : null}
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {report.items.map((item) => (
                      <Chip
                        key={item.hubspotName}
                        size="small"
                        color={item.status === 'present' ? 'primary' : 'default'}
                        variant={item.status === 'present' ? 'filled' : 'outlined'}
                        label={item.hubspotName}
                      />
                    ))}
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
