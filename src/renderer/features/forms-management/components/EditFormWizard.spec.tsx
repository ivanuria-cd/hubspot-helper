import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import type { FormEditsInput } from '@shared/types/forms';
import { EditFormWizard, type EditFormSource } from './EditFormWizard';

const i18n = createI18n('es');

function makeSource(): EditFormSource {
  return {
    name: 'Formulario semilla',
    fields: [
      {
        objectTypeId: '0-1',
        name: 'email',
        label: 'Email',
        fieldType: 'email',
        required: true,
        hidden: false,
      },
    ],
    submitButtonText: 'Enviar',
    consentType: 'none',
    privacyText: '',
    consentToProcessText: '',
    communicationConsentText: '',
    communicationsCheckboxes: [],
    showName: true,
    showConfig: true,
    showOrigins: false,
    originIds: [],
  };
}

function renderWizard() {
  const onSubmit = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <EditFormWizard
          open
          source={makeSource()}
          origins={[]}
          subscriptionTypes={[]}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return { onSubmit };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

describe('EditFormWizard', () => {
  it('renderiza el formulario semilla y añade una fila de campo', () => {
    renderWizard();

    // Fila semilla (aria-label por fila, SPEC-0008 §32).
    expect(screen.getByLabelText('Nombre interno 1')).toHaveValue('email');
    expect(screen.queryByLabelText('Nombre interno 2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir campo' }));

    expect(screen.getByLabelText('Nombre interno 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre interno 2')).toHaveValue('');
  });

  it('el payload de guardado incluye los campos con nombre y no incluye uiId', () => {
    const { onSubmit } = renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir campo' }));
    fireEvent.change(screen.getByLabelText('Nombre interno 2'), {
      target: { value: 'firstname' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [edits, originIds] = onSubmit.mock.calls[0] as [FormEditsInput, string[] | undefined];

    const fields = edits.fields ?? [];
    expect(fields.map((field) => field.name)).toEqual(['email', 'firstname']);
    for (const field of fields) {
      expect(field).not.toHaveProperty('uiId');
    }
    // showOrigins es false: no se envían orígenes.
    expect(originIds).toBeUndefined();
  });

  it('descarta las filas sin nombre interno al guardar', () => {
    const { onSubmit } = renderWizard();

    // Fila nueva que se queda vacía: no debe salir en el payload.
    fireEvent.click(screen.getByRole('button', { name: 'Añadir campo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const [edits] = onSubmit.mock.calls[0] as [FormEditsInput];
    expect((edits.fields ?? []).map((field) => field.name)).toEqual(['email']);
  });
});
