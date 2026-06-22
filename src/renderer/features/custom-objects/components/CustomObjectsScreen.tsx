import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { BusyButton, LoadingState, useSnackbar } from '@shared/components/feedback';
import { EmptyState } from '@shared/components/EmptyState';
import { useObjectsStore } from '@renderer/features/property-management/store/objects-store';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useCustomObjectsStore } from '../store/custom-objects-store';
import { ObjectStatusBadge } from './ObjectStatusBadge';
import { ObjectWizard } from './ObjectWizard';
import { ObjectPanel } from './ObjectPanel';
import { PendingObjectChangesView } from './PendingObjectChangesView';

export function CustomObjectsScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';

  const {
    definitions,
    loading,
    syncing,
    lastSync,
    error,
    load,
    sync,
    upsert,
    requestArchive,
    remove,
    applyChange,
    discardChange,
  } = useCustomObjectsStore();
  const { objects, load: loadObjects } = useObjectsStore();

  const [view, setView] = useState<'list' | 'changes'>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<CustomObjectDefinition | null>(null);
  const [selected, setSelected] = useState<CustomObjectDefinition | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    void load(projectId);
    void loadObjects(projectId);
  }, [projectId, load, loadObjects]);

  const pendingCount = useMemo(
    () => (definitions ?? []).reduce((sum, d) => sum + (d.pendingChanges?.length ?? 0), 0),
    [definitions],
  );

  const driveDoc = useDriveDoc({
    hasData: (definitions?.length ?? 0) > 0,
    fetchMeta: () => window.api.customObjectsDriveMeta({ projectId }),
    update: () => window.api.customObjectsWriteSheets({ projectId }),
    load: () => window.api.customObjectsLoadSheets({ projectId }),
    messages: {
      updateSuccess: t('drive.doc.updateSuccess'),
      updateError: (error) => t('drive.doc.updateError', { error }),
      loadSuccess: t('drive.doc.loadSuccess'),
      loadError: (error) => t('drive.doc.loadError', { error }),
    },
  });

  if (!activeProject) return null;

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      await applyChange(projectId, changeId, environment);
      setSelected((prev) =>
        prev ? useCustomObjectsStore.getState().definitions.find((d) => d.id === prev.id) ?? null : null,
      );
      notify({ message: t('customObjects.syncToastDone'), severity: 'success' });
    } catch (error) {
      notify({
        message: t('customObjects.syncToastError', { error: error instanceof Error ? error.message : '' }),
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'list' ? t('customObjects.title') : t('customObjects.changes.title')}
        </Typography>
        {view === 'list' ? (
          <BusyButton
            variant="outlined"
            busy={syncing}
            startIcon={<SyncIcon />}
            onClick={() => sync(projectId)}
          >
            {t('customObjects.syncHs')}
          </BusyButton>
        ) : (
          <Button variant="outlined" onClick={() => setView('list')}>
            {t('customObjects.changes.back')}
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
          {t('customObjects.syncSummary', lastSync as unknown as Record<string, number>)}
        </Alert>
      ) : null}

      {view === 'changes' ? (
        <PendingObjectChangesView
          definitions={definitions ?? []}
          busy={busy}
          onApply={handleApply}
          onDiscard={(changeId) => discardChange(projectId, changeId)}
        />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setWizardOpen(true);
              }}
            >
              {t('customObjects.addObject')}
            </Button>
            <Button variant="text" disabled={pendingCount === 0} onClick={() => setView('changes')}>
              {t('customObjects.pendingChanges', { count: pendingCount })}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <DriveDocActions doc={driveDoc} updateDisabled={(definitions?.length ?? 0) === 0} />
          </Stack>

          {loading ? (
            <LoadingState variant="cards" rows={3} label={t('customObjects.loading')} />
          ) : (definitions ?? []).length === 0 ? (
            <EmptyState message={t('customObjects.empty')} />
          ) : (
            <List aria-label={t('customObjects.title')} disablePadding>
              {(definitions ?? []).map((def) => (
                <ListItemButton
                  key={def.id}
                  onClick={() => setSelected(def)}
                  sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block', py: 1.5 }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                    <Typography sx={{ fontWeight: 600, minWidth: 160 }}>{def.name}</Typography>
                    <Typography color="text.primary" sx={{ minWidth: 160 }}>
                      {def.labels.plural}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t('customObjects.propCount', { count: def.properties.length })}
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    <ObjectStatusBadge status={def.status} />
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </>
      )}

      <ObjectWizard
        open={wizardOpen}
        definition={editing}
        objects={objects ?? []}
        onClose={() => {
          setWizardOpen(false);
          setEditing(null);
        }}
        onSubmit={async (definition) => {
          await upsert({ projectId, definition });
          await sync(projectId);
        }}
      />

      <ObjectPanel
        definition={selected}
        busy={busy}
        onApply={handleApply}
        onClose={() => setSelected(null)}
        onEdit={(def) => {
          setEditing(def);
          setSelected(null);
          setWizardOpen(true);
        }}
        onArchive={async (def) => {
          await requestArchive(projectId, def.id);
          setSelected(useCustomObjectsStore.getState().definitions.find((d) => d.id === def.id) ?? null);
        }}
        onDelete={async (objectId) => {
          await remove(projectId, objectId);
          setSelected(null);
        }}
      />

      <DriveDirtyGuard
        dirty={driveDoc.dirty}
        projectId={projectId}
        featureKey="custom-objects"
        onUpdate={driveDoc.update}
      />
    </Box>
  );
}
