import {
  AppBar,
  Badge,
  Breadcrumbs,
  IconButton,
  Link,
  Toolbar,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShellStore } from '@renderer/app/store/shell-store';
import { NAV_ITEMS } from './nav-items';

function useSectionLabelKey(projectBase: string): string | null {
  const location = useLocation();
  const suffix = location.pathname.startsWith(projectBase)
    ? location.pathname.slice(projectBase.length).replace(/^\//, '')
    : '';
  const match = NAV_ITEMS.filter((item) => item.path !== '').find((item) => item.path === suffix);
  if (suffix === '') return 'sidebar.dashboard';
  return match?.labelKey ?? null;
}

export function TopBar(): JSX.Element {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const activeProject = useShellStore((state) => state.activeProject);
  const updateStatus = useShellStore((state) => state.updateStatus);

  const projectBase = activeProject ? `/project/${activeProject.id}` : '';
  const sectionKey = useSectionLabelKey(projectBase);
  const hasUpdate =
    updateStatus?.state === 'available' || updateStatus?.state === 'downloaded';

  return (
    <AppBar
      position="static"
      elevation={0}
      color="default"
      sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.default' }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Breadcrumbs sx={{ flexGrow: 1 }} aria-label="breadcrumb">
          <Link
            component="button"
            underline="hover"
            color="text.secondary"
            onClick={() => navigate('/')}
          >
            {t('sidebar.backToProjects')}
          </Link>
          {activeProject ? (
            <Typography color="text.primary" fontWeight={600}>
              {activeProject.name}
            </Typography>
          ) : null}
          {sectionKey ? <Typography color="text.secondary">{t(sectionKey)}</Typography> : null}
        </Breadcrumbs>

        {activeProject ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            {t('topbar.activeProject', { name: activeProject.name })}
          </Typography>
        ) : null}

        <IconButton aria-label={t('topbar.notifications')} color="inherit">
          <Badge color="secondary" variant="dot" invisible={!hasUpdate}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
