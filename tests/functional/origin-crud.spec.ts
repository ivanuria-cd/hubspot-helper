import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-origins-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

async function openProperties(window: Awaited<ReturnType<ElectronApplication['firstWindow']>>) {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Propiedades');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();
}

test('crear, ver y eliminar un origen de datos', async () => {
  const window = await app.firstWindow();
  await openProperties(window);

  // Abrir el modal de orígenes (empieza en 0).
  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const modal = window.getByRole('dialog');
  await expect(modal.getByText('Gestionar orígenes')).toBeVisible();

  // Crear un origen.
  await modal.getByLabel('Nombre').fill('Migración Salesforce Q1');
  await modal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(modal.getByText('Migración Salesforce Q1')).toBeVisible();

  // Cerrar y comprobar que el contador del botón refleja el nuevo origen.
  await modal.getByRole('button', { name: 'Cerrar' }).click();
  await expect(window.getByRole('button', { name: /Orígenes \(1\)/ })).toBeVisible();

  // Eliminar el origen.
  await window.getByRole('button', { name: /Orígenes \(1\)/ }).click();
  await window.getByRole('dialog').getByLabel('Eliminar').click();
  // El borrado pide confirmación (ConfirmDialog, SPEC-0006 §23).
  await window.getByRole('button', { name: 'Aceptar' }).click();
  await expect(window.getByRole('dialog').getByText('No hay orígenes definidos.')).toBeVisible();
});
