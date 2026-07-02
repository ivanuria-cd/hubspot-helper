import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { ConfirmProvider } from '@shared/components/feedback';
import type { PropertyEntry } from '@shared/types/properties';
import { EntryPanel } from './EntryPanel';

const i18n = createI18n('es');

function makeEntry(description?: string): PropertyEntry {
  return {
    id: 'e1',
    objectType: 'contacts',
    name: 'Mi entrada',
    hubspotProperty: {
      mode: 'new',
      definition: {
        hubspotName: 'mi_prop',
        label: 'Mi prop',
        type: 'string',
        fieldType: 'text',
        groupName: 'grupo',
        ...(description ? { description } : {}),
      },
    },
    sources: [],
    hubspotStatus: 'missing',
  };
}

function renderPanel(entry: PropertyEntry) {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <ConfirmProvider>
          <EntryPanel
            entry={entry}
            origins={[]}
            onClose={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onApply={vi.fn().mockResolvedValue(undefined)}
          />
        </ConfirmProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

describe('EntryPanel — descripción', () => {
  it('muestra la descripción cuando la definición la tiene', () => {
    renderPanel(makeEntry('Texto de la descripción'));
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Texto de la descripción')).toBeInTheDocument();
  });

  it('no muestra el bloque de descripción si no hay descripción', () => {
    renderPanel(makeEntry());
    expect(screen.queryByText('Descripción')).not.toBeInTheDocument();
  });
});

describe('EntryPanel — formField (§46)', () => {
  function withFormField(formField?: boolean): PropertyEntry {
    const e = makeEntry();
    (e.hubspotProperty.definition as { formField?: boolean }).formField = formField;
    return e;
  }

  it('muestra «Sí» cuando formField es true', () => {
    renderPanel(withFormField(true));
    expect(screen.getByText('En formularios y chatbots')).toBeInTheDocument();
    expect(screen.getByText('Sí')).toBeInTheDocument();
  });

  it('muestra «No» cuando formField es false', () => {
    renderPanel(withFormField(false));
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('muestra el default de HubSpot cuando formField es undefined', () => {
    renderPanel(withFormField(undefined));
    expect(screen.getByText('Por defecto de HubSpot')).toBeInTheDocument();
  });
});
