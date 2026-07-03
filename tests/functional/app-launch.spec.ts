import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;
let userDataDir: string;

test.afterAll(async () => {
  await app?.close();
  await rm(userDataDir, { recursive: true, force: true });
});

test('la app arranca y la ventana principal es visible', async () => {
  // Informe 2026-07-02 §10.7: userData aislado (no depender del perfil del desarrollador)
  // y §10.2: idioma forzado (los asserts en castellano no dependen del locale del SO).
  userDataDir = await mkdtemp(join(tmpdir(), 'revops-launch-'));
  app = await electron.launch({
    args: [resolve('out/main/index.js'), `--user-data-dir=${userDataDir}`, '--lang=es'],
  });

  const window = await app.firstWindow();
  await expect(window).toHaveTitle('RevOps Assistant');

  // La ventana se muestra en 'ready-to-show'; se espera a que sea visible
  // en lugar de comprobarlo de inmediato (evita la carrera con el arranque del renderer).
  await expect
    .poll(
      () =>
        app.evaluate(({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows()[0];
          return Boolean(win && win.isVisible());
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
});
