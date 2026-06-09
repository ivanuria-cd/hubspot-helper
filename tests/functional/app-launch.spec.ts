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

  const isVisible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return Boolean(win && win.isVisible());
  });
  expect(isVisible).toBe(true);
});
