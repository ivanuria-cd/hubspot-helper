import { Box, Chip, List, ListItemButton, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { FormCoverageReport, FormOriginLink, HubSpotForm } from '@shared/types/forms';
import type { DataOrigin } from '@shared/types/properties';
import { CoverageBadge } from './CoverageBadge';

export interface FormsTableProps {
  forms: HubSpotForm[];
  coverage: Record<string, FormCoverageReport[]>;
  links: FormOriginLink[];
  origins: DataOrigin[];
  onSelect: (form: HubSpotForm) => void;
}

export function FormsTable({
  forms,
  coverage,
  links,
  origins,
  onSelect,
}: FormsTableProps): JSX.Element {
  const { t } = useTranslation('common');
  const originName = (id: string): string => origins.find((o) => o.id === id)?.name ?? id;
  const formOrigins = (formId: string): string[] => {
    const ids = links.filter((link) => link.formId === formId).flatMap((link) => link.originIds);
    return Array.from(new Set(ids)).map(originName);
  };

  return (
    <List aria-label={t('forms.title')} disablePadding>
      {forms.map((form) => (
        <ListItemButton
          key={form.id}
          onClick={() => onSelect(form)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block', py: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 600, minWidth: 220 }}>{form.name}</Typography>
            <Chip size="small" variant="outlined" label={form.formType} />
            <CoverageBadge reports={coverage[form.id]} />
            <Box sx={{ flexGrow: 1 }} />
            {formOrigins(form.id).map((name) => (
              <Chip key={name} size="small" label={name} />
            ))}
          </Stack>
        </ListItemButton>
      ))}
    </List>
  );
}
