# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.e2e.spec.ts >> supports owner onboarding, palette persistence, and admin company visibility
- Location: e2e/app.e2e.spec.ts:28:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Sign out' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - list [ref=e8]:
      - listitem [ref=e9]:
        - button "V Vimcore ERP Admin workspace" [ref=e10]:
          - generic [ref=e11]: V
          - generic [ref=e12]:
            - generic [ref=e13]: Vimcore ERP
            - generic [ref=e14]: Admin workspace
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]: Workspace
        - list [ref=e19]:
          - listitem [ref=e20]:
            - link "Inicio" [ref=e21] [cursor=pointer]:
              - /url: /dashboard
          - listitem [ref=e28]:
            - link "Sales" [ref=e29] [cursor=pointer]:
              - /url: /dashboard#sales
          - listitem [ref=e34]:
            - link "Compras" [ref=e35] [cursor=pointer]:
              - /url: /dashboard#purchases
          - listitem [ref=e41]:
            - link "Inventory" [ref=e42] [cursor=pointer]:
              - /url: /dashboard#inventory
          - listitem [ref=e48]:
            - link "Produccion" [ref=e49] [cursor=pointer]:
              - /url: /dashboard#production
          - listitem [ref=e61]:
            - link "Finanzas" [ref=e62] [cursor=pointer]:
              - /url: /dashboard#finance
          - listitem [ref=e67]:
            - link "Proyectos" [ref=e68] [cursor=pointer]:
              - /url: /dashboard#projects
      - generic [ref=e73]:
        - generic [ref=e74]: Account
        - list [ref=e76]:
          - listitem [ref=e77]:
            - link "Notificaciones" [ref=e78] [cursor=pointer]:
              - /url: /dashboard#notifications
          - listitem [ref=e83]:
            - link "Perfil" [ref=e84] [cursor=pointer]:
              - /url: /dashboard/settings/profile
          - listitem [ref=e90]:
            - link "Configuracion" [ref=e91] [cursor=pointer]:
              - /url: /dashboard/settings/theme
    - button "Toggle Sidebar" [ref=e96]
  - main [ref=e97]:
    - generic [ref=e98]:
      - generic [ref=e99]:
        - button "Toggle Sidebar" [ref=e100]
        - navigation "breadcrumb" [ref=e102]:
          - list [ref=e103]:
            - listitem [ref=e104]: Empresa
            - listitem [ref=e105]
            - listitem [ref=e108]:
              - link "Dashboard" [disabled] [ref=e109]
      - button "Notificaciones" [ref=e110]
    - generic [ref=e112]:
      - generic [ref=e113]:
        - generic [ref=e114]:
          - paragraph [ref=e115]: Vista general
          - heading "ERP dashboard" [level=1] [ref=e116]
          - paragraph [ref=e117]: Resumen operativo de tu empresa y actividad reciente.
        - generic [ref=e118]: owner@vimcore.test
      - generic [ref=e119]:
        - generic [ref=e120]:
          - generic [ref=e121]: Company modules
          - generic [ref=e122]: Pick a module from the sidebar to continue your ERP setup.
        - generic [ref=e123]:
          - link "Open CRM module" [ref=e124] [cursor=pointer]:
            - /url: "#crm"
            - generic [ref=e129]: CRM
          - link "Open Sales module" [ref=e130] [cursor=pointer]:
            - /url: "#sales"
            - generic [ref=e135]: Sales
          - link "Open Inventory module" [ref=e136] [cursor=pointer]:
            - /url: "#inventory"
            - generic [ref=e141]: Inventory
      - generic [ref=e142]:
        - generic [ref=e143]:
          - generic [ref=e144]: Preferencias de apariencia
          - generic [ref=e145]: Configuracion visual guardada por usuario.
        - generic [ref=e146]:
          - combobox "Palette preference" [ref=e147]:
            - option "ocean"
            - option "forest" [selected]
            - option "violet"
            - option "sunset"
            - option "midnight"
          - button "Save palette" [active] [ref=e148]
