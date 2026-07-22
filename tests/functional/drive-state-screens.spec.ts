import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

// SPEC-0002 §32: al montar, cada pantalla de feature llama a su `*DriveMeta` vía `useDriveDoc.fetchMeta`.
// Este smoke ejercita end-to-end los tres handlers refactorizados (registerDriveStateIpc) y la cabecera
// compartida `FeatureScreenHeader` (§31). Sin Drive/HubSpot conectados: `*DriveMeta` devuelve
// `{ fileId: null, configured: false }` y la pantalla debe montar sin error.

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-drive-state-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('las pantallas de las tres features montan y muestran su cabecera', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Drive State');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  // Propiedades → propertiesDriveMeta.
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();

  // Objetos custom → customObjectsDriveMeta.
  await window.getByRole('button', { name: 'Objetos custom' }).click();
  await expect(window.getByText('CRM / Objetos custom')).toBeVisible();

  // Formularios → formsDriveMeta.
  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();
});
