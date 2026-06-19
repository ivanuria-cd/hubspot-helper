import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { useShellStore } from '@renderer/app/store/shell-store';
import { CrmOverviewScreen } from './CrmOverviewScreen';

const i18n = createI18n('es');

function setApi(overrides: Record<string, unknown> = {}): void {
  (window as unknown as { api: Record<string, unknown> }).api = {
    hubspotGetStatus: vi.fn().mockResolvedValue({ environments: { production: {} } }),
    entriesList: vi.fn().mockResolvedValue([{}, {}]),
    objectsListSchemas: vi.fn().mockResolvedValue([{}]),
    formsList: vi.fn().mockResolvedValue([]),
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
          <CrmOverviewScreen />
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('CrmOverviewScreen', () => {
  it('muestra las tres áreas con sus totales', async () => {
    setApi();
    renderScreen();
    await waitFor(() => expect(screen.getByText('Propiedades')).toBeInTheDocument());
    expect(screen.getByText('Objetos custom')).toBeInTheDocument();
    expect(screen.getByText('Formularios')).toBeInTheDocument();
  });

  it('avisa cuando HubSpot no está conectado', async () => {
    setApi({ hubspotGetStatus: vi.fn().mockResolvedValue(null) });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Configurar HubSpot')).toBeInTheDocument());
  });
});
