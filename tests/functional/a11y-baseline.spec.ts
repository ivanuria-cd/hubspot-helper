import { resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

let app: ElectronApplication;

test.afterAll(async () => {
  await app?.close();
});

test('axe-core no reporta violaciones WCAG 2.1 AA en la ventana principal', async () => {
  app = await electron.launch({ args: [resolve('out/main/index.js')] });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const results = await new AxeBuilder({ page: window })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
