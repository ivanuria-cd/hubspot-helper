import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { HelpSection } from './HelpSection';

vi.mock('../tutorials', async (importActual) => {
  const actual = await importActual<typeof import('../tutorials')>();
  return {
    ...actual,
    tutorials: [
      {
        id: 'demo/full',
        feature: 'demo',
        slug: 'full',
        titles: { es: 'Demo ES', en: 'Demo EN' },
        content: { es: '# Demo ES\n\ncuerpo es', en: '# Demo EN\n\nbody en' },
      },
      {
        id: 'demo/onlyes',
        feature: 'demo',
        slug: 'onlyes',
        titles: { es: 'Solo ES' },
        content: { es: '# Solo ES\n\nsolo cuerpo' },
      },
    ],
    tutorialFeatures: () => ['demo'],
  };
});

const i18n = createI18n('es');

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

function renderHelp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <HelpSection />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('HelpSection', () => {
  it('renderiza el contenido en el idioma activo', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    renderHelp();
    expect(screen.getByRole('button', { name: 'Demo EN' })).toBeInTheDocument();
    expect(screen.getByText('body en')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra el aviso de fallback cuando falta la traducción', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    renderHelp();
    fireEvent.click(screen.getByText('Solo ES'));
    expect(screen.getByRole('alert')).toHaveTextContent(/isn't available in English/);
    expect(screen.getByText('solo cuerpo')).toBeInTheDocument();
  });

  it('mantiene la selección y cambia el idioma en caliente', async () => {
    renderHelp();
    expect(screen.getByText('cuerpo es')).toBeInTheDocument();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(screen.getByText('body en')).toBeInTheDocument();
    expect(screen.queryByText('cuerpo es')).not.toBeInTheDocument();
  });
});
