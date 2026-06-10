import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-help-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('la sección Ayuda lista y renderiza los tutoriales', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Ayuda');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await window.getByRole('button', { name: 'Ayuda' }).click();

  await expect(window.getByRole('heading', { name: 'Ayuda' })).toBeVisible();
  await window.getByRole('button', { name: 'Conectar la app con HubSpot' }).click();
  await expect(window.getByText(/Pega el token en el campo/)).toBeVisible();
});
