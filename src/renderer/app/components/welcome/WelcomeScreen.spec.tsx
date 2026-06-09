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

function renderWelcome(projects: Project[], handlers = {}) {
  const props = {
    projects,
    onOpenProject: vi.fn(),
    onCreateProject: vi.fn(),
    onDeleteProject: vi.fn(),
    ...handlers,
  };
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <WelcomeScreen {...props} />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return props;
}

const project = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastOpenedAt: '2026-01-01T00:00:00.000Z',
  connectors: {},
});

describe('WelcomeScreen', () => {
  it('renderiza la lista de proyectos recibida', () => {
    renderWelcome([project('a', 'Cliente A'), project('b', 'Cliente B')]);
    expect(screen.getByText('Cliente A')).toBeInTheDocument();
    expect(screen.getByText('Cliente B')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay proyectos', () => {
    renderWelcome([]);
    expect(screen.getByText('¿Primer uso? Configura tu primer proyecto.')).toBeInTheDocument();
  });

  it('abre el diálogo al pulsar "Nuevo proyecto"', () => {
    renderWelcome([]);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('invoca onOpenProject al pulsar una tarjeta', () => {
    const props = renderWelcome([project('a', 'Cliente A')]);
    fireEvent.click(screen.getByRole('button', { name: /Abrir proyecto Cliente A/ }));
    expect(props.onOpenProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});
