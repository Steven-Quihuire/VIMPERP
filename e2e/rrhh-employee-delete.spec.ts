import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore_e2e';
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

test('deletes an employee from the detail view with confirmation and offers undo', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await page.getByLabel('Correo o usuario').fill(runtime.ownerUsername);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(runtime.ownerPassword);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/dashboard/hr/employees');
  await expect(page.getByRole('heading', { name: 'HR employees' })).toBeVisible();

  const createEmployeeButton = page.getByRole('button', {
    name: 'Create employee record',
  });

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
      response.request().method() === 'POST',
  );
  await page.getByLabel('Full name').fill('Empleado a Eliminar');
  await createEmployeeButton.click();
  const createdEmployee = (await (await createResponsePromise).json()) as {
    id: string;
  };
  const employeeId = createdEmployee.id;

  const openButton = page.getByRole('button', {
    name: `Open employee ${employeeId}`,
  });
  await expect(openButton).toBeVisible();
  await openButton.click();

  await expect(page.getByRole('heading', { name: 'Detalles del empleado' })).toBeVisible();

  // Abrir el diálogo de confirmación.
  await page.getByRole('button', { name: 'Eliminar empleado' }).click();
  const confirmDialog = page.getByRole('alertdialog');
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByText('¿Eliminar este empleado?'),
  ).toBeVisible();

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .endsWith(`/companies/${runtime.companyId}/hr-employees/${employeeId}`) &&
      response.request().method() === 'DELETE',
  );
  await confirmDialog.getByRole('button', { name: 'Eliminar' }).click();
  await deleteResponsePromise;

  // Vuelve a la lista y muestra el toast con deshacer.
  await expect(page.getByRole('heading', { name: 'Empleados' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Open employee ${employeeId}` }),
  ).toHaveCount(0);
  const toast = page.getByText('Empleado eliminado');
  await expect(toast).toBeVisible();

  // Deshacer: el empleado vuelve a aparecer en la lista (con un nuevo id).
  const undoCreatePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await undoCreatePromise;
  await expect(page.getByText('Empleado a Eliminar')).toBeVisible();
});
