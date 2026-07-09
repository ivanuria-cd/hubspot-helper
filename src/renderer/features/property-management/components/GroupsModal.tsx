import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';
import type { GroupDeleteChange, HubSpotGroup } from '@shared/types/properties';
import { LoadingState, useConfirm, useSnackbar } from '@shared/components/feedback';

interface GroupsModalProps {
  open: boolean;
  projectId: string;
  objectType: string;
  onClose: () => void;
}

/**
 * Gestión de grupos de propiedades del objeto activo (SPEC-0006 §33). Permite solicitar el borrado
 * (destructivo, doble confirmación) de un grupo vacío y aplicar/descartar los borrados pendientes.
 */
export function GroupsModal({
  open,
  projectId,
  objectType,
  onClose,
}: GroupsModalProps): JSX.Element {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const askConfirm = useConfirm();
  const [groups, setGroups] = useState<HubSpotGroup[]>([]);
  const [usedGroups, setUsedGroups] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<GroupDeleteChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [groupList, properties, pending] = await Promise.all([
        window.api.groupsList({ projectId, objectType }),
        window.api.hubspotPropertiesList({ projectId, objectType }),
        window.api.groupChanges({ projectId }),
      ]);
      setGroups(groupList);
      setUsedGroups(new Set(properties.map((p) => p.groupName).filter(Boolean) as string[]));
      setChanges(pending.filter((c) => c.objectType === objectType));
    } catch (error) {
      notify({
        message: t('properties.groupsModal.toastError', {
          error: error instanceof Error ? error.message : '',
        }),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, objectType, notify, t]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const pendingNames = new Set(changes.map((c) => c.groupName));

  const handleRequestDelete = async (group: HubSpotGroup): Promise<void> => {
    const first = await askConfirm({
      tone: 'danger',
      title: t('properties.groupsModal.confirm1Title'),
      body: t('properties.groupsModal.confirm1Body', { group: group.label || group.name }),
    });
    if (!first) return;
    const second = await askConfirm({
      tone: 'danger',
      title: t('properties.groupsModal.confirm2Title'),
      body: t('properties.groupsModal.confirm2Body', { group: group.label || group.name }),
    });
    if (!second) return;
    setBusy(true);
    try {
      const result = await window.api.groupRequestDelete({
        projectId,
        objectType,
        groupName: group.name,
        label: group.label,
      });
      if (result.success) {
        notify({ message: t('properties.groupsModal.toastRequested'), severity: 'success' });
        await reload();
      } else {
        notify({
          message: result.error ?? t('properties.groupsModal.toastError', { error: '' }),
          severity: 'error',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (
    change: GroupDeleteChange,
    environment: 'sandbox' | 'production',
  ): Promise<void> => {
    setBusy(true);
    try {
      const result = await window.api.groupApplyChange({
        projectId,
        changeId: change.id,
        environment,
      });
      notify(
        result.success
          ? { message: t('properties.groupsModal.toastApplied'), severity: 'success' }
          : {
              message: result.error ?? t('properties.groupsModal.toastError', { error: '' }),
              severity: 'error',
            },
      );
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = async (change: GroupDeleteChange): Promise<void> => {
    setBusy(true);
    try {
      await window.api.groupDiscardChange({ projectId, changeId: change.id });
      notify({ message: t('properties.groupsModal.toastDiscarded'), severity: 'success' });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('properties.groupsModal.title', { object: objectType })}</DialogTitle>
      <DialogContent>
        {loading ? (
          <LoadingState variant="list" rows={4} label={t('properties.groupsModal.loading')} />
        ) : (
          <>
            {changes.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('properties.groupsModal.pendingTitle')}
                </Typography>
                <Stack spacing={1}>
                  {changes.map((change) => (
                    <Box
                      key={change.id}
                      sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'warning.main',
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>{change.summary}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busy}
                          startIcon={<CloudUploadIcon />}
                          onClick={() => void handleApply(change, 'sandbox')}
                        >
                          {t('properties.groupsModal.applySandbox')}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          disabled={busy}
                          startIcon={<CloudUploadIcon />}
                          onClick={() => void handleApply(change, 'production')}
                        >
                          {t('properties.groupsModal.applyProduction')}
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          disabled={busy}
                          onClick={() => void handleDiscard(change)}
                        >
                          {t('properties.groupsModal.discard')}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
              </Box>
            ) : null}

            <Typography variant="subtitle2" gutterBottom>
              {t('properties.groupsModal.groupsTitle')}
            </Typography>
            {groups.length === 0 ? (
              <Typography color="text.primary">{t('properties.groupsModal.empty')}</Typography>
            ) : (
              <Stack spacing={1}>
                {groups.map((group) => {
                  const used = usedGroups.has(group.name);
                  const alreadyPending = pendingNames.has(group.name);
                  const disabled = busy || used || alreadyPending;
                  return (
                    <Stack
                      key={group.name}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {group.label || group.name}
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          {group.name}
                        </Typography>
                      </Box>
                      {alreadyPending ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={t('properties.groupsModal.pendingChip')}
                        />
                      ) : used ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={t('properties.groupsModal.notEmptyChip')}
                        />
                      ) : null}
                      <Tooltip title={used ? t('properties.groupsModal.notEmptyHint') : ''}>
                        <span>
                          <IconButton
                            color="error"
                            aria-label={t('properties.groupsModal.deleteRequest')}
                            disabled={disabled}
                            onClick={() => void handleRequestDelete(group)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('properties.groupsModal.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
