import { createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { WelcomeRoute } from './components/welcome/WelcomeRoute';
import { SectionPlaceholder } from './components/sections/SectionPlaceholder';
import { ConfigSection } from './components/sections/ConfigSection';
import { HubSpotConnectorScreen } from '@renderer/features/connector-hubspot';
import { HelpSection } from '@renderer/features/help';

export const routes: RouteObject[] = [
  { path: '/', element: <WelcomeRoute /> },
  {
    path: '/project/:projectId',
    element: <MainLayout />,
    children: [
      { index: true, element: <SectionPlaceholder titleKey="sidebar.dashboard" /> },
      { path: 'crm', element: <SectionPlaceholder titleKey="sidebar.crm" /> },
      { path: 'crm/maps', element: <SectionPlaceholder titleKey="sidebar.maps" /> },
      { path: 'reporting', element: <SectionPlaceholder titleKey="sidebar.reporting" /> },
      { path: 'config', element: <ConfigSection /> },
      { path: 'config/connectors/hubspot', element: <HubSpotConnectorScreen /> },
      { path: 'help', element: <HelpSection /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export function createAppRouter() {
  return createMemoryRouter(routes, { initialEntries: ['/'] });
}
