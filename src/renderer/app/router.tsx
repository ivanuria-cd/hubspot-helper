import { createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
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
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'crm', element: <CrmOverviewScreen /> },
      { path: 'crm/properties', element: <PropertyManagementScreen /> },
      { path: 'crm/objects', element: <CustomObjectsScreen /> },
      { path: 'crm/forms', element: <FormsManagementScreen /> },
      { path: 'config', element: <ConfigSection /> },
      { path: 'config/connectors/hubspot', element: <HubSpotConnectorScreen /> },
      { path: 'config/connectors/google-drive', element: <GoogleDriveConnectorScreen /> },
      { path: 'config/api-mcp', element: <McpSettingsScreen /> },
      { path: 'help', element: <HelpSection /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export function createAppRouter() {
  return createMemoryRouter(routes, { initialEntries: ['/'] });
}
