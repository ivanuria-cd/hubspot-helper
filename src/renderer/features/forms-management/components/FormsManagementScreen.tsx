import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { HubSpotForm } from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useFormsStore } from '../store/forms-store';
import { useFormsRefsStore } from '../store/forms-refs-store';
import { FormsTable } from './FormsTable';
import { FormPanel } from './FormPanel';
import { NewFormWizard } from './NewFormWizard';
import { LinkOriginModal } from './LinkOriginModal';
import { FormPendingChangesView } from './FormPendingChangesView';
import { coverageState } from './CoverageBadge';

export function FormsManagementScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';

  const {
    forms,
    links,
    changes,
    coverage,
    loading,
    syncing,
    lastSync,
    error,
    load,
    sync,
    loadCoverage,
    createDefinition,
    addMissingFields,
    applyChange,
    discardChange,
    upsertLink,
  } = useFormsStore();
  const { objects, origins, entries, load: loadRefs } = useFormsRefsStore();

  const [view, setView] = useState<'list' | 'changes'>('list');
  const [selected, setSelected] = useState<HubSpotForm | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const driveDoc = useDriveDoc({
    hasData: forms.length > 0,
    fetchMeta: () => window.api.formsDriveMeta({ projectId }),
    update: () => window.api.formsWriteSheets({ projectId }),
    load: () => window.api.formsLoadSheets({ projectId }),
    messages: {
      updateSuccess: t('drive.doc.updateSuccess'),
      updateError: (error) => t('drive.doc.updateError', { error }),
      loadSuccess: t('drive.doc.loadSuccess'),
      loadError: (error) => t('drive.doc.loadError', { error }),
    },
  });

  useEffect(() => {
    if (!projectId) return;
    void load(projectId);
    void loadRefs(projectId);
  }, [projectId, load, loadRefs]);

  useEffect(() => {
    if (!projectId) return;
    for (const form of forms) void loadCoverage(projectId, form.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, forms.length]);

  const filtered = useMemo(() => {
    return forms.filter((form) => {
      if (search && !form.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && form.formType !== typeFilter) return false;
      if (coverageFilter !== 'all' && coverageState(coverage[form.id]).state !== coverageFilter)
        return false;
      return true;
    });
  }, [forms, search, typeFilter, coverageFilter, coverage]);

  if (!activeProject) return null;

  const selectedLinks = selected ? links.filter((link) => link.formId === selected.id) : [];
  const selectedReports = selected ? (coverage[selected.id] ?? []) : [];

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      await applyChange(projectId, changeId, environment);
    } finally {
      setBusy(false);
    }
  };

  const handleAddMissing = async (originId: string): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      await addMissingFields(projectId, selected.id, originId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'list' ? t('forms.title') : t('forms.changes.title')}
        </Typography>
        {view === 'list' ? (
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => sync(projectId, true)}
            disabled={syncing}
          >
            {syncing ? t('forms.syncing') : t('forms.syncHs')}
          </Button>
        ) : (
          <Button variant="outlined" onClick={() => setView('list')}>
            {t('forms.changes.back')}
          </Button>
        )}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {lastSync && view === 'list' ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('forms.syncSummary', lastSync as unknown as Record<string, number>)}
        </Alert>
      ) : null}
      {view === 'changes' ? (
        <FormPendingChangesView
          changes={changes}
          busy={busy}
          onApply={(changeId, environment) => void handleApply(changeId, environment)}
          onDiscard={(changeId) => void discardChange(projectId, changeId)}
        />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={() => setWizardOpen(true)}>
              {t('forms.addForm')}
            </Button>
            <DriveDocActions doc={driveDoc} updateDisabled={forms.length === 0} />
            <Button variant="text" disabled={changes.length === 0} onClick={() => setView('changes')}>
              {t('forms.pendingChanges', { count: changes.length })}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <TextField
              size="small"
              label={t('forms.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TextField
              select
              size="small"
              label={t('forms.filters.type')}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">{t('forms.filters.all')}</MenuItem>
              <MenuItem value="hubspot">hubspot</MenuItem>
              <MenuItem value="captured">captured</MenuItem>
              <MenuItem value="flow">flow</MenuItem>
              <MenuItem value="blog_comment">blog_comment</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={t('forms.filters.coverage')}
              value={coverageFilter}
              onChange={(event) => setCoverageFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">{t('forms.filters.all')}</MenuItem>
              <MenuItem value="complete">{t('forms.coverage.complete')}</MenuItem>
              <MenuItem value="missing">{t('forms.filters.incomplete')}</MenuItem>
              <MenuItem value="none">{t('forms.coverage.none')}</MenuItem>
            </TextField>
          </Stack>

          {loading ? (
            <Typography color="text.primary">{t('forms.loading')}</Typography>
          ) : forms.length === 0 ? (
            <Typography color="text.primary">{t('forms.empty')}</Typography>
          ) : filtered.length === 0 ? (
            <Typography color="text.primary">{t('forms.noResults')}</Typography>
          ) : (
            <FormsTable
              forms={filtered}
              coverage={coverage}
              links={links}
              origins={origins}
              onSelect={setSelected}
            />
          )}
        </>
      )}

      <FormPanel
        form={selected}
        links={selectedLinks}
        reports={selectedReports}
        origins={origins}
        busy={busy}
        onClose={() => setSelected(null)}
        onAddMissing={(originId) => void handleAddMissing(originId)}
        onLinkOrigin={() => setLinkOpen(true)}
      />

      <NewFormWizard
        open={wizardOpen}
        objects={objects}
        origins={origins}
        entries={entries}
        onClose={() => setWizardOpen(false)}
        onSubmit={(definition) => void createDefinition(projectId, definition)}
      />

      <LinkOriginModal
        open={linkOpen}
        form={selected}
        link={selected ? (selectedLinks[0] ?? null) : null}
        origins={origins}
        objects={objects}
        onClose={() => setLinkOpen(false)}
        onSubmit={async (link) => {
          await upsertLink(projectId, link);
          if (selected) await loadCoverage(projectId, selected.id);
        }}
      />

      <DriveDirtyGuard
        dirty={driveDoc.dirty}
        projectId={projectId}
        featureKey="forms-management"
        onUpdate={driveDoc.update}
      />
    </Box>
  );
}
