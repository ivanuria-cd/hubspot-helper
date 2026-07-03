import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { SnackbarProvider } from '@shared/components/feedback';
import type { HubSpotGroup, HubSpotPropertyDef } from '@shared/types/properties';
import { EntryWizard } from './EntryWizard';

const i18n = createI18n('es');

const HS_PROPS: HubSpotPropertyDef[] = [
  { hubspotName: 'email', label: 'Email', type: 'string', fieldType: 'text', groupName: 'contactinformation' },
];

const GROUPS: HubSpotGroup[] = [{ name: 'contactinformation', label: 'Información de contacto' }];

interface ApiMock {
  hubspotPropertiesList: ReturnType<typeof vi.fn>;
  groupsList: ReturnType<typeof vi.fn>;
}

function setApi(): ApiMock {
  const api: ApiMock = {
    hubspotPropertiesList: vi.fn().mockResolvedValue(HS_PROPS),
    groupsList: vi.fn().mockResolvedValue(GROUPS),
  };
  (window as unknown as { api: Record<string, unknown> }).api = api as unknown as Record<string, unknown>;
  return api;
}

function renderWizard() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <SnackbarProvider>
          <EntryWizard
            open
            projectId="p1"
            objectType="contacts"
            entry={null}
            origins={[]}
            onClose={vi.fn()}
            onSubmit={onSubmit}
          />
        </SnackbarProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );
  return { onSubmit };
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Guardar' });
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

describe('EntryWizard', () => {
  it('renderiza abierto, carga propiedades y grupos, y deshabilita Guardar sin nombre', async () => {
    const api = setApi();
    renderWizard();

    expect(screen.getByText('Añadir propiedad')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.hubspotPropertiesList).toHaveBeenCalledWith({ projectId: 'p1', objectType: 'contacts' });
      expect(api.groupsList).toHaveBeenCalledWith({ projectId: 'p1', objectType: 'contacts' });
    });

    // Sin nombre de entrada (y sin propiedad destino) no se puede guardar.
    expect(saveButton()).toBeDisabled();
  });

  it('en modo «existing», el nombre solo no basta: hace falta la propiedad destino', async () => {
    setApi();
    renderWizard();

    fireEvent.change(screen.getByLabelText('Nombre de la propiedad'), {
      target: { value: 'Mi entrada' },
    });
    expect(saveButton()).toBeDisabled();
  });

  it('en modo «new» exige nombre técnico y etiqueta para habilitar Guardar', async () => {
    setApi();
    renderWizard();
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Nombre de la propiedad'), {
      target: { value: 'Mi entrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }));

    // Con nombre de entrada pero sin definición, sigue deshabilitado.
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nombre técnico (HubSpot)'), {
      target: { value: 'mi_prop' },
    });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Mi prop' } });
    expect(saveButton()).toBeEnabled();
  });
});
