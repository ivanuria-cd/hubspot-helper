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
import { syncSummaryVars } from '@shared/utils/sync-summary';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { useHubspotEnvironmentChange } from '@shared/hooks/useHubspotEnvironmentChange';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { PropertyEntry } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { destName } from '../utils/dest-name';
import { isBlockedEntry } from '../utils/is-blocked';
import { useEntriesStore } from '../store/entries-store';
import { useObjectsStore } from '../store/objects-store';
import { useOriginsStore } from '../store/origins-store';
import { StatusBadge } from './StatusBadge';
import { EntryWizard } from './EntryWizard';
import { EntryPanel } from './EntryPanel';
import { OriginsModal } from './OriginsModal';
import { GroupsModal } from './GroupsModal';
import { PendingChangesView } from './PendingChangesView';
import { PlanningMapActions } from './PlanningMapActions';

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function norm(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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
  const {
    origins,
    load: loadOrigins,
    create: createOrigin,
    update: updateOrigin,
    remove: removeOrigin,
  } = useOriginsStore();

  const [objectType, setObjectType] = useState('contacts');
  const [view, setView] = useState<'list' | 'changes'>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyEntry | null>(null);
  // SPEC-0006 §51: se guarda solo el id y la entrada se deriva del store; así el panel
  // nunca muestra un snapshot obsoleto tras aplicar/convertir/sincronizar.
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    // SPEC-0002 §17: render inmediato con el estado local; SPEC-0006 §37.9: al entrar se reconcilia
    // con HubSpot (el estado exists/missing/divergent depende del entorno activo, §37).
    void load(projectId);
    void loadObjects(projectId);
    void loadOrigins(projectId);
    void sync(projectId);
  }, [projectId, load, loadObjects, loadOrigins, sync]);

  // SPEC-0006 §37.8: al cambiar el entorno activo se RECONCILIA con HubSpot (no solo recarga el estado
  // local), porque el estado exists/missing/divergent depende del entorno activo (§37).
  useHubspotEnvironmentChange(() => {
    if (!projectId) return;
    void sync(projectId);
    void loadObjects(projectId);
  });

  const selected = useMemo(
    () => (selectedId ? ((entries ?? []).find((e) => e.id === selectedId) ?? null) : null),
    [entries, selectedId],
  );
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
  // SPEC-0006 §53.13: predicado único de «bloqueada» compartido con EntryPanel.
  const blockedCount = useMemo(() => objectEntries.filter(isBlockedEntry).length, [objectEntries]);

  if (!activeProject) return null;

  const handleConvertAll = async (): Promise<void> => {
    const ok = await askConfirm({
      title: t('properties.convert.confirmTitle'),
      body: t('properties.convert.confirmBody', { count: blockedCount }),
    });
    if (!ok) return;
    // SPEC-0006 §50: errores notificados en vez de unhandled rejection.
    try {
      const result = await convertMissing(projectId, objectType);
      notify({
        message: t('properties.convert.done', { converted: result.converted }),
        severity: 'success',
      });
      if (result.seeded > 0) {
        notify({
          message: t('properties.convert.seededWarning', { seeded: result.seeded }),
          severity: 'warning',
        });
      }
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    }
  };

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      // SPEC-0006 §50: applyChange devuelve false (con `error` en el store) cuando el apply
      // falla en HubSpot; antes se mostraba el toast de éxito igualmente.
      const ok = await applyChange(projectId, changeId, environment);
      if (ok) {
        notify({ message: t('properties.applyToastDone'), severity: 'success' });
      } else {
        notify({
          message: t('properties.applyToastError', {
            error: useEntriesStore.getState().error ?? t('common.loadError'),
          }),
          severity: 'error',
        });
      }
    } catch (error) {
      notify({
        message: t('properties.applyToastError', {
          error: error instanceof Error ? error.message : '',
        }),
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (originId: string, originName: string): Promise<void> => {
    setExportAnchor(null);
    // SPEC-0006 §50: un fallo del export ya no es un unhandled rejection silencioso.
    try {
      const data = await window.api.propertiesExportJson({ projectId, originId });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${originName.replace(/\s+/g, '-').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'list' ? t('properties.title') : t('properties.changes.title')}
        </Typography>
        {view === 'list' ? (
          <BusyButton
            variant="outlined"
            busy={syncing}
            startIcon={<SyncIcon />}
            onClick={() => sync(projectId)}
          >
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
          {t('properties.syncSummary', syncSummaryVars(lastSync))}
        </Alert>
      ) : null}
      {view === 'changes' ? (
        <PendingChangesView
          entries={entries ?? []}
          busy={busy}
          onApply={handleApply}
          onDiscard={async (changeId) => {
            // SPEC-0006 §53.11: captura homogénea (§50) — sin unhandled rejection al descartar.
            try {
              await discardChange(projectId, changeId);
            } catch (error) {
              notify({
                message: error instanceof Error ? error.message : t('common.loadError'),
                severity: 'error',
              });
            }
          }}
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
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setOriginsOpen(true)}
            >
              {t('properties.manageOrigins', { count: (origins ?? []).length })}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderOutlinedIcon />}
              onClick={() => setGroupsOpen(true)}
            >
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
            {/* SPEC-0016 §2.7: sin «Actualizar» (el estado se escribe solo); «Abrir en Drive» abre el mapa editable. */}
            <DriveDocActions doc={driveDoc} hideUpdate hideOpen />
            <PlanningMapActions
              projectId={projectId}
              disabled={(entries?.length ?? 0) === 0}
              onApplied={() => void load(projectId)}
            />
            <Button
              variant="text"
              startIcon={<PendingActionsIcon />}
              disabled={pendingCount === 0}
              onClick={() => setView('changes')}
            >
              {t('properties.pendingChanges', { count: pendingCount })}
            </Button>
            <Menu
              anchorEl={exportAnchor}
              open={Boolean(exportAnchor)}
              onClose={() => setExportAnchor(null)}
            >
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
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleConvertAll}
                >
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
                  onClick={() => setSelectedId(entry.id)}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'block',
                    py: 1.5,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                    <Typography sx={{ fontWeight: 600, minWidth: 200 }}>{entry.name}</Typography>
                    <Typography color="text.primary" sx={{ minWidth: 160 }}>
                      {destName(entry)}
                    </Typography>
                    <StatusBadge status={entry.hubspotStatus} blocked={isBlockedEntry(entry)} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t('properties.entry.sourceCount', { count: entry.sources.length })}
                    />
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
        onApply={handleApply}
        onClose={() => setSelectedId(null)}
        onEdit={(entry) => {
          setEditing(entry);
          setSelectedId(null);
          setWizardOpen(true);
        }}
        onDelete={async (entryId) => {
          // SPEC-0006 §53.11: captura homogénea (§50).
          try {
            await remove(projectId, entryId);
            setSelectedId(null);
          } catch (error) {
            notify({
              message: error instanceof Error ? error.message : t('common.loadError'),
              severity: 'error',
            });
          }
        }}
        onConvert={async (entryId) => {
          // SPEC-0006 §53.11: el toast de éxito solo tras convertir; ante fallo, error (no falso «hecho»).
          try {
            const result = await convertToNew(projectId, entryId);
            notify({
              message: t('properties.convert.done', { converted: 1 }),
              severity: 'success',
            });
            if (result.seeded) {
              notify({
                message: t('properties.convert.seededWarning', { seeded: 1 }),
                severity: 'warning',
              });
            }
          } catch (error) {
            notify({
              message: error instanceof Error ? error.message : t('common.loadError'),
              severity: 'error',
            });
          }
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
