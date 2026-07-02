import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  IconButton,
  ListItemButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { BusyButton, LoadingState, useConfirm, useSnackbar } from '@shared/components/feedback';
import { EmptyState } from '@shared/components/EmptyState';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { useHubspotEnvironmentChange } from '@shared/hooks/useHubspotEnvironmentChange';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { PropertyEntry } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useEntriesStore } from '../store/entries-store';
import { useObjectsStore } from '../store/objects-store';
import { useOriginsStore } from '../store/origins-store';
import { StatusBadge } from './StatusBadge';
import { EntryWizard } from './EntryWizard';
import { EntryPanel } from './EntryPanel';
import { OriginsModal } from './OriginsModal';
import { GroupsModal } from './GroupsModal';
import { PendingChangesView } from './PendingChangesView';

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function norm(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function destName(entry: PropertyEntry): string {
  // Defensivo (SPEC-0006 §39): un dato malformado no debe romper el render.
  const ref = entry.hubspotProperty as unknown as {
    mode?: string;
    hubspotName?: string;
    definition?: { hubspotName?: string };
  };
  if (!ref || typeof ref !== 'object') return '';
  if (ref.mode === 'existing') return ref.hubspotName ?? '';
  return ref.definition?.hubspotName ?? '';
}

export function PropertyManagementScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const askConfirm = useConfirm();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';

  const {
    entries,
    loading,
    syncing,
    lastSync,
    error,
    load,
    sync,
    convertToNew,
    convertMissing,
    upsert,
    remove,
    applyChange,
    discardChange,
  } = useEntriesStore();
  const { objects, load: loadObjects } = useObjectsStore();
  const { origins, load: loadOrigins, create: createOrigin, update: updateOrigin, remove: removeOrigin } =
    useOriginsStore();

  const [objectType, setObjectType] = useState('contacts');
  const [view, setView] = useState<'list' | 'changes'>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyEntry | null>(null);
  const [selected, setSelected] = useState<PropertyEntry | null>(null);
  const [originsOpen, setOriginsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const driveDoc = useDriveDoc({
    hasData: (entries?.length ?? 0) > 0,
    fetchMeta: () => window.api.propertiesDriveMeta({ projectId }),
    update: () => window.api.propertiesWriteSheets({ projectId }),
    load: () => window.api.propertiesLoadSheets({ projectId }),
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
    void loadObjects(projectId);
    void loadOrigins(projectId);
  }, [projectId, load, loadObjects, loadOrigins]);

  // Al cambiar el entorno activo, refresca los datos dependientes del entorno (SPEC-0003 §16).
  useHubspotEnvironmentChange(() => {
    if (!projectId) return;
    void load(projectId);
    void loadObjects(projectId);
  });

  const objectEntries = useMemo(
    () => (entries ?? []).filter((entry) => entry.objectType === objectType),
    [entries, objectType],
  );
  const filteredEntries = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return objectEntries;
    return objectEntries.filter(
      (entry) => norm(entry.name).includes(q) || norm(destName(entry)).includes(q),
    );
  }, [objectEntries, search]);
  const pendingCount = useMemo(
    () => (entries ?? []).reduce((sum, e) => sum + (e.pendingChanges?.length ?? 0), 0),
    [entries],
  );
  const isBlocked = (entry: PropertyEntry): boolean =>
    entry.hubspotStatus === 'missing' && entry.hubspotProperty.mode === 'existing';
  const blockedCount = useMemo(
    () =>
      objectEntries.filter(
        (e) => e.hubspotStatus === 'missing' && e.hubspotProperty.mode === 'existing',
      ).length,
    [objectEntries],
  );

  if (!activeProject) return null;

  const handleConvertAll = async (): Promise<void> => {
    const ok = await askConfirm({
      title: t('properties.convert.confirmTitle'),
      body: t('properties.convert.confirmBody', { count: blockedCount }),
    });
    if (!ok) return;
    const result = await convertMissing(projectId, objectType);
    notify({ message: t('properties.convert.done', { converted: result.converted }), severity: 'success' });
    if (result.seeded > 0) {
      notify({ message: t('properties.convert.seededWarning', { seeded: result.seeded }), severity: 'warning' });
    }
  };

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      await applyChange(projectId, changeId, environment);
      notify({ message: t('properties.applyToastDone'), severity: 'success' });
    } catch (error) {
      notify({
        message: t('properties.applyToastError', { error: error instanceof Error ? error.message : '' }),
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async(originId: string, originName: string): Promise<void> => {
    setExportAnchor(null);
    const data = await window.api.propertiesExportJson({ projectId, originId });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${originName.replace(/\s+/g, '-').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'list' ? t('properties.title') : t('properties.changes.title')}
        </Typography>
        {view === 'list' ? (
          <BusyButton variant="outlined" busy={syncing} startIcon={<SyncIcon />} onClick={() => sync(projectId)}>
            {t('properties.syncHs')}
          </BusyButton>
        ) : (
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setView('list')}>
            {t('properties.changes.back')}
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
          {t('properties.syncSummary', lastSync as unknown as Record<string, number>)}
        </Alert>
      ) : null}
      {view === 'changes' ? (
        <PendingChangesView
          entries={entries ?? []}
          busy={busy}
          onApply={handleApply}
          onDiscard={(changeId) => discardChange(projectId, changeId)}
        />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label={t('properties.filters.object')}
              value={objectType}
              onChange={(event) => {
                setObjectType(event.target.value);
                setSearch('');
              }}
              sx={{ minWidth: 200 }}
            >
              {(objects ?? []).map((object) => (
                <MenuItem key={object.objectType} value={object.objectType}>
                  {object.label}
                  {object.custom ? ' ★' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="search"
              size="small"
              label={t('properties.filters.search')}
              placeholder={t('properties.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              inputProps={{ 'aria-label': t('properties.filters.search') }}
              sx={{ minWidth: 220 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setWizardOpen(true);
              }}
            >
              {t('properties.addProperty')}
            </Button>
            <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setOriginsOpen(true)}>
              {t('properties.manageOrigins', { count: (origins ?? []).length })}
            </Button>
            <Button variant="outlined" startIcon={<FolderOutlinedIcon />} onClick={() => setGroupsOpen(true)}>
              {t('properties.manageGroups')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              disabled={(origins ?? []).length === 0}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              {t('properties.exportJson')}
            </Button>
            <DriveDocActions doc={driveDoc} updateDisabled={(entries?.length ?? 0) === 0} />
            <Button
              variant="text"
              startIcon={<PendingActionsIcon />}
              disabled={pendingCount === 0}
              onClick={() => setView('changes')}
            >
              {t('properties.pendingChanges', { count: pendingCount })}
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              {(origins ?? []).map((origin) => (
                <MenuItem key={origin.id} onClick={() => handleExport(origin.id, origin.name)}>
                  {origin.name}
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          {blockedCount > 0 ? (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" startIcon={<AddIcon />} onClick={handleConvertAll}>
                  {t('properties.blocked.convertAll', { count: blockedCount })}
                </Button>
              }
            >
              {t('properties.blocked.banner', { count: blockedCount })}
            </Alert>
          ) : null}

          {loading ? (
            <LoadingState variant="list" rows={4} label={t('properties.loading')} />
          ) : objectEntries.length === 0 ? (
            <EmptyState message={t('properties.empty')} />
          ) : filteredEntries.length === 0 ? (
            <EmptyState message={t('properties.noResults')} />
          ) : (
            <List aria-label={t('properties.title')} disablePadding>
              {filteredEntries.map((entry) => (
                <ListItemButton
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block', py: 1.5 }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                    <Typography sx={{ fontWeight: 600, minWidth: 200 }}>{entry.name}</Typography>
                    <Typography color="text.primary" sx={{ minWidth: 160 }}>
                      {destName(entry)}
                    </Typography>
                    <StatusBadge status={entry.hubspotStatus} blocked={isBlocked(entry)} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Chip size="small" variant="outlined" label={t('properties.entry.sourceCount', { count: entry.sources.length })} />
                    <IconButton
                      size="small"
                      aria-label={t('properties.wizard.editTitle')}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(entry);
                        setWizardOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </>
      )}

      <EntryWizard
        open={wizardOpen}
        projectId={projectId}
        objectType={objectType}
        entry={editing}
        origins={origins ?? []}
        onClose={() => {
          setWizardOpen(false);
          setEditing(null);
        }}
        onSubmit={async (entry) => {
          try {
            await upsert({ projectId, entry });
            await sync(projectId);
          } catch (error) {
            notify({
              message: t('errors.entryValidation', {
                detail: error instanceof Error ? error.message : '',
              }),
              severity: 'error',
            });
          }
        }}
      />

      <EntryPanel
        entry={selected}
        origins={origins ?? []}
        busy={busy}
        onApply={async (changeId, environment) => {
          await handleApply(changeId, environment);
          setSelected((prev) =>
            prev ? useEntriesStore.getState().entries.find((e) => e.id === prev.id) ?? null : null,
          );
        }}
        onClose={() => setSelected(null)}
        onEdit={(entry) => {
          setEditing(entry);
          setSelected(null);
          setWizardOpen(true);
        }}
        onDelete={async (entryId) => {
          await remove(projectId, entryId);
          setSelected(null);
        }}
        onConvert={async (entryId) => {
          const result = await convertToNew(projectId, entryId);
          notify({ message: t('properties.convert.done', { converted: 1 }), severity: 'success' });
          if (result.seeded) {
            notify({ message: t('properties.convert.seededWarning', { seeded: 1 }), severity: 'warning' });
          }
          setSelected((prev) =>
            prev ? useEntriesStore.getState().entries.find((e) => e.id === prev.id) ?? null : null,
          );
        }}
      />

      <OriginsModal
        open={originsOpen}
        origins={origins ?? []}
        onClose={() => setOriginsOpen(false)}
        onCreate={(origin) => createOrigin(projectId, origin)}
        onUpdate={(origin) => updateOrigin(projectId, origin)}
        onDelete={(originId) => removeOrigin(projectId, originId)}
      />

      <GroupsModal
        open={groupsOpen}
        projectId={projectId}
        objectType={objectType}
        onClose={() => setGroupsOpen(false)}
      />

      <DriveDirtyGuard
        dirty={driveDoc.dirty}
        projectId={projectId}
        featureKey="property-management"
        onUpdate={driveDoc.update}
      />
    </Box>
  );
}
