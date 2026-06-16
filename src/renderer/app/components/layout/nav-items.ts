import DashboardIcon from '@mui/icons-material/Dashboard';
import HubIcon from '@mui/icons-material/Hub';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  /** Ruta relativa al proyecto activo (`/project/:id/<path>`). */
  path: string;
  /** Clave i18n del grupo/etiqueta en `common.json`. */
  labelKey: string;
  icon: SvgIconComponent;
  /** Marca el final de un grupo: añade separador visual debajo. */
  endsGroup?: boolean;
  /** Empuja el ítem al fondo del menú (p. ej. Configuración). */
  footer?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '', labelKey: 'sidebar.dashboard', icon: DashboardIcon, endsGroup: true },
  { path: 'crm', labelKey: 'sidebar.crm', icon: HubIcon },
  { path: 'crm/properties', labelKey: 'sidebar.properties', icon: TuneIcon },
  { path: 'crm/objects', labelKey: 'sidebar.objects', icon: CategoryIcon },
  { path: 'crm/maps', labelKey: 'sidebar.maps', icon: AccountTreeIcon, endsGroup: true },
  { path: 'reporting', labelKey: 'sidebar.reporting', icon: InsightsIcon, endsGroup: true },
  { path: 'help', labelKey: 'sidebar.help', icon: HelpOutlineIcon, footer: true },
  { path: 'config', labelKey: 'sidebar.config', icon: SettingsIcon, footer: true },
];
