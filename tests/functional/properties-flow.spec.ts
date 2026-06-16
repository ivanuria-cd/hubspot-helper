import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-propflow-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

// Nota: la sincronización real contra HubSpot requiere un portal conectado. Este test
// ejercita el flujo de UI accesible sin portal: crear una propiedad inexistente
// (estado missing) y navegar a la vista de cambios pendientes.
test('flujo de propiedades: crear propiedad missing y abrir cambios pendientes', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Flujo');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  // Crear una propiedad nueva (no existe en HubSpot) con el asistente.
  await window.getByRole('button', { name: 'Propiedad', exact: true }).click();
  const addDialog = window.getByRole('dialog');
  await addDialog.getByLabel('Nombre de la propiedad').fill('Nueva propiedad');
  await addDialog.getByRole('button', { name: 'Nueva', exact: true }).click();
  await addDialog.getByLabel('Nombre técnico (HubSpot)').fill('new_custom_prop');
  await addDialog.getByLabel('Etiqueta', { exact: true }).fill('Nueva propiedad');
  await addDialog.getByRole('button', { name: 'Guardar' }).click();

  // La propiedad aparece con estado missing (badge «falta»).
  await expect(window.getByText('new_custom_prop')).toBeVisible();
  await expect(window.getByText('✕ falta')).toBeVisible();

  // El panel lateral (región «Definición») muestra la sección de cambios pendientes.
  await window.getByText('new_custom_prop').click();
  await expect(window.getByRole('region', { name: 'Definición' })).toBeVisible();
  await expect(window.getByRole('heading', { name: 'Cambios pendientes' })).toBeVisible();
});
