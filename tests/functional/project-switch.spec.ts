import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

async function createProject(window: Page, name: string): Promise<void> {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill(name);
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByText(`Proyecto: ${name}`)).toBeVisible();
}

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-switch-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('se puede volver a la bienvenida y entrar en otro proyecto', async () => {
  const window = await app.firstWindow();

  await createProject(window, 'Cliente A');

  await window.getByRole('button', { name: 'Proyectos' }).click();
  await expect(window.getByText('Cliente A')).toBeVisible();

  await createProject(window, 'Cliente B');

  await window.getByRole('button', { name: 'Proyectos' }).click();
  await window.getByRole('button', { name: /Abrir proyecto Cliente A/ }).click();
  await expect(window.getByText('Proyecto: Cliente A')).toBeVisible();
});
