import { createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { RouteErrorBoundary } from '@shared/components/RouteErrorBoundary';
import { MainLayout } from './components/layout/MainLayout';
import { WelcomeRoute } from './components/welcome/WelcomeRoute';
import { ConfigSection } from './components/sections/ConfigSection';
import { HubSpotConnectorScreen } from '@renderer/features/connector-hubspot';
import { GoogleDriveConnectorScreen } from '@renderer/features/connector-gdrive';
import { McpSettingsScreen } from '@renderer/features/settings-mcp';
import { HelpSection } from '@renderer/features/help';
import { DashboardScreen } from '@renderer/features/dashboard';
import { CrmOverviewScreen } from '@renderer/features/crm-overview';
import { PropertyManagementScreen } from '@renderer/features/property-management';
import { CustomObjectsScreen } from '@renderer/features/custom-objects';
import { FormsManagementScreen } from '@renderer/features/forms-management';

export const routes: RouteObject[] = [
  { path: '/', element: <WelcomeRoute /> },
  {
    path: '/project/:projectId',
    element: <MainLayout />,
    // SPEC-0002 §25: errorElement en el padre — cubre TODAS las hijas (config/*, help incluidas)
    // manteniendo el layout; antes solo las 5 rutas de proyecto estaban protegidas.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'crm', element: <CrmOverviewScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'crm/properties', element: <PropertyManagementScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'crm/objects', element: <CustomObjectsScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'crm/forms', element: <FormsManagementScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'config', element: <ConfigSection />, errorElement: <RouteErrorBoundary /> },
      { path: 'config/connectors/hubspot', element: <HubSpotConnectorScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'config/connectors/google-drive', element: <GoogleDriveConnectorScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'config/api-mcp', element: <McpSettingsScreen />, errorElement: <RouteErrorBoundary /> },
      { path: 'help', element: <HelpSection />, errorElement: <RouteErrorBoundary /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export function createAppRouter() {
  return createMemoryRouter(routes, { initialEntries: ['/'] });
}
