import { execFileSync } from 'node:child_process';

import { devices, expect, test } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const resetAndSeedOwner = () => {
  execFileSync(
    pnpmCommand,
    ['--filter', 'api', 'exec', 'tsx', 'src/testing/e2e-state.ts', 'reset-and-seed-owner'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'inherit',
    },
  );
};

test.beforeEach(() => {
  resetAndSeedOwner();
});

test('supports owner onboarding, palette persistence, and admin company visibility', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();

  await page.getByLabel('Correo o usuario').fill('owner');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('secret123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('heading', { name: 'Company onboarding' })).toBeVisible();

  await page.getByLabel('Company name').fill('Vimcore Labs');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Legal or tax identifier').fill('RFC-123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Services').fill('Implementation, Support');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Country').fill('Mexico');
  await page.getByLabel('City').fill('Monterrey');
  await page.getByLabel('Exact location').fill('San Pedro 123');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Contact phone').fill('+52 81 5555 0000');
  await page.getByLabel('Contact email').fill('ops@vimcore.test');
  await page.getByLabel('Palette').selectOption('ocean');
  await page.getByRole('button', { name: 'Create company' }).click();

  await expect(page.getByRole('heading', { name: 'ERP dashboard' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean');

  await page.getByLabel('Palette preference').selectOption('forest');
  await page.getByRole('button', { name: 'Save palette' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'forest');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();

  await page.getByLabel('Correo o usuario').fill('admin');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
  await expect(page.getByText('Vimcore Labs registered')).toBeVisible();
});

test('blocks mobile browsers with desktop guidance', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    baseURL: 'http://127.0.0.1:4173',
  });
  const page = await context.newPage();

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Desktop browser required' })).toBeVisible();
  await expect(
    page.getByText('Please continue from a desktop or laptop browser to use Vimcore ERP.'),
  ).toBeVisible();

  await context.close();
});