```

# Test source

```ts
  1  | import { execFileSync } from 'node:child_process';
  2  | 
  3  | import { devices, expect, test } from '@playwright/test';
  4  | 
  5  | const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';
  6  | 
  7  | const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  8  | 
  9  | const resetAndSeedOwner = () => {
  10 |   execFileSync(
  11 |     pnpmCommand,
  12 |     ['--filter', 'api', 'exec', 'tsx', 'src/testing/e2e-state.ts', 'reset-and-seed-owner'],
  13 |     {
  14 |       cwd: process.cwd(),
  15 |       env: {
  16 |         ...process.env,
  17 |         DATABASE_URL: databaseUrl,
  18 |       },
  19 |       stdio: 'inherit',
  20 |     },
  21 |   );
  22 | };
  23 | 
  24 | test.beforeEach(() => {
  25 |   resetAndSeedOwner();
  26 | });
  27 | 
  28 | test('supports owner onboarding, palette persistence, and admin company visibility', async ({ page }) => {
  29 |   await page.goto('/dashboard');
  30 | 
  31 |   await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  32 | 
  33 |   await page.getByLabel('Correo o usuario').fill('owner');
  34 |   await page.getByRole('textbox', { name: 'Contraseña' }).fill('secret123');
  35 |   await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  36 | 
  37 |   await expect(page.getByRole('heading', { name: 'Company onboarding' })).toBeVisible();
  38 | 
  39 |   await page.getByLabel('Company name').fill('Vimcore Labs');
  40 |   await page.getByRole('button', { name: 'Continue' }).click();
  41 |   await page.getByLabel('Legal or tax identifier').fill('RFC-123456');
  42 |   await page.getByRole('button', { name: 'Continue' }).click();
  43 |   await page.getByLabel('Services').fill('Implementation, Support');
  44 |   await page.getByRole('button', { name: 'Continue' }).click();
  45 |   await page.getByLabel('Country').fill('Mexico');
  46 |   await page.getByLabel('City').fill('Monterrey');
  47 |   await page.getByLabel('Exact location').fill('San Pedro 123');
  48 |   await page.getByRole('button', { name: 'Continue' }).click();
  49 |   await page.getByLabel('Contact phone').fill('+52 81 5555 0000');
  50 |   await page.getByLabel('Contact email').fill('ops@vimcore.test');
  51 |   await page.getByLabel('Palette').selectOption('ocean');
  52 |   await page.getByRole('button', { name: 'Create company' }).click();
  53 | 
  54 |   await expect(page.getByRole('heading', { name: 'ERP dashboard' })).toBeVisible();
  55 |   await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean');
  56 | 
  57 |   await page.getByLabel('Palette preference').selectOption('forest');
  58 |   await page.getByRole('button', { name: 'Save palette' }).click();
  59 |   await expect(page.locator('html')).toHaveAttribute('data-palette', 'forest');
  60 | 
> 61 |   await page.getByRole('button', { name: 'Sign out' }).click();
     |                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
  62 |   await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  63 | 
  64 |   await page.getByLabel('Correo o usuario').fill('admin');
  65 |   await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin');
  66 |   await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  67 | 
  68 |   await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
  69 |   await expect(page.getByText('Vimcore Labs registered')).toBeVisible();
  70 | });
  71 | 
  72 | test('blocks mobile browsers with desktop guidance', async ({ browser }) => {
  73 |   const context = await browser.newContext({
  74 |     ...devices['iPhone 13'],
  75 |     baseURL: 'http://127.0.0.1:4173',
  76 |   });
  77 |   const page = await context.newPage();
  78 | 
  79 |   await page.goto('/dashboard');
  80 | 
  81 |   await expect(page.getByRole('heading', { name: 'Desktop browser required' })).toBeVisible();
  82 |   await expect(
  83 |     page.getByText('Please continue from a desktop or laptop browser to use Vimcore ERP.'),
  84 |   ).toBeVisible();
  85 | 
  86 |   await context.close();
  87 | });
  88 | 
```