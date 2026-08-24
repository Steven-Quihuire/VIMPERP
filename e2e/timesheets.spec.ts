import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5433/vimcore_e2e';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const runtime = {
  companyId: 'runtime-active-scope-company',
  ownerUsername: 'scope-owner',
  ownerPassword: 'secret123',
};

const seedRrhhFoundation = () => {
  execFileSync(
    pnpmCommand,
    ['--filter', 'api', 'exec', 'tsx', 'src/testing/e2e-state.ts', 'seed-rrhh-foundation'],
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
  seedRrhhFoundation();
});

test('authorized user opens timesheets list', async ({
  page,
}) => {
  await page.goto('/dashboard/hr/timesheets');

  await page.getByLabel('Correo o usuario').fill(runtime.ownerUsername);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(runtime.ownerPassword);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: /Bienvenido a Runtime Scope Co/i })).toBeVisible();
  await page.goto('/dashboard/hr/timesheets');

  await expect(page.getByRole('heading', { name: 'Registro de horas' })).toBeVisible();
  await expect(page.getByText('No hay períodos para el filtro seleccionado.')).toBeVisible();

});
