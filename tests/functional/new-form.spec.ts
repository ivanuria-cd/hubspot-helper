import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-newform-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

/** Crea el proyecto y prepara un origen y una entrada de propiedad locales (SPEC-0006). */
async function seedOriginAndEntry(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Formularios');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();

  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  // Origen local.
  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const originsModal = window.getByRole('dialog');
  // exact: el aria-label del botón de ayuda (FieldTooltip) empieza por «Nombre…».
  await originsModal.getByLabel('Nombre', { exact: true }).fill('CSV Web');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(originsModal.getByText('CSV Web')).toBeVisible();
  await originsModal.getByRole('button', { name: 'Cerrar' }).click();

  // Entrada con destino nuevo y una fila de origen: es lo que preselecciona
  // campos en el asistente de formularios (NewFormWizard).
  await window.getByRole('button', { name: 'Propiedad', exact: true }).click();
  const wizard = window.getByRole('dialog');
  await wizard.getByLabel('Nombre de la propiedad').fill('Email contacto');
  await wizard.getByRole('button', { name: 'Nueva', exact: true }).click();
  await wizard.getByLabel('Nombre técnico (HubSpot)').fill('form_email');
  await wizard.getByLabel('Etiqueta', { exact: true }).fill('Email contacto');
  await wizard.getByRole('button', { name: 'Añadir origen' }).click();
  await wizard.getByLabel('Campo origen', { exact: true }).fill('email');
  await wizard.getByRole('button', { name: 'Guardar' }).click();
  await expect(window.getByText('form_email')).toBeVisible();
}

// Flujo local de creación de formulario (SPEC-0008): el asistente preselecciona
// los campos de las entradas asociadas al origen y la creación queda como cambio
// pendiente. Aplicar el cambio en Sandbox/Producción requiere un portal HubSpot
// conectado y queda fuera de este spec.
test('crear un formulario desde el asistente genera un cambio pendiente', async () => {
  const window = await app.firstWindow();
  await seedOriginAndEntry(window);

  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();
  await expect(
    window.getByRole('button', { name: /Cambios pendientes \(0\)/ }),
  ).toBeDisabled();

  // Abrir el asistente de creación.
  await window.getByRole('button', { name: 'Formulario', exact: true }).click();
  const wizard = window.getByRole('dialog');
  await expect(wizard.getByText('Crear formulario')).toBeVisible();

  // Rol textbox explícito: el botón del FieldTooltip comparte prefijo de aria-label con el campo.
  await wizard.getByRole('textbox', { name: 'Nombre del formulario', exact: true }).fill('Formulario Web');
  const createButton = wizard.getByRole('button', { name: 'Crear', exact: true });
  // Sin campos seleccionados no se puede crear.
  await expect(createButton).toBeDisabled();

  // Al marcar el origen se preselecciona el campo de la entrada (form_email).
  await wizard.getByRole('checkbox', { name: 'CSV Web' }).check();
  await expect(wizard.getByRole('checkbox', { name: 'form_email' })).toBeChecked();
  await expect(createButton).toBeEnabled();
  await createButton.click();

  // La creación queda como cambio pendiente local.
  const pendingButton = window.getByRole('button', { name: /Cambios pendientes \(1\)/ });
  await expect(pendingButton).toBeEnabled();
  await pendingButton.click();
  await expect(window.getByText('Formularios / Cambios pendientes')).toBeVisible();
  await expect(window.getByText(/Formulario Web/)).toBeVisible();
  await expect(window.getByText('create_form')).toBeVisible();
  // Los botones de aplicar existen pero requieren conector real (no se pulsan aquí).
  await expect(window.getByRole('button', { name: 'Aplicar en Sandbox' })).toBeVisible();
});
