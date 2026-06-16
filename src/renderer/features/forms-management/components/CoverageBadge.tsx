import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import type { FormCoverageReport } from '@shared/types/forms';

export type CoverageState = 'complete' | 'missing' | 'none';

export function coverageState(reports: FormCoverageReport[] | undefined): {
  state: CoverageState;
  missing: number;
} {
  if (!reports || reports.length === 0) return { state: 'none', missing: 0 };
  const missing = reports.reduce((sum, report) => sum + report.missing, 0);
  return { state: missing === 0 ? 'complete' : 'missing', missing };
}

export function CoverageBadge({
  reports,
}: {
  reports: FormCoverageReport[] | undefined;
}): JSX.Element {
  const { t } = useTranslation('common');
  const { state, missing } = coverageState(reports);

  if (state === 'complete') {
    return (
      <Chip
        size="small"
        color="primary"
        icon={<CheckCircleIcon />}
        label={t('forms.coverage.complete')}
      />
    );
  }
  if (state === 'missing') {
    return (
      <Chip
        size="small"
        variant="outlined"
        icon={<WarningAmberIcon />}
        label={t('forms.coverage.missing', { count: missing })}
      />
    );
  }
  return <Chip size="small" variant="outlined" label={t('forms.coverage.none')} />;
}
