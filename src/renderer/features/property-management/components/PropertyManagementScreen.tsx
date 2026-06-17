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
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
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
import { PendingChangesView } from './PendingChangesView';

function destName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

export function PropertyManagementScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';

  const { entries, loading, syncing, lastSync, error, load, sync, upsert, remove, applyChange, discardChange } =
    useEntriesStore();
  const { objects, load: loadObjects } = useObjectsStore();
  const { origins, load: loadOrigins, create: createOrigin, update: updateOrigin, remove: removeOrigin } =
    useOriginsStore();

  const [objectType, setObjectType] = useState('contacts');
  const [view, setView] = useState<'list' | 'changes'>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyEntry | null>(null);
  const [selected, setSelected] = useState<PropertyEntry | null>(null);
  const [originsOpen, setOriginsOpen] = useState(false);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState(false);

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

  const objectEntries = useMemo(
    () => (entries ?? []).filter((entry) => entry.objectType === objectType),
    [entries, objectType],
  );
  const pendingCount = useMemo(
    () => (entries ?? []).reduce((sum, e) => sum + (e.pendingChanges?.length ?? 0), 0),
    [entries],
  );

  if (!activeProject) return null;

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      await applyChange(projectId, changeId, environment);
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
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => sync(projectId)} disabled={syncing}>
            {syncing ? t('properties.syncing') : t('properties.syncHs')}
          </Button>
        ) : (
          <Button variant="outlined" onClick={() => setView('list')}>
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
              onChange={(event) => setObjectType(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              {(objects ?? []).map((object) => (
                <MenuItem key={object.objectType} value={object.objectType}>
                  {object.label}
                  {object.custom ? ' ★' : ''}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setWizardOpen(true);
              }}
            >
              {t('properties.addProperty')}
            </Button>
            <Button variant="outlined" onClick={() => setOriginsOpen(true)}>
              {t('properties.manageOrigins', { count: (origins ?? []).length })}
            </Button>
            <Button variant="outlined" disabled={(origins ?? []).length === 0} onClick={(e) => setExportAnchor(e.currentTarget)}>
              {t('properties.exportJson')}
            </Button>
            <DriveDocActions doc={driveDoc} updateDisabled={(entries?.length ?? 0) === 0} />
            <Button variant="text" disabled={pendingCount === 0} onClick={() => setView('changes')}>
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

          {loading ? (
            <Typography color="text.primary">{t('properties.loading')}</Typography>
          ) : objectEntries.length === 0 ? (
            <Typography color="text.primary">{t('properties.empty')}</Typography>
          ) : (
            <List aria-label={t('properties.title')} disablePadding>
              {objectEntries.map((entry) => (
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
                    <StatusBadge status={entry.hubspotStatus} />
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
          await upsert({ projectId, entry });
          await sync(projectId);
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
      />

      <OriginsModal
        open={originsOpen}
        origins={origins ?? []}
        onClose={() => setOriginsOpen(false)}
        onCreate={(origin) => createOrigin(projectId, origin)}
        onUpdate={(origin) => updateOrigin(projectId, origin)}
        onDelete={(originId) => removeOrigin(projectId, originId)}
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
