import { resolve } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { source as axeSource } from 'axe-core';

let app: ElectronApplication;

interface AxeResult {
  violations: unknown[];
}

test.afterAll(async () => {
  await app?.close();
});

// axe se inyecta y ejecuta dentro de la ventana (window.eval) en lugar de usar
// AxeBuilder: Electron no soporta Target.createTarget, que AxeBuilder necesita
// para recorrer iframes. La inyección directa funciona sin crear targets nuevos.
test('axe-core no reporta violaciones WCAG 2.1 AA en la ventana principal', async () => {
  app = await electron.launch({ args: [resolve('out/main/index.js')] });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.evaluate((src) => {
    // eslint-disable-next-line no-eval
    window.eval(src);
  }, axeSource);

  const results = (await window.evaluate(async () => {
    const runner = (window as unknown as {
      axe: { run: (ctx: Document, opts: unknown) => Promise<AxeResult> };
    }).axe;
    return runner.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
  })) as AxeResult;

  expect(results.violations).toEqual([]);
});
