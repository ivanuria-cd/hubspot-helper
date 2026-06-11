import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import type { HsPropertyStatus, HubSpotProperty } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { usePropertiesStore } from '../store/properties-store';
import { useOriginsStore } from '../store/origins-store';
import { useMappingsStore } from '../store/mappings-store';
import { PropertiesTable } from './PropertiesTable';
import { PropertyPanel } from './PropertyPanel';
import { OriginsModal } from './OriginsModal';
import { AddPropertyDialog } from './AddPropertyDialog';
import { PendingChangesView } from './PendingChangesView';

const ALL = '__all__';

export function PropertyManagementScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';

  const { properties, loading, syncing, lastSync, error, load, sync, upsert, applyChange, discardChange } =
    usePropertiesStore();
  const { origins, load: loadOrigins, create: createOrigin, remove: removeOrigin } = useOriginsStore();
  const { mappings, load: loadMappings, upsert: upsertMapping, remove: removeMapping } = useMappingsStore();

  const [view, setView] = useState<'table' | 'changes'>('table');
  const [selected, setSelected] = useState<HubSpotProperty | null>(null);
  const [originsOpen, setOriginsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<HubSpotProperty | null>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [objectFilter, setObjectFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [originFilter, setOriginFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  useEffect(() => {
    if (!projectId) return;
    void load(projectId);
    void loadOrigins(projectId);
    void loadMappings(projectId);
  }, [projectId, load, loadOrigins, loadMappings]);

  const refreshAll = async (): Promise<void> => {
    await Promise.all([load(projectId), loadOrigins(projectId), loadMappings(projectId)]);
    setSelected((prev) =>
      prev ? usePropertiesStore.getState().properties.find((p) => p.id === prev.id) ?? null : null,
    );
  };

  const objectTypes = useMemo(
    () => Array.from(new Set(properties.map((p) => p.objectType))),
    [properties],
  );
  const propTypes = useMemo(() => Array.from(new Set(properties.map((p) => p.type))), [properties]);

  const filtered = useMemo(() => {
    const mappingByProp = new Map<string, string[]>();
    mappings.forEach((mapping) => {
      const list = mappingByProp.get(mapping.propertyId) ?? [];
      list.push(mapping.originId);
      mappingByProp.set(mapping.propertyId, list);
    });
    return properties.filter((property) => {
      if (search && !`${property.hubspotName} ${property.label}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (objectFilter !== ALL && property.objectType !== objectFilter) return false;
      if (typeFilter !== ALL && property.type !== typeFilter) return false;
      if (statusFilter !== ALL && property.hubspotStatus !== statusFilter) return false;
      if (originFilter !== ALL && !(mappingByProp.get(property.id) ?? []).includes(originFilter))
        return false;
      return true;
    });
  }, [properties, mappings, search, objectFilter, typeFilter, statusFilter, originFilter]);

  const pendingCount = useMemo(
    () => properties.reduce((sum, p) => sum + (p.pendingChanges?.length ?? 0), 0),
    [properties],
  );

  if (!activeProject) return null;

  const handleSync = async (): Promise<void> => {
    await sync(projectId);
    await Promise.all([loadOrigins(projectId), loadMappings(projectId)]);
  };

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      await applyChange(projectId, changeId, environment);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (originId: string, originName: string): Promise<void> => {
    setExportAnchor(null);
    const data = await window.api.propertiesExportJson({ projectId, originId });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const date = new Date().toISOString().slice(0, 10);
    anchor.download = `${originName.replace(/\s+/g, '-').toLowerCase()}_${date}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'table' ? t('properties.title') : t('properties.changes.title')}
        </Typography>
        {view === 'table' ? (
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? t('properties.syncing') : t('properties.syncHs')}
          </Button>
        ) : (
          <Button variant="outlined" onClick={() => setView('table')}>
            {t('properties.changes.back')}
          </Button>
        )}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {lastSync && view === 'table' ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('properties.syncSummary', lastSync as unknown as Record<string, number>)}
        </Alert>
      ) : null}

      {view === 'changes' ? (
        <PendingChangesView
          properties={properties}
          busy={busy}
          onApply={handleApply}
          onDiscard={(changeId) => discardChange(projectId, changeId)}
        />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={() => setAddOpen(true)}>
              {t('properties.addProperty')}
            </Button>
            <Button variant="outlined" onClick={() => setOriginsOpen(true)}>
              {t('properties.manageOrigins', { count: origins.length })}
            </Button>
            <Button
              variant="outlined"
              onClick={(event) => setExportAnchor(event.currentTarget)}
              disabled={origins.length === 0}
            >
              {t('properties.exportJson')}
            </Button>
            <Button variant="text" onClick={() => setView('changes')} disabled={pendingCount === 0}>
              {t('properties.pendingChanges', { count: pendingCount })}
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              {origins.map((origin) => (
                <MenuItem key={origin.id} onClick={() => handleExport(origin.id, origin.name)}>
                  {origin.name}
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label={t('properties.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TextField
              size="small"
              select
              label={t('properties.filters.object')}
              value={objectFilter}
              onChange={(event) => setObjectFilter(event.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value={ALL}>{t('properties.filters.all')}</MenuItem>
              {objectTypes.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label={t('properties.filters.type')}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value={ALL}>{t('properties.filters.all')}</MenuItem>
              {propTypes.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label={t('properties.filters.origin')}
              value={originFilter}
              onChange={(event) => setOriginFilter(event.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value={ALL}>{t('properties.filters.all')}</MenuItem>
              {origins.map((origin) => (
                <MenuItem key={origin.id} value={origin.id}>
                  {origin.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label={t('properties.filters.status')}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value={ALL}>{t('properties.filters.all')}</MenuItem>
              {(['exists', 'divergent', 'missing'] as HsPropertyStatus[]).map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`properties.status.${value}`)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {loading ? (
            <Typography color="text.primary">{t('properties.loading')}</Typography>
          ) : properties.length === 0 ? (
            <Typography color="text.primary">{t('properties.empty')}</Typography>
          ) : (
            <PropertiesTable
              properties={filtered}
              origins={origins}
              mappings={mappings}
              onSelect={setSelected}
              onViewChanges={() => setView('changes')}
            />
          )}
        </>
      )}

      <PropertyPanel
        property={selected}
        origins={origins}
        mappings={mappings}
        onClose={() => setSelected(null)}
        onEdit={(property) => {
          setEditing(property);
          setAddOpen(true);
          setSelected(null);
        }}
        onUpsertMapping={async (mapping) => {
          await upsertMapping({ projectId, mapping });
          await refreshAll();
        }}
        onDeleteMapping={async (mappingId) => {
          await removeMapping(projectId, mappingId);
          await refreshAll();
        }}
      />

      <OriginsModal
        open={originsOpen}
        origins={origins}
        onClose={() => setOriginsOpen(false)}
        onCreate={(origin) => createOrigin(projectId, origin)}
        onDelete={async (originId) => {
          await removeOrigin(projectId, originId);
          await refreshAll();
        }}
      />

      <AddPropertyDialog
        open={addOpen}
        property={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSubmit={async (input) => {
          await upsert({ projectId, property: input });
        }}
      />
    </Box>
  );
}
