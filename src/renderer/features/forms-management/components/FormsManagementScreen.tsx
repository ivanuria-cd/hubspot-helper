import { useEffect, useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { LoadingState, useSnackbar } from '@shared/components/feedback';
import { EmptyState } from '@shared/components/EmptyState';
import { FeatureScreenHeader } from '@shared/components/FeatureScreenHeader';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { useHubspotEnvironmentChange } from '@shared/hooks/useHubspotEnvironmentChange';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { HubSpotForm } from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useFormsStore } from '../store/forms-store';
import { useFormsRefsStore } from '../store/forms-refs-store';
import { useObjectsStore } from '@shared/store/objects-store';
import { FormsTable } from './FormsTable';
import { FormPanel } from './FormPanel';
import { NewFormWizard } from './NewFormWizard';
import {
  EditFormWizard,
  editSourceFromChange,
  editSourceFromForm,
  type EditFormSource,
} from './EditFormWizard';
import { LinkOriginModal } from './LinkOriginModal';
import type { FormChange, FormEditsInput } from '@shared/types/forms';
import { FormPendingChangesView } from './FormPendingChangesView';
import { coverageState } from './CoverageBadge';

export function FormsManagementScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
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
    updateDefinition,
    editPendingChange,
    addMissingFields,
    applyChange,
    discardChange,
    upsertLink,
    subscriptionTypes,
    loadSubscriptionTypes,
  } = useFormsStore();
  const { origins, entries, load: loadRefs } = useFormsRefsStore();
  const { objects, load: loadObjects } = useObjectsStore();

  const [view, setView] = useState<'list' | 'changes'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editSource, setEditSource] = useState<EditFormSource | null>(null);
  const [editTarget, setEditTarget] = useState<
    { kind: 'form'; formId: string } | { kind: 'change'; changeId: string } | null
  >(null);
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
  });

  useEffect(() => {
    if (!projectId) return;
    void load(projectId);
    void loadRefs(projectId);
    void loadObjects(projectId);
    void loadSubscriptionTypes(projectId);
  }, [projectId, load, loadRefs, loadObjects, loadSubscriptionTypes]);

  // Refresca al cambiar el entorno activo (SPEC-0003 §16).
  useHubspotEnvironmentChange(() => {
    if (!projectId) return;
    void load(projectId);
    void loadRefs(projectId);
    void loadObjects(projectId);
    void loadSubscriptionTypes(projectId);
  });

  // Firma estable de ids: detecta re-syncs que sustituyen formularios sin cambiar el total.
  const formIdsSignature = useMemo(() => forms.map((form) => form.id).join('|'), [forms]);

  useEffect(() => {
    if (!projectId) return;
    for (const form of forms) void loadCoverage(projectId, form.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, formIdsSignature]);

  // Deriva el formulario seleccionado del store para no retener snapshots obsoletos tras un sync.
  const selected = useMemo<HubSpotForm | null>(
    () => (selectedId ? (forms.find((form) => form.id === selectedId) ?? null) : null),
    [forms, selectedId],
  );

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
      const ok = await applyChange(projectId, changeId, environment);
      if (ok) {
        notify({ message: t('forms.syncToastDone'), severity: 'success' });
      } else {
        notify({
          message: t('forms.syncToastError', {
            error: useFormsStore.getState().error ?? t('common.loadError'),
          }),
          severity: 'error',
        });
      }
    } catch (error) {
      notify({
        message: t('forms.syncToastError', { error: error instanceof Error ? error.message : '' }),
        severity: 'error',
      });
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

  const handleEditForm = (): void => {
    if (!selected) return;
    setEditTarget({ kind: 'form', formId: selected.id });
    setEditSource(editSourceFromForm(selected));
  };

  const handleEditChange = (change: FormChange): void => {
    setEditTarget({ kind: 'change', changeId: change.id });
    setEditSource(editSourceFromChange(change, change.createContext?.originIds ?? []));
  };

  const handleEditSubmit = (edits: FormEditsInput, originIds: string[] | undefined): void => {
    if (!editTarget) return;
    if (editTarget.kind === 'form') {
      void updateDefinition(projectId, editTarget.formId, edits);
      setView('changes');
    } else {
      void editPendingChange(projectId, editTarget.changeId, edits, originIds);
    }
  };

  return (
    <Box>
      <FeatureScreenHeader
        i18nPrefix="forms"
        view={view}
        syncing={syncing}
        error={error}
        lastSync={lastSync}
        onSync={() => sync(projectId, true)}
        onBack={() => setView('list')}
      />
      {view === 'changes' ? (
        <FormPendingChangesView
          changes={changes}
          busy={busy}
          onApply={(changeId, environment) => void handleApply(changeId, environment)}
          onDiscard={(changeId) => void discardChange(projectId, changeId)}
          onEdit={handleEditChange}
        />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setWizardOpen(true)}>
              {t('forms.addForm')}
            </Button>
            <DriveDocActions doc={driveDoc} updateDisabled={forms.length === 0} />
            <Button
              variant="text"
              startIcon={<PendingActionsIcon />}
              disabled={changes.length === 0}
              onClick={() => setView('changes')}
            >
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
            <LoadingState variant="list" rows={4} label={t('forms.loading')} />
          ) : forms.length === 0 ? (
            <EmptyState message={t('forms.empty')} />
          ) : filtered.length === 0 ? (
            <EmptyState message={t('forms.noResults')} />
          ) : (
            <FormsTable
              forms={filtered}
              coverage={coverage}
              links={links}
              origins={origins}
              onSelect={(form) => setSelectedId(form.id)}
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
        onClose={() => setSelectedId(null)}
        onAddMissing={(originId) => void handleAddMissing(originId)}
        onLinkOrigin={() => setLinkOpen(true)}
        onEdit={handleEditForm}
      />

      <EditFormWizard
        open={Boolean(editSource)}
        source={editSource}
        origins={origins}
        subscriptionTypes={subscriptionTypes}
        onClose={() => {
          setEditSource(null);
          setEditTarget(null);
        }}
        onSubmit={handleEditSubmit}
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
