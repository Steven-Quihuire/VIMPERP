# Tasks: SaaS Foundation Contract

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Persist active company + switch contract | PR 1 (base = feature/tracker branch) | `pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` | `pnpm db:up && pnpm --filter api dev` + `GET /auth/me`, `PATCH /me/active-company` | Auth/company schema, session, switch route |
| 2 | Enforce onboarding/item capability rules | PR 2 (base = PR 1 branch) | `pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts` | `pnpm db:up && pnpm --filter api dev` + retry `/companies`, tenant item CRUD | Onboarding idempotency + item authorization |
| 3 | Ship web routing and blocked-company UX | PR 3 (base = PR 2 branch; tracker integrates to main) | `pnpm --filter web test -- src/app/app.auth.test.tsx src/app/app.onboarding.test.tsx src/app/app.dashboard-shell.test.tsx` | `pnpm db:up && pnpm dev` + login, switch, reload blocked tenant | Web auth/onboarding/dashboard routes |

## Phase 1: Foundation

- [x] 1.1 Bootstrap TDD runners from `package.json`, `apps/api/package.json`, and `apps/web/package.json`; confirm focused RED commands before edits.
- [x] 1.2 RED: extend `apps/api/src/features/identity/presentation/auth.route.test.ts` and `apps/api/src/features/companies/presentation/company.route.test.ts` for persisted `activeCompany`, invalid saved company fallback, switch membership reject, and generic `429` throttle.
- [x] 1.3 GREEN/REFACTOR: update `apps/api/src/shared/infrastructure/db/schema.ts`, `apps/api/src/features/identity/domain/auth.ts`, `apps/api/src/features/identity/application/resolve-auth-session.ts`, `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`, `apps/api/src/features/identity/presentation/auth.router.ts`, `apps/api/src/features/companies/presentation/company.router.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, and `apps/api/src/app/create-app.ts` for `user_preferences.active_company_id`, company status, `PATCH /me/active-company`, throttle, audit counting, and session payload.

## Phase 2: API Contract Enforcement

- [x] 2.1 RED: extend `apps/api/src/features/companies/application/create-company.test.ts` and `apps/api/src/features/companies/presentation/company.route.test.ts` for idempotent replay, payload-conflict rejection, new-company-active preference write, and sanitized duplicate-company outcomes.
- [x] 2.2 GREEN: update `apps/api/src/features/companies/domain/company.ts`, `apps/api/src/features/companies/application/create-company.ts`, `apps/api/src/features/companies/application/get-current-company-summary.ts`, `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`, and `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.test.ts` to persist lifecycle defaults and active-company preference in one transaction.
- [x] 2.3 RED: extend `apps/api/src/features/items/presentation/item.route.test.ts` and item application tests for missing active company denial, body `companyId` ignore, capability-based delete, and blocked lifecycle denial.
- [x] 2.4 GREEN: update `apps/api/src/features/items/application/*.ts`, `apps/api/src/features/items/presentation/item.router.ts`, and `apps/api/src/features/items/infrastructure/drizzle-item.gateway.ts` to use explicit active company + centralized capabilities instead of first-membership/owner-only checks.
- [x] 2.5 REFACTOR: remove duplicated tenant/role inference across `apps/api/src/features/identity/**`, `apps/api/src/features/companies/**`, and `apps/api/src/features/items/**` behind one capability/session contract.

## Phase 3: Web Contract and UX

- [ ] 3.1 RED: extend `apps/web/src/app/app.auth.test.tsx`, `apps/web/src/app/app.onboarding.test.tsx`, and `apps/web/src/app/app.dashboard-shell.test.tsx` for no-active-company redirect, blocked-company shell route, generic blocked copy, and persisted switch reload behavior.
- [ ] 3.2 GREEN: update `apps/web/src/features/auth/domain/auth.ts`, `apps/web/src/features/auth/infrastructure/auth-client.ts`, `apps/web/src/features/auth/infrastructure/auth-store.ts`, `apps/web/src/features/auth/presentation/use-auth.ts`, and `apps/web/src/features/auth/presentation/components/team-switcher.tsx` for `activeCompany`, statuses, and switch mutation.
- [ ] 3.3 GREEN: update `apps/web/src/app/app.tsx`, `apps/web/src/features/onboarding/domain/onboarding.ts`, `apps/web/src/features/dashboard/domain/dashboard.ts`, and create `apps/web/src/features/dashboard/presentation/blocked-company-page.tsx` for `/dashboard/company-status`, onboarding-only-without-company, and support-safe labels.
- [ ] 3.4 REFACTOR: align sidebar/current-section helpers in `apps/web/src/features/dashboard/**` so company context comes from `activeCompany`, not `memberships[0]`.

## Phase 4: Verification

- [ ] 4.1 Run focused API slices: `pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts`.
- [ ] 4.2 Run focused web slices: `pnpm --filter web test -- src/app/app.auth.test.tsx src/app/app.onboarding.test.tsx src/app/app.dashboard-shell.test.tsx`.
- [ ] 4.3 Run cross-app proof: `pnpm e2e` or equivalent tenant flow covering login, switch, reload, blocked `/dashboard/company-status`, and generic support-safe copy.
