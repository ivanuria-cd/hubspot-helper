import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import type { Project } from '@shared/types/project';
import { WelcomeScreen } from './WelcomeScreen';

const i18n = createI18n('es');

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

const project = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastOpenedAt: '2026-01-01T00:00:00.000Z',
  connectors: {},
});

function renderWelcome(handlers: Record<string, unknown>) {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <WelcomeScreen
          projects={[project('a', 'Cliente A')]}
          onOpenProject={vi.fn()}
          onCreateProject={vi.fn()}
          onDeleteProject={vi.fn()}
          {...handlers}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('WelcomeScreen — exportar/importar (SPEC-0013)', () => {
  it('invoca onImportProject al pulsar "Importar proyecto"', () => {
    const onImportProject = vi.fn();
    renderWelcome({ onImportProject });
    fireEvent.click(screen.getByRole('button', { name: 'Importar proyecto' }));
    expect(onImportProject).toHaveBeenCalledTimes(1);
  });

  it('invoca onExportProject con el proyecto al pulsar su acción de exportar', () => {
    const onExportProject = vi.fn();
    renderWelcome({ onExportProject });
    fireEvent.click(screen.getByRole('button', { name: /Exportar proyecto Cliente A/ }));
    expect(onExportProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});
