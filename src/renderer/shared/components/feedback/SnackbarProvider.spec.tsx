import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { SnackbarProvider, useSnackbar, type SnackbarOptions } from './SnackbarProvider';

const i18n = createI18n('es');
beforeAll(async () => {
  await i18n.changeLanguage('es');
});

function Trigger({ options }: { options: SnackbarOptions }): JSX.Element {
  const { notify } = useSnackbar();
  return <button onClick={() => notify(options)}>go</button>;
}

function renderWith(options: SnackbarOptions) {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <SnackbarProvider>
          <Trigger options={options} />
        </SnackbarProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );
  fireEvent.click(screen.getByText('go'));
}

describe('SnackbarProvider', () => {
  it('muestra un toast de éxito con role status (aria-live polite)', async () => {
    renderWith({ message: 'Guardado' });
    const alert = await screen.findByText('Guardado');
    const container = alert.closest('[role]');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('un error usa role alert (aria-live assertive)', async () => {
    renderWith({ message: 'Falló', severity: 'error' });
    const alert = await screen.findByText('Falló');
    const container = alert.closest('[role]');
    expect(container).toHaveAttribute('role', 'alert');
    expect(container).toHaveAttribute('aria-live', 'assertive');
  });

  it('el botón de cierre oculta el toast', async () => {
    renderWith({ message: 'Cerrable' });
    await screen.findByText('Cerrable');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByText('Cerrable')).not.toBeInTheDocument());
  });

  it('useSnackbar lanza fuera del provider', () => {
    expect(() => renderHook(() => useSnackbar())).toThrow();
  });
});
