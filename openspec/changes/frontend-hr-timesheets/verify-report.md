```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:1dc05272896a47362f7e615b5c26d1282f2def68c2dd74886ff35d4796c75415
verdict: fail
blockers: 3
critical_findings: 3
requirements: 2/2
scenarios: 5/5
test_command: pnpm --filter api exec vitest run src/features/identity/domain/__tests__/auth-capabilities.test.ts src/features/identity/application/resolve-auth-session.test.ts src/features/identity/presentation/auth-session-shape.test.ts src/features/hr-timesheets/application/__tests__/list-entries.test.ts src/features/hr-timesheets/presentation/timesheets.router.test.ts && pnpm --filter web exec vitest run src/shared/lib/http/http-client.test.ts src/features/auth/domain/auth.test.ts src/features/hr-timesheets/infrastructure/create-hr-timesheets-api.test.ts src/features/hr-timesheets/application/hr-timesheets-queries.test.tsx src/features/hr-timesheets/application/weekly-entry-draft-store.test.ts src/features/hr-timesheets/domain/__tests__/friendly-timesheet-error.test.ts src/features/hr-timesheets/domain/__tests__/timesheets-domain.test.ts src/features/hr-timesheets/presentation/pages/__tests__/timesheet-periods-list.test.tsx src/features/hr-timesheets/presentation/pages/__tests__/timesheet-period-detail.test.tsx src/features/hr-timesheets/presentation/components/__tests__/weekly-entry-editor.test.tsx src/features/dashboard/presentation/__tests__/dashboard-app-sidebar.test.tsx src/app/app.hr-routes.test.tsx && pnpm exec playwright test e2e/timesheets.spec.ts --reporter=line
test_exit_code: 0
test_output_hash: sha256:c6ac3fb80ea22c6688505b649235570808a17e40991ec81f58eca0820c28c1e5
build_command: pnpm --filter api typecheck && pnpm --filter web typecheck
build_exit_code: 2
build_output_hash: sha256:8f26a6502413cef0e9173c5785e4a1dfd39d8f644516c92d61b879d86145101e
```

## Verification Report

**Change**: `frontend-hr-timesheets`
**Version**: N/A
**Mode**: Strict TDD
**Artifact store**: Hybrid request; native status projects the file-backed OpenSpec store.

### Completeness

| Metric | Value |
|--------|-------|
| Proposal | Present and read |
| Specs | 2 change-local delta requirements and 5 scenarios present and read |
| Design | Present and read |
| Tasks total | 35 |
| Tasks complete | 35 |
| Tasks incomplete | 0 |
| Apply-progress | Missing from OpenSpec; Engram topic contains only an apply summary and no TDD Cycle Evidence table |

### Build & Tests Execution

**Focused tests**: ✅ 51 passed, 0 failed.

- API: 5 files, 28 tests passed.
- Web: 12 files, 22 tests passed.
- Playwright: 1 test passed for the authorized empty-period list.
- Aggregate output hash: `sha256:c6ac3fb80ea22c6688505b649235570808a17e40991ec81f58eca0820c28c1e5`.

**Build/type-check**: ❌ `pnpm --filter api typecheck && pnpm --filter web typecheck` exited 2.

- API reports the known unrelated org-hierarchy/node-management/register failures, plus an `item.route.test.ts` capability-union incompatibility caused by the widened `AuthCapability` type.
- Web reports errors in changed files: `create-hr-timesheets-api.test.ts:239`, `timesheet-period-detail.tsx:90,123,127,129,131,143,153,163,168,205`, and `http-client.test.ts:46,57`.
- Output hash: `sha256:8f26a6502413cef0e9173c5785e4a1dfd39d8f644516c92d61b879d86145101e`.

**Coverage**: ⚠️ Available, but not archive-ready.

