import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { useShellStore } from '@renderer/app/store/shell-store';
import { DashboardScreen } from './DashboardScreen';

const i18n = createI18n('es');

function setApi(overrides: Record<string, unknown> = {}): void {
  (window as unknown as { api: Record<string, unknown> }).api = {
    hubspotGetStatus: vi.fn().mockResolvedValue(null),
    gdriveGetStatus: vi.fn().mockResolvedValue(null),
    mcpGetStatus: vi.fn().mockResolvedValue({ running: false, port: 0, toolCount: 0 }),
    entriesList: vi.fn().mockResolvedValue([]),
    objectsListSchemas: vi.fn().mockResolvedValue([]),
    formsPendingChanges: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
  useShellStore.setState({ activeProject: { id: 'p1', name: 'Proyecto' } as never });
});

function renderScreen() {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <MemoryRouter>
          <DashboardScreen />
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('DashboardScreen', () => {
  it('muestra los primeros pasos cuando no hay conectores', async () => {
    setApi();
    renderScreen();
    await waitFor(() => expect(screen.getByText('Primeros pasos')).toBeInTheDocument());
    expect(screen.getByText('Conectar HubSpot')).toBeInTheDocument();
  });

  it('muestra las tarjetas de conector y pendientes cuando hay conexión', async () => {
    setApi({
      mcpGetStatus: vi.fn().mockResolvedValue({ running: true, port: 5000, toolCount: 7 }),
      formsPendingChanges: vi.fn().mockResolvedValue([{}, {}]),
    });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Conectores')).toBeInTheDocument());
    expect(screen.getByText('Cambios pendientes')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });
});
