# Exploration: backend-timesheets-foundation

## Current State

The DB foundation for "Registro de horas" is fully landed and archived
(`2026-08-16-db-timesheets-foundation`). Confirmed on disk:

- `apps/api/src/shared/infrastructure/db/schema.ts:833-959` — `timesheetStatusEnum`,
  `timesheetPeriodsTable`, `timeEntriesTable` with composite tenant FKs, pair CHECKs,
  hours bounds CHECK, `(periodId, entryDate, taskLabel)` unique.
- Migration `0026_timesheets.sql` (+ journal/snapshot), `btree_gist` EXCLUDE overlap constraint.
- Tests: `apps/api/src/db/migrations/__tests__/migration-0026-timesheets.test.ts` (real PG),
  `apps/api/src/shared/infrastructure/db/schema.timesheets.test.ts` (metadata).
- Permission seeds live: `hr.timesheets.read|write|submit|approve` in
  `apps/api/src/features/roles-management/domain/permissions.ts` (`hrPermissionKeys`).
- **No backend feature exists**: no `features/hr-timesheets` slice, no use cases, no gateway,
  no routes, no error-middleware mappings, no wiring in `create-app.ts`.

### Backend patterns to reuse (verified in code)

| Concern | Pattern | Reference |
|---|---|---|
| Domain | Types + Gateway port + typed Error classes with `readonly code` | `features/approval-policy/domain/approval-policy.ts` |
| Application | Use-case factories `({ gateway }) => async (input)`, validation, domain errors | `features/approval-policy/application/*.ts` |
| Infrastructure | `createDrizzleXGateway(db, { createId, now })`, row mappers, `and(eq(companyId), eq(id))` tenancy | `features/approval-policy/infrastructure/drizzle-approval-policy.gateway.ts` |
| Presentation | Router factory receiving `requireAuth`, `requireHrCapability(key)`, use cases; Zod params/query/body; `ensureCompanyAccess(getAuth(response), companyId)`; try/catch → `next(error)` | `features/hr-employees/presentation/hr-employees.router.ts` |
| Permissions | `createRequireHrCapability` (scope-aware, `computeEffectivePermissions`-driven, active-company status check) | `features/roles-management/presentation/require-hr-capability.ts` |
| Errors | Centralized `instanceof` chain in `error.middleware.ts` mapping domain errors → HTTP codes | `shared/presentation/error.middleware.ts` |
| Composition | `create-app.ts` wires gateways/use cases; `CreateAppInput` accepts overrides for tests | `app/create-app.ts` |
| Router tests | Supertest + `createApp` with InMemory gateways + stubbed `computeEffectivePermissions`; asserts happy path, 403 no-permission, 403 cross-company | `features/approval-policy/presentation/approval-policy.router.test.ts` |
| Gateway tests | Real PG via `createMigrationTestDatabase` + `applyMigrationsThrough(...)`, fixture inserts, deterministic `createId`/`now` | `features/approval-policy/infrastructure/drizzle-approval-policy.gateway.test.ts` |

## Timesheets DB contract available today

`timesheet_periods`: uuid PK; `companyId` FK restrict + composite tenant FKs
(`(employeeAssignmentId,companyId)`, `(approvalPolicyId,companyId)`); `periodStart/End`
with `end >= start` CHECK; status enum `draft|submitted|approved|rejected` (default draft);
pair CHECKs `submittedAt↔submittedByUserId`, `approvedAt↔approvedByUserId` (FK `users.id`);
`rejectionReason` nullable; `approvalPolicyId` nullable snapshot FK; EXCLUDE gist
(`employee_assignment_id =`, half-open `daterange &&`) = no overlapping periods per assignment;
adjacent ranges allowed; `unique(id, companyId)`; indexes incl. `(companyId, status)`.

`time_entries`: uuid PK; `companyId`; `periodId` FK + composite tenant FK; `entryDate`;
`hours numeric(5,2)` CHECK `0 < h <= 24`; `projectId` uuid **nullable, no FK** (projects module absent);
`taskLabel` notNull; `note`; `unique(periodId, entryDate, taskLabel)`.