- API changed-scope coverage run passed all 28 tests but exited 1 because the configured 80% global threshold was not met (63.86% aggregate). Changed implementation files reported: `list-entries.ts` 90.47% lines / 80% branches; `timesheets.router.ts` 93.68% / 72.22%; `timesheets.ts` 88.51% / 91.17%; `identity/domain/auth.ts` 66.08% / 86.66%.
- Web focused coverage exited 0; aggregate coverage was 26.2% because the application-wide instrumentation scope is broad. Changed-file values included `hr-timesheets-queries.ts` 92.41%, `weekly-entry-draft-store.ts` 100%, `timesheets.ts` 100%, `friendly-timesheet-error.ts` 100%, `create-hr-timesheets-api.ts` 100%, `weekly-entry-editor.tsx` 85.65%, `timesheet-period-detail.tsx` 62.27%, `timesheet-periods-list.tsx` 90.42%, `dashboard-app-sidebar.tsx` 76.71%, `app.tsx` 58.22%, `http-client.ts` 90.8%, and web `auth.ts` 100%.

**Lint**: ⚠️ API lint exited 1 with four errors, including two in the changed `resolve-auth-session.test.ts`; web lint exited 1 with 72 repository errors, including changed `app.tsx`, `dashboard-app-sidebar.tsx`, `hr-timesheets-queries.ts`, and `http-client.test.ts`. Lint is informational in Strict TDD and was not used as the primary failure gate.

**Runtime note**: ✅ The Playwright scenario reached login, `/auth/me` capability parsing, the company shell, and `GET /companies/runtime-active-scope-company/timesheets` with 200. ⚠️ Teardown emits an unhandled PostgreSQL `57P01 terminating connection due to administrator command` after the test passes.

### Spec Compliance Matrix

The native OpenSpec status exposes the two change-local specs below; counts in the envelope are therefore 2 requirements and 5 scenarios.

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Scoped period entry listing | Authorized caller lists entries for one visible period | `apps/api/src/features/hr-timesheets/application/__tests__/list-entries.test.ts > own/direct-report cases`; `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts > scoped period entries` | ✅ COMPLIANT |
| Scoped period entry listing | Visible period with no entries returns an empty list | `list-entries.test.ts > returns an empty list`; `timesheets.router.test.ts > self entries` | ✅ COMPLIANT |
| Scoped period entry listing | Out-of-scope caller cannot read period entries | `list-entries.test.ts > hides out-of-scope`; `timesheets.router.test.ts > rejects outsiders` | ✅ COMPLIANT |
| HR Timesheets navigation entry | Authorized user opens Timesheets from HR navigation | `apps/web/src/features/dashboard/presentation/__tests__/dashboard-app-sidebar.test.tsx > shows Timesheets...`; `apps/web/src/app/app.hr-routes.test.tsx > registers...routes` | ✅ COMPLIANT |
| HR Timesheets navigation entry | User without timesheet visibility sees no entry | `dashboard-app-sidebar.test.tsx > rerender without hr.timesheets.read` | ✅ COMPLIANT |

**Compliance summary**: 5/5 change-local scenarios compliant.

### Correctness (Static Evidence)

