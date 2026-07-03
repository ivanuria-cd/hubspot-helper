import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { cdPalette } from '@renderer/theme';
import { useShellStore } from '@renderer/app/store/shell-store';
import { NAV_ITEMS, type NavItem } from './nav-items';

const EXPANDED_WIDTH = 240;
const RAIL_WIDTH = 64;

export function Sidebar(): JSX.Element {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const collapsed = useShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);

  const width = collapsed ? RAIL_WIDTH : EXPANDED_WIDTH;
  const base = projectId ? `/project/${projectId}` : '';

  const targetFor = (item: NavItem): string => (item.path ? `${base}/${item.path}` : base);

  const isActive = (item: NavItem): boolean => {
    const target = targetFor(item);
    return item.path === '' ? location.pathname === base : location.pathname === target;
  };

  const footerItems = NAV_ITEMS.filter((item) => item.footer);
  const mainItems = NAV_ITEMS.filter((item) => !item.footer);

  const renderItem = (item: NavItem): JSX.Element => {
    const label = t(item.labelKey);
    const active = isActive(item);
    const Icon = item.icon;
    const button = (
      <ListItemButton
        selected={active}
        onClick={() => navigate(targetFor(item))}
        aria-current={active ? 'page' : undefined}
        sx={{
          justifyContent: collapsed ? 'center' : 'flex-start',
          pl: collapsed ? undefined : item.child ? 4 : undefined,
          '&.Mui-selected': { borderRight: `3px solid ${cdPalette.accent}` },
        }}
      >
        <ListItemIcon
          sx={{ minWidth: 0, mr: collapsed ? 0 : 2, color: 'inherit', justifyContent: 'center' }}
        >
          <Icon aria-hidden />
        </ListItemIcon>
        {collapsed ? null : <ListItemText primary={label} />}
      </ListItemButton>
    );
    // Semántica de lista válida (axe `list`/`listitem`, informe e2e 2026-07-03): los hijos del
    // <ul> deben ser <li> directos — sin Box envolvente ni <hr> hermano; el separador de grupo
    // pasa a ser el `divider` del propio ListItem.
    return (
      <ListItem
        key={item.labelKey}
        disablePadding
        divider={item.endsGroup}
        sx={item.endsGroup ? { '&.MuiListItem-divider': { borderBottomColor: 'rgba(255,255,255,0.12)' } } : undefined}
      >
        {collapsed ? (
          <Tooltip title={label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  return (
    <Drawer
      variant="permanent"
      aria-label={t('sidebar.label')}
      sx={{
        width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: cdPalette.bgDark,
          color: cdPalette.textOnDark,
          borderRight: 'none',
          transition: 'width 150ms ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: 1,
          py: 1.5,
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          sx={{ color: 'inherit' }}
        >
          {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ flexGrow: 1 }}>{mainItems.map(renderItem)}</List>
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        <List>{footerItems.map(renderItem)}</List>
      </Box>
    </Drawer>
  );
}
