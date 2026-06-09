import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useShellStore } from '@renderer/app/store/shell-store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UpdateBanner } from './UpdateBanner';

/** Contenedor del shell tras seleccionar proyecto: Sidebar + TopBar + contenido. */
export function MainLayout(): JSX.Element | null {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const activeProject = useShellStore((state) => state.activeProject);
  const setActiveProject = useShellStore((state) => state.setActiveProject);
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
