# Proposal: vimcore/erp Bootstrap Monorepo

## Intent

Create the first slice of `vimcore/erp`: a tested pnpm/Turbo monorepo for desktop ERP SaaS registration, company onboarding, and authenticated dashboard access. This is bootstrap plus access/onboarding, not full ERP implementation.

## Scope

### In Scope
- pnpm/Turbo workspace, TypeScript, lint/format/typecheck, Vitest, Playwright, Docker PostgreSQL, CI/security scans.
- React `apps/web` and Express 5/Drizzle/Zod `apps/api`, both feature-first clean architecture.
- Email/password auth, tokens/sessions, bootstrap admin `admin/admin`, RBAC for platform admin and company users.
- Multi-step onboarding: company info, legal/tax ID, services, address, contact, palette, structural locales/branches.
- Dashboard shell: sidebar modules, summary cards, new-company notifications, observability/metrics/errors.
- Desktop-only page for mobile/tablet users.

### Out of Scope
- ERP module behavior for CRM, Sales, Inventory, Finance, HR, etc.
- Social login, dark/light toggle unless required by a selected palette.
- Detailed locale/branch workflows beyond data shape.

## Capabilities

### New Capabilities
- `monorepo-foundation`: workspace, tooling, Docker, CI, security, TDD.
- `identity-access`: login, credentials, protected routes/endpoints, RBAC.
- `company-onboarding`: registration, legal/tax, services, address, contact, palette, locales.
- `dashboard-shell`: ERP shell, notifications, cards, module placeholders, operational signals.
- `desktop-access-theme`: desktop-only enforcement and palette-based visual theming.

### Modified Capabilities
- None.

## Approach

Use monorepo-first Turbo orchestration. Establish tests before features, then build vertical slices: React feature folders and Express controllers → Zod → use cases → repository ports → Drizzle.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| root config, `.github/` | New | Workspace, tasks, CI/security gates |
| `apps/web` | New | Auth/onboarding/dashboard UI |
| `apps/api` | New | Auth/RBAC/company API |
| `packages/*` | New | Shared config/types only when reused |
| `docker-compose.yml`, `drizzle/` | New | PostgreSQL and migrations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope expands into full ERP | High | Keep modules as navigation placeholders |
| Locale rules unclear | Med | Model structure only; defer behavior |
| Bootstrap admin leaks | Med | Seed-only, document removal/rotation |
| Test gates unavailable initially | Med | Install runners first, then enable strict TDD config |

## Rollback Plan

Before production data exists, revert files and drop Docker volumes. Later, roll back migrations, disable seeded admin, and restore CI/config.

## Dependencies

- Node/pnpm, Docker, PostgreSQL, Express 5, Drizzle, Zod, React/Vite, Vitest, Playwright.
- Palette references and final locale rules.

## Success Criteria

- [ ] Install, typecheck, lint, tests, build, Playwright, and CI/security checks pass.
- [ ] User can register/login, onboard a company, choose a palette, and reach the dashboard shell.
- [ ] Admin sees new-company notifications and operational summary signals.
- [ ] Mobile/tablet access shows desktop-only page.
