import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-gdrive-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('la configuración de Google Drive es accesible desde Config > Conectores', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Drive');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();

  await window.getByRole('button', { name: 'Configuración' }).click();
  await window.getByRole('button', { name: 'Google Drive' }).click();

  await expect(window.getByText('Conectores / Google Drive')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Conectar con Google' })).toBeVisible();
});
