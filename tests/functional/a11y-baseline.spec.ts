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
import { source as axeSource } from 'axe-core';

let app: ElectronApplication;
let userDataDir: string | null = null;

interface AxeResult {
  violations: unknown[];
}

test.afterEach(async () => {
  await app?.close();
  if (userDataDir) {
    await rm(userDataDir, { recursive: true, force: true });
    userDataDir = null;
  }
});

// axe se inyecta y ejecuta dentro de la ventana (window.eval) en lugar de usar
// AxeBuilder: Electron no soporta Target.createTarget, que AxeBuilder necesita
// para recorrer iframes. La inyección directa funciona sin crear targets nuevos.
async function runAxe(window: Page): Promise<AxeResult> {
  await window.evaluate((src) => {
    // `globalThis` es el `window` del renderer dentro de evaluate (el identificador
    // `window` quedaría sombreado por la Page de Playwright para TypeScript).
    const w = globalThis as unknown as { axe?: unknown; eval: (code: string) => void };
    if (!w.axe) {
      // eslint-disable-next-line no-eval
      w.eval(src);
    }
  }, axeSource);

  return (await window.evaluate(async () => {
    const runner = (globalThis as unknown as {
      axe: { run: (ctx: Document, opts: unknown) => Promise<AxeResult> };
    }).axe;
    return runner.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
  })) as AxeResult;
}

test('axe-core no reporta violaciones WCAG 2.1 AA en la ventana principal', async () => {
  // Informe 2026-07-02 §10.7: userData aislado y §10.2: idioma forzado.
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-a11y-main-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const results = await runAxe(window);
  expect(results.violations).toEqual([]);
});

// Baseline de las pantallas de proyecto: se crea un proyecto y se navega con el
// menú lateral a cada pantalla antes de escanear. Todo el flujo es local (sin
// portal HubSpot ni Drive conectados): se escanea el estado inicial de cada vista.
test('axe-core no reporta violaciones WCAG 2.1 AA en las pantallas del proyecto', async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-a11y-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Nombre del proyecto').fill('Cliente A11y');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(window.getByLabel('Menú de capacidades')).toBeVisible();

  const sidebar = window.getByLabel('Menú de capacidades');
  const screens: Array<{ nav: string; heading: string }> = [
    { nav: 'Dashboard', heading: 'Dashboard' },
    { nav: 'CRM', heading: 'CRM' },
    { nav: 'Propiedades', heading: 'CRM / Propiedades' },
    { nav: 'Objetos custom', heading: 'CRM / Objetos custom' },
    { nav: 'Formularios', heading: 'CRM / Formularios' },
  ];

  for (const screen of screens) {
    await sidebar.getByRole('button', { name: screen.nav, exact: true }).click();
    await expect(
      window.getByRole('heading', { level: 1, name: screen.heading }),
    ).toBeVisible();

    const results = await runAxe(window);
    expect(results.violations, `violaciones axe en «${screen.nav}»`).toEqual([]);
  }
});
