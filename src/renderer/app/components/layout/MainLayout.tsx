import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { useSnackbar } from '@shared/components/feedback';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UpdateBanner } from './UpdateBanner';

/** Contenedor del shell tras seleccionar proyecto: Sidebar + TopBar + contenido. */
export function MainLayout(): JSX.Element | null {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const activeProject = useShellStore((state) => state.activeProject);
  const setActiveProject = useShellStore((state) => state.setActiveProject);
  const setHubspotEnvironment = useShellStore((state) => state.setHubspotEnvironment);
  const { notify } = useSnackbar();
  const { t } = useTranslation();
  const refreshedProjectRef = useRef<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    if (activeProject?.id === projectId) {
      setResolved(true);
      return;
    }
    let cancelled = false;
    void window.api.setActiveProject(projectId).then(
      (project) => {
        if (cancelled) return;
        setActiveProject(project);
        setResolved(true);
      },
      () => {
        if (!cancelled) navigate('/', { replace: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, activeProject, setActiveProject, navigate]);

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    void window.api.hubspotGetStatus(projectId).then((status) => {
      if (!cancelled) setHubspotEnvironment(status?.activeEnvironment ?? null);
    });
    return () => {
      cancelled = true;
      setHubspotEnvironment(null);
    };
  }, [projectId, setHubspotEnvironment]);

  // Al abrir el proyecto: revisa los archivos de Drive y actualiza los desactualizados (SPEC-0004 §19).
  useEffect(() => {
    if (!projectId || !resolved) return undefined;
    if (refreshedProjectRef.current === projectId) return undefined;
    // Best-effort: si el bridge no expone el método (build antiguo / entorno parcial), no hacer nada.
    const refreshProject = window.api.gdriveRefreshProject;
    if (typeof refreshProject !== 'function') return undefined;
    refreshedProjectRef.current = projectId;
    let cancelled = false;
    void refreshProject({ projectId }).then(
      (result) => {
        if (cancelled || !result.connected) return;
        const updated = result.items.filter((item) => item.status === 'updated');
        const errors = result.items.filter((item) => item.status === 'error');
        if (updated.length > 0) {
          notify({
            message: t('drive.refresh.updated', {
              count: updated.length,
              names: updated.map((item) => item.name).join(', '),
            }),
            severity: 'success',
          });
        }
        if (errors.length > 0) {
          notify({
            message: t('drive.refresh.error', { names: errors.map((item) => item.name).join(', ') }),
            severity: 'error',
          });
        }
      },
      () => {
        /* best-effort: si falla la revisión no se molesta al usuario */
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, resolved, notify, t]);

  if (!resolved) return null;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <TopBar />
        <UpdateBanner />
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