Documented app-layer duties deferred from the DB change (design.md):
per-day aggregate cap (e.g. ≤16h/day) not DB-expressible; `rejectionReason` required-on-reject
is app-enforced (DB allows NULL); `entryDate ∈ [periodStart, periodEnd]` is **not** DB-checked;
no `hr.timesheets.delete` permission key (state machine + audit replace deletion).

## Affected Areas

- `apps/api/src/features/hr-timesheets/` — NEW feature slice (domain/application/infrastructure/presentation).
- `apps/api/src/shared/presentation/error.middleware.ts` — register timesheet domain errors (400/404/409).
- `apps/api/src/app/create-app.ts` — wire gateway, use cases, router (`timesheetGateway` override in `CreateAppInput`).
- `apps/api/src/features/hr-employees/domain/employee-assignments.ts` — read-only reference for assignment shape validation (no edits expected).
- `apps/api/vitest.config.ts` — optional: add feature to coverage include list (proposal decision).

## Approaches

1. **Single monolithic backend change** — all use cases + gateway + router in one apply.
   - Pros: complete module in one change.
   - Cons: authored code+tests well over the 800-line review budget; high reviewer load.
   - Effort: High.
2. **One change, three chained slices (RECOMMENDED)** — `backend-timesheets-foundation` with
   strict-TDD slices: (S1) domain + application use cases with in-memory gateway tests;
   (S2) Drizzle gateway + real-PG gateway tests (incl. `23P01 exclusion_violation` → domain
   `TimesheetPeriodOverlapError`); (S3) router + error middleware + `create-app` wiring + supertest tests.
   - Pros: each slice fits the review budget; natural RED-GREEN-REFACTOR order; matches cached
     `auto-chain` strategy; each slice has clear start/finish/verification/rollback.
   - Cons: three PRs.
   - Effort: Medium.
3. **Read-only API first, mutations later** — list/get endpoints only.
   - Pros: smallest first PR.
   - Cons: defers the actual value (state machine, overlap mapping) to another change.
   - Effort: Low first slice, more total changes.

## Recommendation

Approach 2. Follow the approval-policy slice shape exactly; hr-employees supplies the nested-resource
route convention (`/companies/:companyId/timesheets/:periodId/entries`) and the permission-wrapper idiom.

## API / use-case boundaries and permission model (proposed, confirm at proposal)

Routes (all: `requireAuth` + `requireHrCapability(key)` + `ensureCompanyAccess`):

| Route | Permission | Use case |
|---|---|---|
| `POST /companies/:companyId/timesheets` | `hr.timesheets.write` | create draft period (validate assignment belongs to company; overlap → 409) |
| `GET /companies/:companyId/timesheets` | `hr.timesheets.read` | list (filters: assignmentId/employeeId, status, date range) |
| `GET /companies/:companyId/timesheets/:periodId` | `hr.timesheets.read` | get period + entries |
| `POST /companies/:companyId/timesheets/:periodId/entries` | `hr.timesheets.write` | add entry (draft only) |
| `PATCH /companies/:companyId/timesheets/:periodId/entries/:entryId` | `hr.timesheets.write` | update entry (draft only) |
| `DELETE .../entries/:entryId` | `hr.timesheets.write` | remove entry (draft only; route-level delete is fine — no permission key maps row deletion, only period deletion was excluded) |
| `POST .../submit` | `hr.timesheets.submit` | stamp submit pair + snapshot policy; draft→submitted |
| `POST .../approve` | `hr.timesheets.approve` | stamp approval pair; submitted→approved |
| `POST .../reject` | `hr.timesheets.approve` | `rejectionReason` required; submitted→rejected |

- Actor stamps: `submittedByUserId`/`approvedByUserId` = `auth.user.id`.
- State machine enforced in application layer; DB pair CHECKs are the concurrency safety net.
- Entry validation in app: `entryDate` within period range, hours bounds (Zod mirrors DB), unique task key.
- Overlap handling: gateway catches PG `23P01` and maps to `TimesheetPeriodOverlapError` → 409.
  Novel: no existing gateway translates PG constraint codes; must be designed + tested.
