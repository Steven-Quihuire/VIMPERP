# Tasks: vimcore/erp Bootstrap Monorepo

## Review Workload Forecast

~3000-4000 changed lines. 400-line risk: High. Chained PRs: Yes. Strategy: ask-on-risk.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units (feature-branch-chain; base `feature/erp-bootstrap`)

- **PR 1** (tracker) `pnpm -r test && typecheck && lint`; `docker compose up -d postgres`+`pnpm dev`; drop volume.
- **PR 2** (←PR 1) `pnpm --filter api test -- identity`+web `auth`; `docker compose up`+`curl :3000/auth/login`; drop users/sessions/memberships.
- **PR 3** (←PR 2) `pnpm --filter api test -- companies`+Playwright; `docker compose up`+Playwright; drop companies/branches.
- **PR 4** (←PR 3) `pnpm --filter api test -- admin`+Playwright admin+mobile; `docker compose up`+Playwright mobile; drop notifications/audit/theme.
- **PR 5** (←PR 4) `pnpm -r test`+`playwright test`+coverage; Playwright on `feature/erp-bootstrap`; disable CI, revert config.

## Phase 1: Monorepo Foundation (PR 1)

- [x] 1.1 Root: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.editorconfig`, `tsconfig.base.json`, `turbo.json` (cache OFF `test`); RED root Vitest `sum.test.ts` (runner first).
- [x] 1.2 `packages/tsconfig`+`packages/eslint-config`+Prettier; `docker-compose.yml` postgres+healthcheck+volume; `openspec/config.yaml` flip `strict_tdd: true`.
- [x] 1.3 `apps/api` (Express 5+Drizzle+Zod) `src/features/sample-health/{domain,application,infrastructure,presentation}`; RED `GET /health` ⇒ 200; GREEN impl; Drizzle wired.
- [x] 1.4 `apps/web` (Vite+React+TS, TanStack Query, Zustand) `src/features/sample/{domain,application,infrastructure,presentation}`; RED renders `Sample`; GREEN impl.

## Phase 2: Identity & Access (PR 2)

- [x] 2.1 RED `POST /auth/login` valid ⇒ 204+`Set-Cookie`; invalid ⇒ 401 generic; RED `GET /auth/me` unauth ⇒ 401, auth ⇒ 200+`memberships`; GREEN controller+UC+repo+`users`/`sessions`+argon2id+`requireAuth`; Drizzle migration+boot.
- [x] 2.2 RED `company-user` ⇒ `GET /admin/*` ⇒ 403 (threat #1); GREEN `memberships`+`requireRole(platform-admin)`+role enum; RED Playwright unauth `/dashboard` ⇒ `/login` (threat #1); GREEN Router guard via `useAuth()`.
- [x] 2.3 RED boot `NODE_ENV=production`+`SEED_ADMIN_ENABLED=true` ⇒ refuses; prod `admin/admin` ⇒ 401 (threat #4); GREEN env-gated seed+NODE_ENV guard.
- [x] 2.4 Web `apps/web/src/features/auth`: login form, `useLogin` mutation, Zustand session cache, `useAuth` hook.

## Phase 3: Company Onboarding (PR 3)

- [x] 3.1 RED `POST /companies` valid ⇒ 201+`notification`+`audit_event`+`membership(company-owner)` atomic; missing step ⇒ 400; GREEN tenant-create UC+Drizzle tx+Zod+migration (companies+profile+branches).
- [x] 3.2 Web `apps/web/src/features/onboarding`: 5-step Zustand (account, legal/tax, services, address, contact); RED stepper refuses empty; GREEN store guard.
- [x] 3.3 RED palette default applied on create; `GET /me/preferences` returns it; GREEN `theme_preferences` row in tx + Web palette selector + `PATCH /me/preferences` mutation.

## Phase 4: Dashboard + Admin + Desktop + Theme (PR 4)

- [ ] 4.1 RED `GET /admin/companies/summary` ⇒ 200; RED `GET /admin/notifications` ⇒ 200; GREEN impl; Drizzle migration notifications/audit_events; index `notifications(target_role)`; pino+request-id+`/health`/`/metrics`.
- [ ] 4.2 Web `apps/web/src/features/dashboard`: sidebar+cards+queries; RED shows modules for `company-owner`; GREEN filter by role.
- [ ] 4.3 RED `isDesktop(ua, pointer)` false mobile; Playwright ⇒ blocking page (threat #2); GREEN hook+`<DesktopGate>`.
- [ ] 4.4 5 palette tokens (CSS vars) in `apps/web/src/features/theme`; RED applying palette sets `data-palette` on `<html>`; no dark/light; GREEN `usePalette`+`ThemeProvider`.

## Phase 5: E2E + CI + Coverage (PR 5)

- [ ] 5.1 Playwright desktop+mobile; E2E: login→onboarding→dashboard; admin new-company; palette; mobile-block.
- [ ] 5.2 RED CI-lint parses `.github/workflows/ci.yml` `permissions: contents: read`+no `pull_request_target`+secrets (threat #3); GREEN test.
- [ ] 5.3 `.github/workflows/ci.yml`: one gate — install, typecheck, lint, unit, integration, build, Playwright, coverage, audit, gitleaks.
- [ ] 5.4 Vitest coverage 80% `apps/api/src/features/{identity,companies,admin}`; update `openspec/config.yaml` `verify.coverage_threshold: 80`.
