import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.beforeEach(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-newform-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`],
  });
});

test.afterEach(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

// Flujo sin portal: definir un origen y una entrada de propiedad mapeada a ese origen
// (CRM/Propiedades), luego usar el asistente «+ Formulario» para preseleccionar el campo
// del origen y generar un cambio pendiente create_form.
//
// Requiere la pantalla de Propiedades de SPEC-0006 para crear origen + entrada (la
// preselección del asistente se nutre de esas entradas). Mientras el rediseño §16 de
// SPEC-0006 esté en BORRADOR, este flujo se deja preparado (`fixme`) y se ejecuta cuando
// la pantalla de Propiedades esté estable en el build.
test.fixme('asistente «+ Formulario»: preselecciona campos del origen y genera create_form', async () => {
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente Formularios');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  // 1) Crear un origen desde Propiedades.
  await window.getByRole('button', { name: 'Propiedades' }).click();
  await expect(window.getByText('CRM / Propiedades')).toBeVisible();
  await window.getByRole('button', { name: /Orígenes/ }).click();
  const originsModal = window.getByRole('dialog');
  await originsModal.getByLabel('Nombre').fill('Salesforce');
  await originsModal.getByRole('button', { name: 'Añadir origen' }).click();
  await originsModal.getByRole('button', { name: 'Cerrar' }).click();

  // 2) Crear una entrada de propiedad «nueva» mapeada al origen.
  // exact: true para no colisionar con el ítem de sidebar «Propiedades».
  await window.getByRole('button', { name: 'Propiedad', exact: true }).click();
  // (El asistente de entrada permite definir nombre, propiedad destino y orígenes.)
  // Los selectores concretos dependen del EntryWizard de SPEC-0006.

  // 3) Ir a Formularios y abrir el asistente.
  await window.getByRole('button', { name: 'Formularios' }).click();
  await expect(window.getByText('CRM / Formularios')).toBeVisible();
  // exact: true para no colisionar con el ítem de sidebar «Formularios».
  await window.getByRole('button', { name: 'Formulario', exact: true }).click();
  const wizard = window.getByRole('dialog');
  await wizard.getByLabel('Nombre del formulario').fill('Alta de contacto');

  // Al elegir objeto + origen, los campos del origen se preseleccionan y «Crear» se habilita.
  await expect(wizard.getByText('Salesforce')).toBeVisible();

  await wizard.getByRole('button', { name: 'Crear' }).click();

  // El cambio aparece en la vista de cambios pendientes.
  await window.getByRole('button', { name: /Cambios pendientes/ }).click();
  await expect(window.getByText('Formularios / Cambios pendientes')).toBeVisible();
  await expect(window.getByText(/Crear formulario/)).toBeVisible();
});