- Assignment existence check: keep as a small join/lookup inside the timesheets Drizzle gateway
  (avoid application-layer coupling to `HrEmployeesGateway`).

## Strict TDD test strategy

Strict TDD is active (`openspec/config.yaml`: `apply.tdd: true`, `testing.strict_tdd: true`;
runner `pnpm --filter api test`, Vitest). Order per slice:

1. **Domain/application (S1)**: in-memory gateway fakes; table-driven use-case tests for state
   transitions, validation, permission-agnostic rules; error classes asserted by `code`.
2. **Gateway (S2)**: real PostgreSQL via `createMigrationTestDatabase` +
   `applyMigrationsThrough('0026_timesheets.sql')`; fixtures (company, user, employee, assignment);
   assert tenant scoping, row mapping, `23P01` → overlap error translation. Note: Drizzle `date`
   columns return strings by default — decide mapping (ISO string vs `Date`) explicitly.
3. **Router (S3)**: supertest + `createApp` with in-memory gateways and stubbed
   `computeEffectivePermissions`; scenarios: happy paths per endpoint, 403 without permission,
   403 cross-company, 404 unknown period/entry, 409 overlap, 400 Zod validation, state-machine
   rejections (submit non-draft, approve non-submitted, reject without reason).
4. Commands: `pnpm --filter api test`, `pnpm --filter api test:coverage`, `pnpm typecheck`.

Coverage note: `vitest.config.ts` include list only covers identity/companies/admin — the new
feature is not threshold-bound unless added (cheap proposal decision).

## Open questions (must resolve before/at proposal)

**Blocking (product semantics):**
1. Approval-policy snapshot at submit: auto-resolve active policy for the assignment's scope,
   explicit `approvalPolicyId` in submit body, or allow submit with NULL snapshot?
2. May a `rejected` period be reopened to `draft` and resubmitted?
3. Entry locking: are entries immutable once the period is `submitted`? (Recommend: editable only in draft/rejected.)
4. Self-approval: may the same user submit and approve the same period?
5. Per-day aggregate cap: pick a value (e.g. ≤16h/day) and enforce now, or defer again (documented debt)?
6. Scope of list: company-wide list gated by `hr.timesheets.read`, or auth-scoped like
   `listEmployees({ auth })` (self/direct_reports permission scopes)?

**Defaults (non-blocking, confirm at proposal):** empty-period submit allowed; period dates
immutable once entries exist (EXCLUDE re-checks anyway); no period delete endpoint.

## Non-goals

- No frontend (`apps/web` untouched).
- No DB schema/migration changes. No gaps found that require DB edits: `entryDate`-in-range and
  per-day cap were consciously deferred to the app layer by the archived DB design — they are app
  duties, not DB gaps.
- No projects module / `projectId` FK.
- No approval-workflow engine (snapshot binding only; `definition` JSON is stored, not interpreted).
- No audit_events writes, no RLS, no overtime modeling.

## Risks

- **Review budget**: full backend feature (code + tests) will exceed 800 authored lines; mitigated by
  the three chained slices under the cached `auto-chain` strategy — `sdd-tasks` must forecast.
- **PG `23P01` translation is new territory** — no precedent in existing gateways; needs a tested helper.
- **Baseline debt**: repo typecheck has unrelated pre-existing failures in 7 files; must not be mixed in.
- **Worktree**: unrelated `.atl/skill-registry.md` modification stays untouched.
- **Date-mode gotcha**: Drizzle `date` columns surface as strings; the domain must pick one shape and the gateway must map consistently (test explicitly).
- Cross-feature read of `employee_assignments` — contained inside the timesheets gateway (join), so no
  application-layer coupling risk.

## Ready for Proposal

Yes — after answering blocking questions 1-6 above. The orchestrator should ask the user those
six product questions (or propose defaults) before `sdd-propose`.
