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
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-linkorigin-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

/** Crea el proyecto, dos orígenes locales y una entrada asociada al primero. */
async function seedProject(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Vinculos');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();

  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const originsModal = window.getByRole('dialog');
  await originsModal.getByLabel('Nombre', { exact: true }).fill('CSV Web');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(originsModal.getByText('CSV Web')).toBeVisible();
  await originsModal.getByLabel('Nombre', { exact: true }).fill('ERP');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(originsModal.getByText('ERP')).toBeVisible();
  await originsModal.getByRole('button', { name: 'Cerrar' }).click();

  await window.getByRole('button', { name: 'Propiedad', exact: true }).click();
  const wizard = window.getByRole('dialog');
  await wizard.getByLabel('Nombre de la propiedad').fill('Email web');
  await wizard.getByRole('button', { name: 'Nueva', exact: true }).click();
  await wizard.getByLabel('Nombre técnico (HubSpot)').fill('web_email');
  await wizard.getByLabel('Etiqueta', { exact: true }).fill('Email web');
  await wizard.getByRole('button', { name: 'Añadir origen' }).click();
  await wizard.getByLabel('Campo origen', { exact: true }).fill('email');
  await wizard.getByRole('button', { name: 'Guardar' }).click();
  await expect(window.getByText('web_email')).toBeVisible();
}

// Asociación de orígenes en local (SPEC-0008 §22/§23): el cambio pendiente
// `create_form` guarda los orígenes asociados y pueden editarse antes de aplicar.
// Asociar un origen a un formulario YA sincronizado (FormPanel → «Asociar a
// origen») requiere un portal HubSpot con formularios y queda fuera de este spec.
test('asociar orígenes a un formulario pendiente y editarlos antes de aplicar', async () => {
  const window = await app.firstWindow();
  await seedProject(window);

  // Crear el formulario asociado solo al primer origen.
  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();
  await window.getByRole('button', { name: 'Formulario', exact: true }).click();
  const createWizard = window.getByRole('dialog');
  // Rol textbox explícito: el botón del FieldTooltip comparte prefijo de aria-label con el campo.
  await createWizard
    .getByRole('textbox', { name: 'Nombre del formulario', exact: true })
    .fill('Formulario Web');
  await createWizard.getByRole('checkbox', { name: 'CSV Web' }).check();
  await expect(
    createWizard.getByRole('checkbox', { name: 'web_email', exact: true }),
  ).toBeChecked();
  await createWizard.getByRole('button', { name: 'Crear', exact: true }).click();

  // Editar el cambio pendiente: la sección «Orígenes asociados» refleja el vínculo.
  await window.getByRole('button', { name: /Cambios pendientes \(1\)/ }).click();
  await window.getByRole('button', { name: 'Editar', exact: true }).click();
  const editWizard = window.getByRole('dialog');
  await expect(editWizard.getByText('Orígenes asociados')).toBeVisible();
  await expect(editWizard.getByRole('checkbox', { name: 'CSV Web' })).toBeChecked();
  await expect(editWizard.getByRole('checkbox', { name: 'ERP' })).not.toBeChecked();

  // Asociar el segundo origen y guardar.
  await editWizard.getByRole('checkbox', { name: 'ERP' }).check();
  await editWizard.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editWizard).toBeHidden();

  // Reabrir el editor: la asociación persiste en el cambio pendiente.
  await window.getByRole('button', { name: 'Editar', exact: true }).click();
  const reopened = window.getByRole('dialog');
  await expect(reopened.getByRole('checkbox', { name: 'CSV Web' })).toBeChecked();
  await expect(reopened.getByRole('checkbox', { name: 'ERP' })).toBeChecked();
  await reopened.getByRole('button', { name: 'Cancelar' }).click();
});
