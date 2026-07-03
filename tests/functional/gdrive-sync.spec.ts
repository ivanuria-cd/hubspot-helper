import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

// La sincronización real depende del flujo OAuth interactivo de Google, que no puede ejecutarse
// de forma desatendida en CI. La lógica de reconciliación y detección de conflictos está cubierta
// por los tests unitarios (sync.spec.ts). Aquí verificamos que los controles de sincronización
// están correctamente condicionados al estado de conexión.

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-gdrive-sync-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('la sincronización no está disponible hasta conectar la cuenta', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Sync');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await window.getByRole('button', { name: 'Configuración' }).click();
  await window.getByRole('button', { name: 'Google Drive' }).click();

  await expect(window.getByRole('button', { name: 'Conectar con Google' })).toBeVisible();
  await expect(window.getByRole('button', { name: 'Sincronizar' })).toHaveCount(0);
});
