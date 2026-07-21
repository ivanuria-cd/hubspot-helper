import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, List, ListItemButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { LoadingState, useSnackbar } from '@shared/components/feedback';
import { EmptyState } from '@shared/components/EmptyState';
import { FeatureScreenHeader } from '@shared/components/FeatureScreenHeader';
import { useObjectsStore } from '@shared/store/objects-store';
import { useDriveDoc } from '@shared/hooks/useDriveDoc';
import { useHubspotEnvironmentChange } from '@shared/hooks/useHubspotEnvironmentChange';
import { DriveDocActions } from '@shared/components/DriveDocActions';
import { DriveDirtyGuard } from '@shared/components/DriveDirtyGuard';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useCustomObjectsStore } from '../store/custom-objects-store';
import { ObjectStatusBadge } from './ObjectStatusBadge';
import { ObjectWizard } from './ObjectWizard';
import { ObjectPanel } from './ObjectPanel';
import { PendingChangesView } from '@shared/components/PendingChangesView';

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

  // Refresca al cambiar el entorno activo (SPEC-0003 §16).
  useHubspotEnvironmentChange(() => {
    if (!projectId) return;
    void load(projectId);
    void loadObjects(projectId);
  });

  const pendingCount = useMemo(
    () => (definitions ?? []).reduce((sum, d) => sum + (d.pendingChanges?.length ?? 0), 0),
    [definitions],
  );

  const driveDoc = useDriveDoc({
    hasData: (definitions?.length ?? 0) > 0,
    fetchMeta: () => window.api.customObjectsDriveMeta({ projectId }),
    update: () => window.api.customObjectsWriteSheets({ projectId }),
    load: () => window.api.customObjectsLoadSheets({ projectId }),
  });

  if (!activeProject) return null;

  const handleApply = async (changeId: string, environment: HubSpotEnvironment): Promise<void> => {
    setBusy(true);
    try {
      const ok = await applyChange(projectId, changeId, environment);
      if (ok) {
        setSelected((prev) =>
          prev
            ? (useCustomObjectsStore.getState().definitions.find((d) => d.id === prev.id) ?? null)
            : null,
        );
        notify({ message: t('customObjects.syncToastDone'), severity: 'success' });
      } else {
        notify({
          message: t('customObjects.syncToastError', {
            error: useCustomObjectsStore.getState().error ?? t('common.loadError'),
          }),
          severity: 'error',
        });
      }
    } catch (error) {
      notify({
        message: t('customObjects.syncToastError', {
          error: error instanceof Error ? error.message : '',
        }),
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <FeatureScreenHeader
        i18nPrefix="customObjects"
        view={view}
        syncing={syncing}
        error={error}
        lastSync={lastSync}
        onSync={() => sync(projectId)}
        onBack={() => setView('list')}
      />

      {view === 'changes' ? (
        <PendingChangesView
          rows={(definitions ?? []).flatMap((def) =>
            (def.pendingChanges ?? []).map((change) => ({
              id: change.id,
              name: def.labels.singular,
              summary: change.summary,
              appliedToSandbox: change.appliedToSandbox,
              appliedToProduction: change.appliedToProduction,
            })),
          )}
          busy={busy}
          i18nPrefix="customObjects.changes"
          onApply={handleApply}
          onDiscard={async (changeId) => {
            // SPEC-0007 §28 / SPEC-0006 §53.11: captura homogénea, sin unhandled rejection al descartar.
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setWizardOpen(true);
              }}
            >
              {t('customObjects.addObject')}
            </Button>
            <Button
              variant="text"
              startIcon={<PendingActionsIcon />}
              disabled={pendingCount === 0}
              onClick={() => setView('changes')}
            >
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
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'block',
                    py: 1.5,
                  }}
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
          setSelected(
            useCustomObjectsStore.getState().definitions.find((d) => d.id === def.id) ?? null,
          );
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
