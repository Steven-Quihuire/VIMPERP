import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const executablePath = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addCookies([
  { name: 'vimcore_session', value: 'repro-session-token-002', domain: '127.0.0.1', path: '/' },
]);
const page = await context.newPage();
page.on('request', (req) => { if (req.method() === 'POST') console.log('[POST]', req.url()); });

await page.goto('http://127.0.0.1:5173/dashboard/hr/employees', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Agregar empleado' }).click();
await page.waitForTimeout(500);
await page.getByLabel('Nombre completo').fill('Repro Test Person');
await page.getByRole('button', { name: 'Siguiente' }).click();
await page.waitForTimeout(400);

// Force EVERY button (existing and future) inside the form to type=button via MutationObserver
await page.evaluate(() => {
  const form = document.querySelector('form');
  const force = () => form?.querySelectorAll('button').forEach((b) => b.setAttribute('type', 'button'));
  force();
  const mo = new MutationObserver(force);
  mo.observe(form, { childList: true, subtree: true });
  (window as any).__mo = mo;
});

await page.getByRole('button', { name: 'Siguiente' }).click();
await page.waitForTimeout(1500);
const t = await page.locator('body').innerText();
console.log('Badge:', t.match(/Paso (\d) de 3/)?.[1], 'Created:', t.includes('Empleado creado'), 'Step3:', t.includes('Asignación inicial'));
await browser.close();
