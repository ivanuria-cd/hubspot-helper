import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { FieldTooltip } from './FieldTooltip';

const i18n = createI18n('es');
beforeAll(async () => {
  await i18n.changeLanguage('es');
});

function setup(describedById?: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <FieldTooltip helpKey="hubspot.fieldHelp.token" describedById={describedById} />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('FieldTooltip', () => {
  it('resuelve el texto por i18n (no literal) en el aria-label del disparador', () => {
    setup();
    const expected = i18n.t('hubspot.fieldHelp.token');
    expect(expected).not.toBe('hubspot.fieldHelp.token');
    expect(screen.getByRole('button', { name: expected })).toBeInTheDocument();
  });

  it('expone una descripción oculta con el id para aria-describedby', () => {
    const { container } = setup('field-token-help');
    const desc = container.querySelector('#field-token-help');
    expect(desc).not.toBeNull();
    expect(desc?.textContent).toBe(i18n.t('hubspot.fieldHelp.token'));
  });

  it('el disparador es enfocable (operable por teclado) y abre el tooltip', async () => {
    setup();
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      i18n.t('hubspot.fieldHelp.token'),
    );
  });
});
