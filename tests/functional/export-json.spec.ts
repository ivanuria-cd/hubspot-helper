import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-export-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('exportar el JSON de un origen con una propiedad mapeada', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Export');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  // Crear un origen.
  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const originsModal = window.getByRole('dialog');
  await originsModal.getByLabel('Nombre').fill('Integración X');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await originsModal.getByRole('button', { name: 'Cerrar' }).click();

  // Crear una propiedad.
  await window.getByRole('button', { name: 'Propiedad' }).click();
  const addDialog = window.getByRole('dialog');
  await addDialog.getByLabel('Nombre técnico (HubSpot)').fill('custom_tier');
  await addDialog.getByLabel('Etiqueta').fill('Tier');
  await addDialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByText('custom_tier')).toBeVisible();

  // Mapear la propiedad al origen.
  await window.getByText('custom_tier').click();
  await window.getByRole('button', { name: 'Añadir origen' }).click();
  const mapDialog = window.getByRole('dialog');
  await mapDialog.getByLabel('Campo origen').fill('Account_Tier__c');
  await mapDialog.getByRole('button', { name: 'Guardar' }).click();

  // Exportar el JSON y validar el fichero descargado.
  const downloadPromise = window.waitForEvent('download');
  await window.getByRole('button', { name: 'Exportar JSON' }).click();
  await window.getByRole('menuitem', { name: 'Integración X' }).click();
  const download = await downloadPromise;

  const path = await download.path();
  const content = JSON.parse(await readFile(path, 'utf-8'));
  expect(content.schema_version).toBe(1);
  expect(content.origin.name).toBe('Integración X');
  expect(content.properties[0].hubspot_name).toBe('custom_tier');
  expect(content.properties[0].source_field).toBe('Account_Tier__c');
});
