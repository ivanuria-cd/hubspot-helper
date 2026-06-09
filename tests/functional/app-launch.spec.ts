import { resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';

let app: ElectronApplication;

test.afterAll(async () => {
  await app?.close();
});

test('la app arranca y la ventana principal es visible', async () => {
  app = await electron.launch({ args: [resolve('out/main/index.js')] });

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
