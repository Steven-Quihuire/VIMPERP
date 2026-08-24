# Apply Progress: frontend-hr-timesheets

## Mode

- Store: hybrid (OpenSpec + Engram)
- OpenSpec strict TDD: enabled
- Remediation scope: bounded verify remediation for failed evidence `sha256:1dc05272896a47362f7e615b5c26d1282f2def68c2dd74886ff35d4796c75415`
- Native runtime lineage: objective generation 8, work unit `verify-remediation`

## Native Attempt Ledger Evidence

| Attempt | Work unit | Outcome | Evidence revision | Process evidence |
| --- | --- | --- | --- | --- |
| 1 | `pr1-backend-entries-capabilities` | passed | `sha256:ead8b20b8fc4433d9bf087a091fdcd23d66f65df44667a3cf3b8ab637d3ab43c` | Strict TDD evidence recorded; tasks 1.1-1.9 marked complete; focused Vitest passed 5 files and 28 tests. |
| 2 | `unit2-frontend-foundation` | passed | `sha256:504f490462a1d140141508c6eba67f3c0983d8542e8418256a477ab9e28f1f9f` | Strict TDD evidence recorded; tasks 2.1-2.14 marked complete; focused Vitest passed 7 files and 13 tests. |
| 3 | `unit3-frontend-ui` | interrupted | N/A | Tasks 3.1-3.11 and focused Vitest were green, but Playwright was blocked by E2E database setup. |
| 4 | `unit3-e2e-verification` | interrupted | N/A | Playwright was blocked by `/auth/me` capability-schema rejection. |
| 5 | `auth-schema-e2e-unblock` | passed | `sha256:d120cb7dc80f89be92ce25c44f3df1bb36442f6b867055477e4bcf0eec6d84df` | Auth schema and E2E database URL blockers were fixed; Playwright empty-list scenario passed. |
| 7 | `final-verification` | failed | `sha256:1dc05272896a47362f7e615b5c26d1282f2def68c2dd74886ff35d4796c75415` | Focused tests passed, but changed-file typecheck errors, missing apply-progress, and overclaimed E2E task evidence failed verification. |

## TDD Cycle Evidence

The original RED timing cannot be independently replayed during this remediation. Rows below use the native attempt ledger and task artifact as historical evidence where available, and mark the remediation replay separately.

| Tasks | RED evidence | GREEN evidence | REFACTOR / replay evidence | Status |
| --- | --- | --- | --- | --- |
| 1.1-1.9 | Historical native attempt 1 recorded strict TDD evidence for capability union, scoped capability resolution, list entries use case, and router tests before implementation. | Attempt 1 passed with evidence `sha256:ead8b20b8fc4433d9bf087a091fdcd23d66f65df44667a3cf3b8ab637d3ab43c`; current replay passed 5 API files / 28 tests. | Current remediation replay: `pnpm --filter api exec vitest run ...` exited 0 on 2026-08-21. | Complete |
| 2.1-2.14 | Historical native attempt 2 recorded strict TDD evidence for HttpError code propagation, auth predicate, DTO/action predicates, API adapter, query invalidation, draft store, and friendly errors. | Attempt 2 passed with evidence `sha256:504f490462a1d140141508c6eba67f3c0983d8542e8418256a477ab9e28f1f9f`; current replay passed the relevant web foundation tests. | Current remediation replay included `http-client.test.ts`, `create-hr-timesheets-api.test.ts`, query/store/domain tests and exited 0. | Complete |
| 3.1-3.10 | Historical native attempt 3 recorded RED tasks for list/detail/editor/sidebar/routes before GREEN UI implementation, but the attempt was interrupted before E2E completion. | Current replay passed page/component/sidebar/app route tests as part of the 12-file web Vitest command. | Current remediation fixed changed-file type errors in the detail page and tests; web typecheck exited 0. | Complete |
| 3.11-3.12 | Historical tasks previously overclaimed self-submit, manager-approve, reject-reason, and out-of-scope E2E scenarios. Remediation corrected this evidence to the actually authorized empty-list Playwright scenario instead of fabricating RED timing. | Current Playwright replay `pnpm exec playwright test e2e/timesheets.spec.ts --reporter=line` exited 0 with 1 passed scenario: authorized user opens the timesheets empty-list route. | Task evidence now matches implemented `e2e/timesheets.spec.ts`; broader workflow E2E coverage remains deferred. | Complete for authorized empty-list scope |
| Verify remediation | RED is the failed verify report `sha256:1dc05272896a47362f7e615b5c26d1282f2def68c2dd74886ff35d4796c75415`. | Changed-file type errors were removed; focused Vitest and Playwright replay passed. | Combined typecheck still exits 2 only on known unrelated API baseline files; web typecheck exits 0. | Complete |

## Work Unit Evidence

| Evidence | Value |
| --- | --- |
| Focused test command and exact result | `pnpm --filter api exec vitest run ... && pnpm --filter web exec vitest run ...` exited 0; API 5 files / 28 tests passed; web 12 files / 22 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec playwright test e2e/timesheets.spec.ts --reporter=line` exited 0; 1 authorized empty-list Timesheets scenario passed. Teardown still logged PostgreSQL `57P01` after the pass. |
| Typecheck command and exact result | `pnpm --filter web typecheck` exited 0. `pnpm --filter api typecheck` and the combined `pnpm --filter api typecheck && pnpm --filter web typecheck` exited 2 on unrelated API baseline files only: identity register, node-management invitation, and org-hierarchy audit/dependency-count issues. No changed-file type errors remain. |
| Rollback boundary | Revert the remediation edits in `apps/api/src/features/items/presentation/item.route.test.ts`, `apps/web/src/shared/lib/http/http-client.test.ts`, `apps/web/src/features/hr-timesheets/infrastructure/create-hr-timesheets-api.test.ts`, `apps/web/src/features/hr-timesheets/presentation/pages/timesheet-period-detail.tsx`, `openspec/changes/frontend-hr-timesheets/tasks.md`, and this file. |

## Remediation Notes

- Fixed the widened `AuthCapability` incompatibility in `item.route.test.ts` by accepting the full union and returning a complete `Item` shape.
- Fixed Vitest type assertions by removing unsupported generic arguments from `toMatchObject`.
- Fixed `TimesheetPeriodDetailPage` by guarding missing period data before deriving actions and by omitting `apiBaseUrl` when it is undefined under `exactOptionalPropertyTypes`.
- Corrected tasks 3.11/3.12 to match the implemented and authorized Playwright empty-list scenario instead of claiming workflow scenarios that do not exist in `e2e/timesheets.spec.ts`.

## Remaining Risks

- Broader workflow E2E coverage for self-submit, manager approval, reject reason, and out-of-scope detail remains a follow-up, not evidence for this change.
- API typecheck still fails on known unrelated repository baseline files outside this remediation scope.
