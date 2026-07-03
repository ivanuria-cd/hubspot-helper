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
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-formsflow-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

async function createProject(window: Page, name: string): Promise<void> {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();
}

/** Prepara un origen y una entrada locales para poder crear un formulario. */
async function seedOriginAndEntry(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const originsModal = window.getByRole('dialog');
  await originsModal.getByLabel('Nombre', { exact: true }).fill('CSV Newsletter');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(originsModal.getByText('CSV Newsletter')).toBeVisible();
  await originsModal.getByRole('button', { name: 'Cerrar' }).click();

  await window.getByRole('button', { name: 'Propiedad', exact: true }).click();
  const wizard = window.getByRole('dialog');
  await wizard.getByLabel('Nombre de la propiedad').fill('Email suscriptor');
  await wizard.getByRole('button', { name: 'Nueva', exact: true }).click();
  await wizard.getByLabel('Nombre técnico (HubSpot)').fill('newsletter_email');
  await wizard.getByLabel('Etiqueta', { exact: true }).fill('Email suscriptor');
  await wizard.getByRole('button', { name: 'Añadir origen' }).click();
  await wizard.getByLabel('Campo origen', { exact: true }).fill('email');
  await wizard.getByRole('button', { name: 'Guardar' }).click();
  await expect(window.getByText('newsletter_email')).toBeVisible();
}

// Flujo local de la pantalla de formularios (SPEC-0008): estado vacío inicial,
// creación de un cambio pendiente y descarte con confirmación. La sincronización
// («Sincronizar HubSpot») y la aplicación de cambios requieren un portal HubSpot
// conectado y quedan fuera de este spec.
test('flujo de formularios: estado vacío, cambio pendiente y descarte', async () => {
  const window = await app.firstWindow();
  await createProject(window, 'Cliente Flujo Forms');

  // Estado inicial: lista vacía y cambios pendientes deshabilitado.
  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();
  await expect(window.getByRole('status')).toBeVisible();
  await expect(
    window.getByRole('button', { name: /Cambios pendientes \(0\)/ }),
  ).toBeDisabled();
  await expect(window.getByRole('button', { name: 'Sincronizar HubSpot' })).toBeVisible();

  // Crear un cambio pendiente local (origen + entrada + formulario).
  await seedOriginAndEntry(window);
  await window.getByRole('button', { name: 'Formularios' }).click();
  await window.getByRole('button', { name: 'Formulario', exact: true }).click();
  const wizard = window.getByRole('dialog');
  // Rol textbox explícito: el botón del FieldTooltip comparte prefijo de aria-label con el campo.
  await wizard.getByRole('textbox', { name: 'Nombre del formulario', exact: true }).fill('Alta newsletter');
  await wizard.getByRole('checkbox', { name: 'CSV Newsletter' }).check();
  await expect(wizard.getByRole('checkbox', { name: 'newsletter_email' })).toBeChecked();
  await wizard.getByRole('button', { name: 'Crear', exact: true }).click();

  // Vista de cambios pendientes y vuelta a la lista.
  await window.getByRole('button', { name: /Cambios pendientes \(1\)/ }).click();
  await expect(window.getByText('Formularios / Cambios pendientes')).toBeVisible();
  await expect(window.getByText(/Alta newsletter/)).toBeVisible();
  await window.getByRole('button', { name: 'Volver a formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();

  // Descartar el cambio con confirmación (ConfirmDialog).
  await window.getByRole('button', { name: /Cambios pendientes \(1\)/ }).click();
  await window.getByRole('button', { name: 'Descartar' }).click();
  await window.getByRole('button', { name: 'Aceptar' }).click();
  await expect(window.getByText('No hay cambios pendientes.')).toBeVisible();
});
