import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const runtime = {
  companyId: 'runtime-active-scope-company',
  divisionId: 'runtime-active-scope-division',
  localId: 'runtime-active-scope-local',
  areaId: 'runtime-active-scope-area',
  warehouseId: 'runtime-active-scope-warehouse',
  pointOfSaleId: 'runtime-active-scope-pos',
  foreignCompanyId: 'runtime-active-scope-company-foreign',
  foreignAreaId: 'runtime-active-scope-area-foreign',
  foreignPointOfSaleId: 'runtime-active-scope-pos-foreign',
};

const seedActiveScopeHierarchy = () => {
  execFileSync(
    pnpmCommand,
    [
      '--filter',
      'api',
      'exec',
      'tsx',
      'src/testing/e2e-state.ts',
      'seed-active-scope-hierarchy',
    ],
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
  seedActiveScopeHierarchy();
});

test('switches across a realistic hierarchy and rejects unauthorized company and foreign POS switches', async ({ page, context, request }) => {
  await page.goto('/dashboard/items');

  await page.getByLabel('Correo o usuario').fill('scope-owner');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('secret123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.getByRole('link', { name: 'Items' }).click();
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByText('Local Only Item')).toBeVisible();
  await expect(page.getByText('Company Only Item')).not.toBeVisible();

  await page.getByLabel(/Cambiar alcance/i).click();
  await expect(page.getByRole('menuitem', { name: /Runtime Division/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Runtime Local/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Runtime Area/i })).toBeVisible();
  await page.getByRole('menuitem', { name: /Runtime Warehouse/i }).click();

  await expect(page.getByText('Company Only Item')).toBeVisible();
  await expect(page.getByText('Local Only Item')).not.toBeVisible();

  await page.getByLabel(/Cambiar alcance/i).click();
  await page.getByRole('menuitem', { name: /Runtime POS/i }).click();

  await expect(page.getByText('Company Only Item')).toBeVisible();
  await expect(page.getByText('Local Only Item')).not.toBeVisible();

  const cookies = await context.cookies('http://127.0.0.1:4173');
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

  const unauthorizedCompanyResponse = await request.post('http://127.0.0.1:3000/auth/me/active-scope', {
    headers: {
      cookie: cookieHeader,
    },
    data: {
      scope: { scopeType: 'company', scopeId: 'company-out-of-scope' },
    },
  });
  const unauthorizedForeignPosResponse = await request.post(
    'http://127.0.0.1:3000/auth/me/active-scope',
    {
      headers: {
        cookie: cookieHeader,
      },
      data: {
        scope: { scopeType: 'point-of-sale', scopeId: runtime.foreignPointOfSaleId },
      },
    },
  );

  expect(unauthorizedCompanyResponse.status()).toBe(403);
  expect(await unauthorizedCompanyResponse.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'Forbidden' },
  });

  expect(unauthorizedForeignPosResponse.status()).toBe(403);
  expect(await unauthorizedForeignPosResponse.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'Forbidden' },
  });
});
