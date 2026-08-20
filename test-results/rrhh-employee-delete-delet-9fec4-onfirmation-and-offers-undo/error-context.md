# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rrhh-employee-delete.spec.ts >> deletes an employee from the detail view with confirmation and offers undo
- Location: e2e/rrhh-employee-delete.spec.ts:33:5

# Error details

```
Error: Command failed: pnpm --filter api exec tsx src/testing/e2e-state.ts seed-rrhh-foundation
```

# Test source

```ts
  1   | import { execFileSync } from 'node:child_process';
  2   | 
  3   | import { expect, test } from '@playwright/test';
  4   | 
  5   | const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore_e2e';
  6   | const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  7   | 
  8   | const runtime = {
  9   |   companyId: 'runtime-active-scope-company',
  10  |   ownerUsername: 'scope-owner',
  11  |   ownerPassword: 'secret123',
  12  | };
  13  | 
  14  | const seedRrhhFoundation = () => {
> 15  |   execFileSync(
      |               ^ Error: Command failed: pnpm --filter api exec tsx src/testing/e2e-state.ts seed-rrhh-foundation
  16  |     pnpmCommand,
  17  |     ['--filter', 'api', 'exec', 'tsx', 'src/testing/e2e-state.ts', 'seed-rrhh-foundation'],
  18  |     {
  19  |       cwd: process.cwd(),
  20  |       env: {
  21  |         ...process.env,
  22  |         DATABASE_URL: databaseUrl,
  23  |       },
  24  |       stdio: 'inherit',
  25  |     },
  26  |   );
  27  | };
  28  | 
  29  | test.beforeEach(() => {
  30  |   seedRrhhFoundation();
  31  | });
  32  | 
  33  | test('deletes an employee from the detail view with confirmation and offers undo', async ({
  34  |   page,
  35  | }) => {
  36  |   await page.goto('/dashboard');
  37  | 
  38  |   await page.getByLabel('Correo o usuario').fill(runtime.ownerUsername);
  39  |   await page.getByRole('textbox', { name: 'Contraseña' }).fill(runtime.ownerPassword);
  40  |   await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  41  |   await expect(page).toHaveURL(/\/dashboard/);
  42  | 
  43  |   await page.goto('/dashboard/hr/employees');
  44  |   await expect(page.getByRole('heading', { name: 'HR employees' })).toBeVisible();
  45  | 
  46  |   const createEmployeeButton = page.getByRole('button', {
  47  |     name: 'Create employee record',
  48  |   });
  49  | 
  50  |   const createResponsePromise = page.waitForResponse(
  51  |     (response) =>
  52  |       response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
  53  |       response.request().method() === 'POST',
  54  |   );
  55  |   await page.getByLabel('Full name').fill('Empleado a Eliminar');
  56  |   await createEmployeeButton.click();
  57  |   const createdEmployee = (await (await createResponsePromise).json()) as {
  58  |     id: string;
  59  |   };
  60  |   const employeeId = createdEmployee.id;
  61  | 
  62  |   const openButton = page.getByRole('button', {
  63  |     name: `Open employee ${employeeId}`,
  64  |   });
  65  |   await expect(openButton).toBeVisible();
  66  |   await openButton.click();
  67  | 
  68  |   await expect(page.getByRole('heading', { name: 'Detalles del empleado' })).toBeVisible();
  69  | 
  70  |   // Abrir el diálogo de confirmación.
  71  |   await page.getByRole('button', { name: 'Eliminar empleado' }).click();
  72  |   const confirmDialog = page.getByRole('alertdialog');
  73  |   await expect(confirmDialog).toBeVisible();
  74  |   await expect(
  75  |     confirmDialog.getByText('¿Eliminar este empleado?'),
  76  |   ).toBeVisible();
  77  | 
  78  |   const deleteResponsePromise = page.waitForResponse(
  79  |     (response) =>
  80  |       response
  81  |         .url()
  82  |         .endsWith(`/companies/${runtime.companyId}/hr-employees/${employeeId}`) &&
  83  |       response.request().method() === 'DELETE',
  84  |   );
  85  |   await confirmDialog.getByRole('button', { name: 'Eliminar' }).click();
  86  |   await deleteResponsePromise;
  87  | 
  88  |   // Vuelve a la lista y muestra el toast con deshacer.
  89  |   await expect(page.getByRole('heading', { name: 'Empleados' })).toBeVisible();
  90  |   await expect(
  91  |     page.getByRole('button', { name: `Open employee ${employeeId}` }),
  92  |   ).toHaveCount(0);
  93  |   const toast = page.getByText('Empleado eliminado');
  94  |   await expect(toast).toBeVisible();
  95  | 
  96  |   // Deshacer: el empleado vuelve a aparecer en la lista (con un nuevo id).
  97  |   const undoCreatePromise = page.waitForResponse(
  98  |     (response) =>
  99  |       response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
  100 |       response.request().method() === 'POST',
  101 |   );
  102 |   await page.getByRole('button', { name: 'Deshacer' }).click();
  103 |   await undoCreatePromise;
  104 |   await expect(page.getByText('Empleado a Eliminar')).toBeVisible();
  105 | });
  106 | 
```