| Requirement/area | Status | Notes |
|------------------|--------|-------|
| Scoped entries use case | ✅ Implemented | Loads the requested period, resolves its assignment, checks `visibleEmployeeIds`, and delegates to `gateway.listEntries`; out-of-scope reads become not-found. |
| Entries route | ✅ Implemented | `GET /companies/:companyId/timesheets/:periodId/entries` is wired through `create-app`, uses the timesheet read capability and existing scope resolution, and has supertest coverage. |
| Capability contract | ✅ Implemented | API and web unions include `hr.timesheets.read|write|submit|approve`; `/auth/me` parses against the shared API capability values. |
| Web server state | ✅ Implemented | Period, detail, and entries data use TanStack Query; mutations invalidate list, period, and entry keys. |
| Draft-only editing | ✅ Implemented | Weekly entry controls are gated by draft status and use Zustand only for draft/dialog UI state. |
| Typed error feedback | ✅ Implemented | `HttpError.code` is preserved and mapped to actionable timesheet messages. |
| Runtime workflow evidence | ⚠️ Partial | Focused component/domain tests cover editor and action predicates, but the E2E file only contains the authorized empty-list scenario. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Separate period-entries endpoint | ✅ Yes | Frontend detail composes period metadata and the dedicated entries query. |
| Reuse gateway and visibility scope | ✅ Yes | Backend follows the `get-period` visibility pattern and reuses `listEntries`. |
| Feature-first vertical slice | ✅ Yes | Web code is under `features/hr-timesheets/{domain,application,infrastructure,presentation}`. |
| Query/store separation | ✅ Yes | TanStack Query owns server state; Zustand owns draft and reject-dialog state. |
| Capability-based sidebar gating | ✅ Yes | Navigation uses `hasTimesheetReadVisibility`, not generic HR responsibility. |
| RHF + Zod form approach | ⚠️ Partial | DTOs use Zod, but the weekly editor uses native controlled inputs rather than the design's stated React Hook Form approach; no spec scenario is broken by this deviation. |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ❌ | No `TDD Cycle Evidence` table exists in the OpenSpec or retrieved Engram apply-progress artifact. |
| Referenced test files exist | ✅ | All 35 task rows reference test files that exist in the current worktree, including `e2e/timesheets.spec.ts`. |
| RED confirmed | ⚠️ | Cannot independently verify RED timing or safety-net state without the missing apply-progress table. |
| GREEN confirmed | ✅ | Current focused runtime execution passed 28 API, 22 web, and 1 Playwright test. |
| Triangulation adequate | ⚠️ | `tasks.md` describes self-submit, manager-approve, reject-reason, and out-of-scope E2E scenarios, but `e2e/timesheets.spec.ts` contains only one authorized-list test. |
| Safety net for modified files | ⚠️ | No safety-net evidence is available because apply-progress is missing. |

**TDD Compliance**: 2/6 checks fully evidenced; strict TDD protocol is not independently attestable.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 33 | 10 | Vitest |
| Integration/component | 17 | 7 | Vitest, Testing Library, Supertest |
| E2E | 1 | 1 | Playwright |
| **Total** | **51** | **18** | |

### Changed File Coverage

Coverage was run with V8. The focused web report covered the changed feature files directly; the targeted API run had to override the repository include list because the default config excludes the new HR timesheets files. Values and uncovered behavior are recorded above. Coverage is informational and does not replace the failing type-check gate.

### Assertion Quality

**Assertion quality**: ✅ All reviewed assertions exercise production code or meaningful compile-time/schema behavior. Empty-list assertions have companion non-empty cases; no tautologies, ghost loops, smoke-only tests, or mock-heavy assertion files were found. The auth session type-equality assertions are compile-time checks accompanied by runtime schema-key/value assertions.

### Quality Metrics

**Linter**: ⚠️ Repository lint failures; see Build & Tests Execution.
**Type Checker**: ❌ API and web typecheck command exited 2; web failures include changed files.

### Issues Found

**CRITICAL**:

1. Final API/web typecheck failed. Web has direct errors in the changed timesheets detail/API tests and HttpClient test; API also has a capability-union compatibility error in `features/items/presentation/item.route.test.ts` after the capability widening.
2. Strict TDD verification cannot attest the apply process because the required `TDD Cycle Evidence` table is absent from both OpenSpec and the retrieved Engram apply-progress content.
3. Task 3.11/3.12 claims four workflow E2E scenarios, but `e2e/timesheets.spec.ts` implements and executes only the authorized empty-list scenario. Manager approval, employee self-submit, reject-reason, and out-of-scope detail behavior lack final E2E proof.

**WARNING**:

- API and web lint have repository failures, including some changed files.
- API coverage exits 1 on the configured global threshold; web changed-file coverage is below 80% for `timesheet-period-detail.tsx`, `dashboard-app-sidebar.tsx`, and `app.tsx`.
- Playwright teardown logs an unhandled PostgreSQL administrator-termination error after the passing test.
- The implementation deviates from the design's stated RHF form approach while retaining Zod DTO validation.
- The task plan forecast approximately 1180 changed lines against an 800-line budget; auto-chain was authorized, but reviewer workload remains high.

**SUGGESTION**:

- Add seeded period/entry fixtures and the four missing workflow E2E cases before treating the change as archive-ready.
- Re-run verification after the changed-file type errors and missing TDD evidence are resolved.

### Verdict

**FAIL** — the change-local requirements and scenarios pass their focused runtime tests, but final type-checking fails in changed files and the strict-TDD/process and workflow-E2E evidence is incomplete.
