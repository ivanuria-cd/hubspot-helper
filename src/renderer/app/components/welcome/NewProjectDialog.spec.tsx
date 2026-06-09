import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { NewProjectDialog, PROJECT_NAME_MAX_LENGTH } from './NewProjectDialog';

const i18n = createI18n('es');

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

function renderDialog(onCreate = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <NewProjectDialog open onClose={vi.fn()} onCreate={onCreate} />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return onCreate;
}

const submit = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
};
const nameInput = (): HTMLElement => screen.getByLabelText('Nombre del proyecto');

describe('NewProjectDialog', () => {
  it('no crea y muestra error cuando el nombre está vacío', () => {
    const onCreate = renderDialog();
    submit();
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
  });

  it('no crea cuando el nombre supera el máximo permitido', () => {
    const onCreate = renderDialog();
    fireEvent.change(nameInput(), { target: { value: 'x'.repeat(PROJECT_NAME_MAX_LENGTH + 1) } });
    submit();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('crea el proyecto con valores recortados cuando es válido', () => {
    const onCreate = renderDialog();
    fireEvent.change(nameInput(), { target: { value: '  Cliente Nuevo  ' } });
    submit();
    expect(onCreate).toHaveBeenCalledWith({ name: 'Cliente Nuevo', description: undefined });
  });
});
