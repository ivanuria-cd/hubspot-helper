import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-linkorigin-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

// Asociar un formulario `captured` a un origen y ver el informe de cobertura requiere que
// existan formularios importados (sincronización contra un portal o fixture de la API).
// Se deja preparado y se ejecuta en un entorno con portal/fixture.
test.fixme('asociar un formulario a un origen y ver la cobertura', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Link Origin');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();

  // Requiere portal/fixture: sincronizar para tener formularios.
  await window.getByRole('button', { name: 'Sincronizar HubSpot' }).click();

  // Abrir un formulario captured y asociarlo a un origen.
  await window.getByText(/sin origen/).first().click();
  await window.getByRole('button', { name: 'Asociar a origen' }).click();
  const modal = window.getByRole('dialog');
  await modal.getByText('Salesforce').click();
  await modal.getByRole('button', { name: 'Guardar' }).click();

  // El panel muestra el informe de cobertura por origen.
  await expect(window.getByText('Cobertura por origen')).toBeVisible();
});
