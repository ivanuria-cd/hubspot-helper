import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-export-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

async function openProperties(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Export');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByRole('heading', { name: 'CRM / Propiedades' })).toBeVisible();
}

// Flujo local de exportación JSON (SPEC-0006): sin orígenes el botón está
// deshabilitado; al crear un origen se habilita y el menú lista los orígenes
// exportables. La descarga real (click en el menuitem) genera un blob y pasa por
// el gestor de descargas de Electron: la verificación del fichero descargado
// requiere validación en máquina y queda fuera de este spec.
test('exportar JSON: se habilita al crear un origen y lista los orígenes', async () => {
  const window = await app.firstWindow();
  await openProperties(window);

  const exportButton = window.getByRole('button', { name: 'Exportar JSON' });
  await expect(exportButton).toBeDisabled();

  // Crear un origen local desde el modal de orígenes.
  await window.getByRole('button', { name: /Orígenes \(0\)/ }).click();
  const modal = window.getByRole('dialog');
  await expect(modal.getByText('Gestionar orígenes')).toBeVisible();
  // exact: el campo «Nombre» convive con el botón de ayuda (FieldTooltip) cuyo
  // aria-label empieza por «Nombre…» (strict mode violation sin exact).
  await modal.getByLabel('Nombre', { exact: true }).fill('Migración CSV');
  await modal.getByRole('button', { name: 'Añadir origen' }).click();
  await expect(modal.getByText('Migración CSV')).toBeVisible();
  await modal.getByRole('button', { name: 'Cerrar' }).click();

  // Con un origen, el botón se habilita y su menú lista el origen exportable.
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  const menu = window.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Migración CSV' })).toBeVisible();

  // Cerrar el menú sin exportar (la descarga se valida en máquina).
  await window.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});
