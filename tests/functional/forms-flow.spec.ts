import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-formsflow-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

// El flujo completo (sincronizar → ver formulario con campos faltantes → «Añadir campos»
// → cambio pendiente → aplicar en sandbox → cobertura actualizada) requiere un portal de
// HubSpot conectado o un fixture de la Marketing Forms API. Sin portal no hay formularios
// que sincronizar, por lo que se deja preparado y se ejecuta en un entorno con portal/fixture.
test.fixme(
  'flujo de formularios: sincronizar, añadir campos faltantes y aplicar en sandbox',
  async () => {
    const window = await app.firstWindow();

    await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
    const dialog = window.getByRole('dialog');
    await dialog.getByLabel('Nombre del proyecto').fill('Cliente Flujo Forms');
    await dialog.getByRole('button', { name: 'Crear' }).click();

    await window.getByRole('button', { name: 'Formularios' }).click();
    await expect(window.getByText('CRM / Formularios')).toBeVisible();

    // Requiere portal/fixture: sincronizar trae formularios reales.
    await window.getByRole('button', { name: 'Sincronizar HubSpot' }).click();

    // Abrir un formulario con cobertura incompleta y añadir los campos que faltan.
    await window.getByText(/faltan/).first().click();
    await window.getByRole('button', { name: /Añadir campos que faltan/ }).click();

    // Aplicar el cambio pendiente en sandbox.
    await window.getByRole('button', { name: /Cambios pendientes/ }).click();
    await window.getByRole('button', { name: 'Aplicar en Sandbox' }).click();
    await expect(window.getByText('sandbox ✓')).toBeVisible();
  },
);
