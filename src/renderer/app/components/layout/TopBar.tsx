import { useState } from 'react';
import {
  AppBar,
  Badge,
  Breadcrumbs,
  Chip,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShellStore } from '@renderer/app/store/shell-store';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { NAV_ITEMS } from './nav-items';

const ENVIRONMENTS: HubSpotEnvironment[] = ['production', 'sandbox'];

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
  const hubspotEnvironment = useShellStore((state) => state.hubspotEnvironment);
  const setHubspotEnvironment = useShellStore((state) => state.setHubspotEnvironment);

  const [envAnchor, setEnvAnchor] = useState<null | HTMLElement>(null);

  const projectBase = activeProject ? `/project/${activeProject.id}` : '';
  const sectionKey = useSectionLabelKey(projectBase);
  const hasUpdate =
    updateStatus?.state === 'available' || updateStatus?.state === 'downloaded';

  const selectEnvironment = async (environment: HubSpotEnvironment): Promise<void> => {
    setEnvAnchor(null);
    if (!activeProject || environment === hubspotEnvironment) return;
    const result = await window.api.hubspotSetEnvironment({ projectId: activeProject.id, environment });
    if (result.success) setHubspotEnvironment(environment);
  };

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
            color="text.primary"
            onClick={() => navigate('/')}
          >
            {t('sidebar.backToProjects')}
          </Link>
          {activeProject ? (
            <Typography color="text.primary" fontWeight={600}>
              {activeProject.name}
            </Typography>
          ) : null}
          {sectionKey ? <Typography color="text.primary">{t(sectionKey)}</Typography> : null}
        </Breadcrumbs>

        {activeProject ? (
          <Typography variant="body2" color="text.primary" noWrap>
            {t('topbar.activeProject', { name: activeProject.name })}
          </Typography>
        ) : null}

        {hubspotEnvironment ? (
          <>
            <Chip
              size="small"
              clickable
              color={hubspotEnvironment === 'sandbox' ? 'secondary' : 'primary'}
              label={t(`topbar.environment.${hubspotEnvironment}`)}
              onClick={(event) => setEnvAnchor(event.currentTarget)}
              onDelete={(event) => setEnvAnchor(event.currentTarget)}
              deleteIcon={<ArrowDropDownIcon />}
              aria-label={t('topbar.environmentLabel', {
                environment: t(`topbar.environment.${hubspotEnvironment}`),
              })}
            />
            <Menu anchorEl={envAnchor} open={Boolean(envAnchor)} onClose={() => setEnvAnchor(null)}>
              {ENVIRONMENTS.map((environment) => (
                <MenuItem
                  key={environment}
                  selected={environment === hubspotEnvironment}
                  onClick={() => selectEnvironment(environment)}
                >
                  {t(`environment.${environment}`)}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}

        <LanguageSwitcher />

        <IconButton aria-label={t('topbar.notifications')} color="inherit">
          <Badge color="secondary" variant="dot" invisible={!hasUpdate}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
