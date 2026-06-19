import { describe, it, expect, beforeAll } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

const i18n = createI18n('es');
beforeAll(async () => {
  await i18n.changeLanguage('es');
});

function Consumer(): JSX.Element {
  const confirm = useConfirm();
  const [result, setResult] = useState('');
  return (
    <>
      <button
        onClick={async () => setResult(String(await confirm({ title: 'Título', body: 'Cuerpo' })))}
      >
        go
      </button>
      <span data-testid="result">{result}</span>
    </>
  );
}

function setup() {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <ConfirmProvider>
          <Consumer />
        </ConfirmProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );
  fireEvent.click(screen.getByText('go'));
}

describe('ConfirmProvider', () => {
  it('resuelve true al aceptar', async () => {
    setup();
    await screen.findByText('Cuerpo');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true'));
  });

  it('resuelve false al cancelar', async () => {
    setup();
    await screen.findByText('Cuerpo');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
  });

  it('el foco inicial está en Cancelar', async () => {
    setup();
    await screen.findByText('Cuerpo');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('useConfirm lanza fuera del provider', () => {
    expect(() => renderHook(() => useConfirm())).toThrow();
  });
});
