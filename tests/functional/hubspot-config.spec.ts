import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-hubspot-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('la configuración de HubSpot es accesible desde Config > Conectores', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente HubSpot');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();

  await window.getByRole('button', { name: 'Configuración' }).click();
  await window.getByRole('button', { name: 'HubSpot' }).click();

  await expect(window.getByText('Conectores / HubSpot')).toBeVisible();
  await expect(window.getByLabel('Private App Token')).toBeVisible();
  await expect(window.getByText('No configurado')).toBeVisible();
});
