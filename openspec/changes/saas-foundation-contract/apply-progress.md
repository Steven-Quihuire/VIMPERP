# Apply Progress: saas-foundation-contract

- Change: `saas-foundation-contract`
- Delivery mode: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Strict TDD: Active
- Size exception: No

## Completed Work Units

### PR1-active-company-session-switch
- PR boundary: PR #1 base = feature/tracker branch; ends with persisted active-company session contract only
- Completed Tasks
  - [x] 1.1 Bootstrap TDD runners from `package.json`, `apps/api/package.json`, and `apps/web/package.json`; confirm focused RED commands before edits.
  - [x] 1.2 RED: extend `apps/api/src/features/identity/presentation/auth.route.test.ts` and `apps/api/src/features/companies/presentation/company.route.test.ts` for persisted `activeCompany`, invalid saved-company fallback, switch membership reject, and generic `429` throttle.
  - [x] 1.3 GREEN/REFACTOR: update auth/session, switch route, schema, throttle, audit persistence, and migration coverage for PR1.

### PR2-onboarding-items-enforcement
- PR boundary: PR #2 base = PR #1 branch; ends with onboarding idempotency + item capability enforcement only
- Completed Tasks
  - [x] 2.1 RED: extend `apps/api/src/features/companies/application/create-company.test.ts` and `apps/api/src/features/companies/presentation/company.route.test.ts` for idempotent replay, payload-conflict rejection, new-company-active preference write, and sanitized duplicate-company outcomes.
  - [x] 2.2 GREEN: update `apps/api/src/features/companies/domain/company.ts`, `apps/api/src/features/companies/application/create-company.ts`, `apps/api/src/features/companies/application/get-current-company-summary.ts`, `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`, and recorder support so company creation replays by idempotency key, writes lifecycle defaults, and persists active-company/theme preference in one transaction.
  - [x] 2.3 RED: extend `apps/api/src/features/items/presentation/item.route.test.ts` and item application tests for missing active company denial, body `companyId` ignore, capability-based delete, and blocked lifecycle denial.
  - [x] 2.4 GREEN: update `apps/api/src/features/items/application/*.ts`, `apps/api/src/features/items/presentation/item.router.ts`, and `apps/api/src/app/create-app.ts` to use explicit active company + centralized capabilities instead of first-membership/owner-only checks.
  - [x] 2.5 REFACTOR: remove duplicated tenant/role inference across `apps/api/src/features/identity/**`, `apps/api/src/features/companies/**`, and `apps/api/src/features/items/**` behind one capability/session contract.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/features/identity/presentation/auth.route.test.ts`, `apps/api/src/features/companies/presentation/company.route.test.ts` | Integration | ✅ `pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → 30 files / 127 tests passing pre-change | ✅ Confirmed root/app scripts, then captured failing command after new assertions were added | ✅ `pnpm --filter api exec vitest run src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → 2 files / 20 tests passing | ➖ Structural bootstrap task; triangulation covered in 1.2/1.3 | ➖ None needed |
| 1.2 | `apps/api/src/features/identity/presentation/auth.route.test.ts`, `apps/api/src/features/companies/presentation/company.route.test.ts` | Integration | ✅ Same baseline as 1.1 | ✅ Added 5 failing assertions/scenarios: persisted `activeCompany`, invalid saved-company fallback, switch success persistence, non-member reject, generic `429` throttle | ✅ Initial RED run: 5 failures (`activeCompany` missing + `PATCH /me/active-company` 404). Final GREEN: `pnpm --filter api exec vitest run src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → 2 files / 20 tests passing | ✅ Happy path + edge path pairs covered across auth/session and switch throttle membership rejection | ✅ Test doubles were generalized with explicit active-company, lifecycle, and throttle helpers |
| 1.3 | `apps/api/src/features/identity/presentation/auth.route.test.ts`, `apps/api/src/features/companies/presentation/company.route.test.ts`, `apps/api/src/db/migrations/__tests__/0008_active_company_preferences.test.ts` | Integration + migration | ✅ Existing route tests green before production edits | ✅ Migration test written for `company_status` + `user_preferences`; route tests already failing from 1.2 RED | ✅ `pnpm --filter api exec vitest run src/db/migrations/__tests__/0008_active_company_preferences.test.ts src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → 3 files / 21 tests passing; prescribed command rerun afterward → 30 files / 132 tests passing | ✅ Added migration coverage plus real route assertions for auto-select fallback, persisted switch, and throttle boundary | ✅ Kept switch logic in composition + router boundaries, normalized session contract, and removed duplicate migration DDL for `erp_module_id` |
| 2.1 | `apps/api/src/features/companies/application/create-company.test.ts`, `apps/api/src/features/companies/presentation/company.route.test.ts` | Integration + application | ✅ `pnpm --filter api exec vitest run src/features/companies/application/create-company.test.ts src/features/companies/presentation/company.route.test.ts src/features/items/presentation/item.route.test.ts src/features/items/application/create-item.test.ts src/features/items/application/soft-delete-item.test.ts` → 5 files / 32 tests passing pre-change | ✅ Added failing replay, payload-conflict, active-company write, and sanitized duplicate-company assertions; RED run on the same 5-file command produced 43 tests with 14 failures | ✅ `pnpm --filter api exec vitest run src/features/companies/application/create-company.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts src/features/companies/infrastructure/provisioning.recorder.test.ts` → 4 files / 24 tests passing | ✅ Covered equivalent retry vs changed payload vs duplicate legal identifier paths across app + route layers | ✅ Refined the in-memory recorder/gateway fixtures so route tests model shared onboarding persistence instead of separate fake stores |
| 2.2 | `apps/api/src/features/companies/application/create-company.test.ts`, `apps/api/src/features/companies/presentation/company.route.test.ts`, `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.test.ts`, `apps/api/src/features/companies/infrastructure/provisioning.recorder.test.ts` | Application + integration | ✅ Company-focused suites green before gateway/recorder edits | ✅ Existing 2.1 RED cases exercised missing replay/default-preference behavior | ✅ `pnpm --filter api exec vitest run src/features/companies/application/create-company.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts src/features/companies/infrastructure/provisioning.recorder.test.ts` → 4 files / 24 tests passing | ✅ Triangulated replay success, changed-payload conflict, duplicate legal identifier, and second-company active preference writes | ✅ Extracted payload fingerprinting + provisioning replay contract while keeping lifecycle default/theme preference writes inside one DB transaction |
| 2.3 | `apps/api/src/features/items/presentation/item.route.test.ts`, `apps/api/src/features/items/application/create-item.test.ts`, `apps/api/src/features/items/application/soft-delete-item.test.ts` | Integration + application | ✅ Same 5-file baseline as 2.1 before item RED edits | ✅ Added failing assertions for missing active company, blocked lifecycle, body `companyId` ignore, and delete capability bound to the active company; RED observed in the 14-failure run above | ✅ `pnpm --filter api exec vitest run src/features/items/application/create-item.test.ts src/features/items/application/soft-delete-item.test.ts src/features/items/presentation/item.route.test.ts` implicitly passed inside the broader 10-file item/auth run: 10 files / 51 tests passing | ✅ Covered write/read/delete behavior through both application defenses and route-level tenant resolution | ✅ Reworked auth/item test doubles to track active-company + lifecycle state explicitly |
| 2.4 | `apps/api/src/features/items/application/*.test.ts`, `apps/api/src/features/items/presentation/item.route.test.ts`, `apps/api/src/features/identity/presentation/auth.route.test.ts` | Application + integration | ✅ Item suites green before production edits | ✅ 2.3 RED tests forced new capability/status-aware inputs | ✅ `pnpm --filter api exec vitest run src/features/items/application/create-item.test.ts src/features/items/application/update-item.test.ts src/features/items/application/get-item.test.ts src/features/items/application/list-items.test.ts src/features/items/application/create-category.test.ts src/features/items/application/update-category.test.ts src/features/items/application/list-categories.test.ts src/features/items/application/soft-delete-item.test.ts src/features/items/presentation/item.route.test.ts src/features/identity/presentation/auth.route.test.ts` → 10 files / 51 tests passing | ✅ Triangulated read vs write vs delete capabilities and active vs blocked company status across all item use cases | ✅ Removed route-local first-membership logic, ignored spoofed body `companyId`, and pushed active-company capability checks into a shared session contract |
| 2.5 | `apps/api/src/features/identity/presentation/auth.route.test.ts`, item + company focused suites | Integration + application | ✅ 2.4 green established a safe net for the refactor | ✅ Approval-style continuation from 2.4 behavior tests; no new product behavior beyond shared contract reuse | ✅ `pnpm --filter api typecheck` → passed; prescribed command rerun: `pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts` → 31 files / 144 tests passing | ✅ Shared contract now covers auth session capabilities, onboarding replay, and item tenant enforcement across multiple roles/statuses | ✅ Collapsed duplicated tenant inference behind `activeCompany + capabilities`, and updated auth session payload/schema to expose the shared contract |

## Work Unit Evidence
### PR1-active-company-session-switch
| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/0008_active_company_preferences.test.ts src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → passed, 3 files / 21 tests / 1.75s. Prescribed command rerun: `pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts` → passed, 30 files / 132 tests / 6.96s. |
| Runtime harness command/scenario and exact result | `pnpm db:up` → postgres running. `pnpm --filter api dev` started on `http://127.0.0.1:3000`. Scenario: register user, create first company, manually insert second membership in DB because current onboarding still 500s on a second company for the same user, `PATCH /me/active-company` to `runtime-company-2`, then `GET /auth/me`. Result: PATCH returned `204`; GET returned `activeCompany.companyId = runtime-company-2` with two memberships and `status = active`. |
| Rollback boundary | Revert PR1-only session/switch contract files: `apps/api/src/app/create-app.ts`, `apps/api/src/features/identity/{domain/auth.ts,application/{login.ts,register.ts,resolve-auth-session.ts},infrastructure/drizzle-auth.gateway.ts,presentation/auth.router.ts}`, `apps/api/src/features/companies/presentation/company.router.ts`, `apps/api/src/shared/{infrastructure/db/schema.ts,presentation/error.middleware.ts}`, and migration `apps/api/src/db/migrations/0008_tiny_scrambler.sql` plus its test. |

### PR2-onboarding-items-enforcement
| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts` → passed, 31 files / 144 tests / 10.21s. Supporting focused greens: companies bundle `pnpm --filter api exec vitest run src/features/companies/application/create-company.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts src/features/companies/infrastructure/provisioning.recorder.test.ts` → 4 files / 24 tests passing; items/auth bundle `pnpm --filter api exec vitest run src/features/items/application/create-item.test.ts src/features/items/application/update-item.test.ts src/features/items/application/get-item.test.ts src/features/items/application/list-items.test.ts src/features/items/application/create-category.test.ts src/features/items/application/update-category.test.ts src/features/items/application/list-categories.test.ts src/features/items/application/soft-delete-item.test.ts src/features/items/presentation/item.route.test.ts src/features/identity/presentation/auth.route.test.ts` → 10 files / 51 tests passing; `pnpm --filter api typecheck` → passed. |
| Runtime harness command/scenario and exact result | `pnpm db:up` kept postgres running. `pnpm --filter api dev` started on `http://127.0.0.1:3000`. Scenario: register runtime user, `POST /companies` with `x-idempotency-key=runtime-pr2-company-a`, retry the same request with the same key, create company B with a second key, confirm `GET /auth/me` returns company B as `activeCompany`, `POST /items` with spoofed `companyId` from company A, `GET /items/:id`, then `DELETE /items/:id`. Result JSON: `companyA` and `replayA` matched exactly, `activeCompany.companyId` switched to company B with `status="active"`, created item was stored under company B (`itemCompanyId` matched company B, not the spoofed body value), and delete returned `204`. |
| Rollback boundary | Revert PR2-only onboarding/capability files: `apps/api/src/features/companies/{domain/company.ts,application/create-company.ts,application/get-current-company-summary.ts,infrastructure/drizzle-company.gateway.ts,infrastructure/drizzle-provisioning.recorder.ts,presentation/company.router.ts}`, `apps/api/src/features/items/{application/*.ts,presentation/item.router.ts}`, `apps/api/src/features/identity/{domain/auth.ts,application/resolve-auth-session.ts,presentation/auth.router.ts,application/{login.ts,register.ts}}`, plus `apps/api/src/app/create-app.ts` and `apps/api/src/shared/presentation/error.middleware.ts`. |

## Correction Evidence: PR2-verify-remediation
```yaml
schema: gentle-ai.remediation-result/v1
work_unit: PR2-verify-remediation
status: partial
runtime_attempt_token: sha256:8dfcf352c1284b9d9b52ebbd216a8c459322ab7799110239542f93f1a6363b58
failed_evidence_revision: sha256:7600ff930a91c20c81ddb04f990d5c3c0da770a0ebcfbe278255c6b1c016ee5c
lineage_id: unknown-not-provided-by-orchestrator
generation: unknown-not-provided-by-orchestrator
fix_batch: unknown-not-provided-by-orchestrator
notes:
  - Blocker fixes were applied and validated.
  - Formal remediation completion metadata was not available in the launch context.
```

```json
{
  "schema": "gentle-ai.remediation-evidence/v1",
  "work_unit": "PR2-verify-remediation",
  "failed_evidence_revision": "sha256:7600ff930a91c20c81ddb04f990d5c3c0da770a0ebcfbe278255c6b1c016ee5c",
  "lineage_id": "unknown-not-provided-by-orchestrator",
  "generation": "unknown-not-provided-by-orchestrator",
  "fix_batch": "unknown-not-provided-by-orchestrator",
  "focused_test": {
    "command": "pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts",
    "result": "exit 0; 31 files / 144 tests passed"
  },
  "runtime_harness": {
    "command": "N/A",
    "result": "N/A — remediation only updated a stale unit-test expectation and lint-safe typings/import usage; no separate runtime boundary changed"
  },
  "typecheck": {
    "command": "pnpm --filter api typecheck",
    "result": "exit 0"
  },
  "lint": {
    "command": "pnpm --filter api exec eslint src/app/create-app.ts src/features/companies/application/create-company.test.ts src/features/companies/application/create-company.ts src/features/companies/application/get-current-company-summary.ts src/features/companies/domain/company.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts src/features/companies/infrastructure/drizzle-company.gateway.ts src/features/companies/infrastructure/drizzle-provisioning.recorder.ts src/features/companies/infrastructure/provisioning.recorder.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/presentation/company.router.ts src/features/identity/application/login.ts src/features/identity/application/register.ts src/features/identity/application/resolve-auth-session.ts src/features/identity/domain/auth.ts src/features/identity/presentation/auth.route.test.ts src/features/identity/presentation/auth.router.ts src/features/items/application/create-category.test.ts src/features/items/application/create-category.ts src/features/items/application/create-item.test.ts src/features/items/application/create-item.ts src/features/items/application/get-item.test.ts src/features/items/application/get-item.ts src/features/items/application/list-categories.test.ts src/features/items/application/list-categories.ts src/features/items/application/list-items.test.ts src/features/items/application/list-items.ts src/features/items/application/soft-delete-item.test.ts src/features/items/application/soft-delete-item.ts src/features/items/application/update-category.test.ts src/features/items/application/update-category.ts src/features/items/application/update-item.test.ts src/features/items/application/update-item.ts src/features/items/presentation/item.route.test.ts src/features/items/presentation/item.router.ts src/shared/presentation/error.middleware.ts --max-warnings=0",
    "result": "exit 0"
  },
  "rollback_boundary": [
    "apps/api/src/features/identity/application/register.test.ts",
    "apps/api/src/features/companies/application/create-company.test.ts",
    "apps/api/src/features/companies/infrastructure/drizzle-company.gateway.test.ts",
    "apps/api/src/features/items/presentation/item.router.ts",
    "openspec/changes/saas-foundation-contract/apply-progress.md"
  ]
}
```

## Remaining Tasks
- [ ] 3.1-3.4 Web routing, blocked-company UX, and switcher persistence
- [ ] 4.1-4.3 Verify full API/web/e2e contract

## Deviations
- None from the approved PR1/PR2 design. The remediation batch only aligned stale test expectations with the shared auth-session contract and removed changed-file lint violations without changing runtime behavior.

## Issues
- `pnpm --filter api test -- ...` still expands beyond the named files, so direct `vitest run` remains the fast TDD loop and the prescribed command is retained for receipt evidence.
- Formal remediation lineage metadata (`lineage_id`, `generation`, `fix_batch`) was not present in the launch context, so the persisted remediation envelope records that gap explicitly.
