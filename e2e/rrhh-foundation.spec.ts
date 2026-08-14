import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore_e2e';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const runtime = {
  companyId: 'runtime-active-scope-company',
  ownerUsername: 'scope-owner',
  ownerPassword: 'secret123',
  companyScopeNodeId: 'company:runtime-active-scope-company',
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

test('supports the RRHH happy path from position setup to ERP invite acceptance and manager resolution', async ({
  page,
  browser,
}) => {
  await page.goto('/dashboard');

  await page.getByLabel('Correo o usuario').fill(runtime.ownerUsername);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(runtime.ownerPassword);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/dashboard/hr/positions');

  await expect(page.getByRole('heading', { name: 'HR positions' })).toBeVisible();
  const createPositionButton = page.getByRole('button', { name: 'Create position' });

  const createLeadPositionResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/companies/${runtime.companyId}/hr-employees/positions`) &&
    response.request().method() === 'POST',
  );
  await page.getByLabel('Position name').fill('People Lead');
  await page.getByLabel('Headcount').fill('1');
  await createPositionButton.click();
  const leadPosition = (await (await createLeadPositionResponsePromise).json()) as {
    id: string;
  };
  await expect(createPositionButton).toBeEnabled();
  await expect(page.getByLabel('Position name')).toHaveValue('');

  const createAnalystPositionResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/companies/${runtime.companyId}/hr-employees/positions`) &&
    response.request().method() === 'POST',
  );
  await page.getByLabel('Position name').fill('HR Analyst');
  await page.getByLabel('Reports to position').fill(leadPosition.id);
  await page.getByLabel('Headcount').fill('1');
  await createPositionButton.click();
  const analystPosition = (await (await createAnalystPositionResponsePromise).json()) as {
    id: string;
  };

  await page.goto('/dashboard/hr/employees');
  await expect(page.getByRole('heading', { name: 'HR employees' })).toBeVisible();
  const createEmployeeButton = page.getByRole('button', { name: 'Create employee record' });

  const createLeadEmployeeResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
    response.request().method() === 'POST',
  );
  await page.getByLabel('Full name').fill('People Lead Employee');
  await createEmployeeButton.click();
  const leadEmployee = (await (await createLeadEmployeeResponsePromise).json()) as {
    id: string;
  };
  await expect(createEmployeeButton).toBeEnabled();

  const createAnalystEmployeeResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/companies/${runtime.companyId}/hr-employees`) &&
    response.request().method() === 'POST',
  );
  await page.getByLabel('Full name').fill('HR Analyst Employee');
  await createEmployeeButton.click();
  const analystEmployee = (await (await createAnalystEmployeeResponsePromise).json()) as {
    id: string;
  };

  await expect(
    page.getByRole('button', { name: `Open employee ${leadEmployee.id}` }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Open employee ${analystEmployee.id}` }),
  ).toBeVisible();

  await page.getByRole('button', { name: `Open employee ${leadEmployee.id}` }).click();
  const createAssignmentButton = page.getByRole('button', { name: 'Create assignment' });
  const createLeadAssignmentResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(
      `/companies/${runtime.companyId}/hr-employees/${leadEmployee.id}/assignments`,
    ) && response.request().method() === 'POST',
  );
  await page.getByLabel('Scope node').fill(runtime.companyScopeNodeId);
  await page.getByLabel('Position').fill(leadPosition.id);
  await page.getByLabel('Start date').fill('2026-08-13T12:30');
  await createAssignmentButton.click();
  await createLeadAssignmentResponsePromise;
  await expect(createAssignmentButton).toBeEnabled();

  await page.getByRole('button', { name: `Open employee ${analystEmployee.id}` }).click();
  const createAnalystAssignmentResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(
      `/companies/${runtime.companyId}/hr-employees/${analystEmployee.id}/assignments`,
    ) && response.request().method() === 'POST',
  );
  await page.getByLabel('Scope node').fill(runtime.companyScopeNodeId);
  await page.getByLabel('Position').fill(analystPosition.id);
  await page.getByLabel('Start date').fill('2026-08-13T12:45');
  await createAssignmentButton.click();
  await createAnalystAssignmentResponsePromise;

  await expect(page.getByText(leadEmployee.id)).toBeVisible();

  await page.goto('/dashboard/hr/erp-access');
  await expect(page.getByRole('heading', { name: 'ERP access invitations' })).toBeVisible();

  await page.getByLabel('Employee id').fill(analystEmployee.id);
  await page.getByLabel('Invitee email').fill('invitee@vimcore.test');
  const invitationResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/companies/${runtime.companyId}/hr-erp-access/invitations`) &&
    response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Invite ERP access' }).click();
  const invitationResponse = await invitationResponsePromise;
  const invitationBody = (await invitationResponse.json()) as { invitationToken: string };

  const inviteeContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto(`/hr-erp-access/accept/${invitationBody.invitationToken}`);
  await inviteePage.getByLabel('Password', { exact: true }).fill('secret123');
  await inviteePage.getByLabel('Confirm password').fill('secret123');
  await inviteePage.getByRole('button', { name: 'Activate ERP access' }).click();
  await expect(inviteePage).toHaveURL(/\/dashboard/);
  await inviteeContext.close();

  await page.goto('/dashboard/hr/employees');
  await page.getByRole('button', { name: `Open employee ${analystEmployee.id}` }).click();
  await expect(page.getByText('Current manager')).toBeVisible();
  await expect(page.getByText(`Manager · ${leadEmployee.id}`)).toBeVisible();
});
