import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-welcome-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('crear un proyecto desde cero abre el shell con el menú lateral', async () => {
  const window = await app.firstWindow();

  await expect(window.getByText('¿Primer uso? Configura tu primer proyecto.')).toBeVisible();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Demo');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();
  await expect(window.getByText('Proyecto: Cliente Demo')).toBeVisible();
});
