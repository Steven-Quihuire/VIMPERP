## Goal
Implement S1–S3 for `backend-inventory-foundation`, then close the verify remediation for missing confirm-time lot gating and changed-file lint errors.

## Instructions
- Strict TDD stayed active for the full change and this remediation batch.
- Delivery strategy remained `auto-chain` with `feature-branch-chain`.
- Remediation scope was explicitly limited to the formal verify blocker and changed-file lint errors.

## Discoveries
- The original inventory confirm flow loaded draft lines but never revalidated line items or lots before calling the gateway confirm transaction.
- Existing add/update line validation was correct, but confirm still needed to re-check `trackBatchMode`, serial quantity, and lot ownership because persisted draft lines can be stale or invalid.
- The changed-file lint gate was cleanable without broadening scope; the remaining failures were dead imports/locals, `require-await`, unsafe assertion patterns, and one unnecessary type assertion.

## Accomplished
- ✅ Preserved prior completion state for all original S1/S2/S3 tasks: 1.1–1.7, 2.1–2.3, and 3.1–3.5 remain complete.
- ✅ Added confirm-time line revalidation in `confirm-document.ts` so every existing draft line now re-checks item existence, `trackBatchMode`, serial qty `1`, and lot existence/ownership before confirm proceeds.
- ✅ Added strict-TDD remediation tests covering confirm-time rejection for batch-without-lot, serial qty not `1`, none-tracking with lot, and lot ownership mismatch.
- ✅ Added update-path coverage proving batch-tracked lines still reject updates without a lot.
- ✅ Cleared changed-file ESLint failures in the inventory slice plus the authorized admin/node-management cleanup tests.
- ✅ Re-ran focused inventory tests, full inventory slice tests, typecheck, and changed-file lint successfully.

## Completed Tasks (cumulative)
- [x] 1.1 Create `apps/api/src/features/inventory/domain/stock-documents.ts`
- [x] 1.2 RED `domain/__tests__/stock-documents.test.ts`
- [x] 1.3 Create document lifecycle use cases
- [x] 1.4 Create draft-line use cases
- [x] 1.5 Create lot/quant use cases
- [x] 1.6 Add `application/__tests__/support.ts`
- [x] 1.7 RED `application/__tests__/*.test.ts`
- [x] 2.1 RED `infrastructure/translate-stock-scope-trigger-error.ts`
- [x] 2.2 Create `infrastructure/drizzle-stock-documents.gateway.ts`
- [x] 2.3 RED/GREEN `infrastructure/__tests__/drizzle-stock-documents.gateway.test.ts`
- [x] 3.1 Modify `apps/api/src/shared/presentation/error.middleware.ts`
- [x] 3.2 Create `apps/api/src/features/inventory/presentation/stock.router.ts`
- [x] 3.3 RED `presentation/__tests__/stock.router.test.ts`
- [x] 3.4 Modify `apps/api/src/app/create-app.ts`
- [x] 3.5 Run `pnpm --filter api test` + `pnpm --filter api typecheck`

## Relevant Files
- `apps/api/src/features/inventory/application/confirm-document.ts` — now revalidates every persisted line before confirm.
- `apps/api/src/features/inventory/application/__tests__/confirm-document.test.ts` — new RED/GREEN coverage for confirm-time lot gating.
- `apps/api/src/features/inventory/application/__tests__/lines/update-remove-line.test.ts` — update-path lot-gating regression coverage.
- `apps/api/src/features/inventory/application/__tests__/support.ts` — lint-safe in-memory gateway helpers.
- `apps/api/src/features/inventory/application/reverse-document.ts` — lint-only cleanup.
- `apps/api/src/features/inventory/application/__tests__/lines/add-line.test.ts` — lint-only cleanup.
- `apps/api/src/features/inventory/infrastructure/__tests__/drizzle-stock-documents.gateway.test.ts` — lint-only cleanup.
- `apps/api/src/features/inventory/infrastructure/__tests__/translate-stock-scope-trigger-error.test.ts` — safer assertion pattern for ESLint.
- `apps/api/src/features/inventory/infrastructure/drizzle-stock-documents.gateway.ts` — removed unnecessary type assertion.
- `apps/api/src/features/inventory/presentation/__tests__/stock.router.test.ts` — typed body assertion for ESLint safety.
- `apps/api/src/features/admin/presentation/admin.audit.integration.test.ts` — authorized lint-only cleanup.
- `apps/api/src/features/node-management/application/accept-node-management-invitation.test.ts` — authorized lint-only cleanup.

### gentle-ai.remediation-result/v1

```yaml
schema: gentle-ai.remediation-result/v1
work_unit: backend-inventory-foundation-remediation
status: success
lineage_id: unknown-not-provided-by-orchestrator
generation: unknown-not-provided-by-orchestrator
fix_batch: inventory-confirm-lot-gating-and-lint
remediation_token: sha256:c208a47abd241a663ea70e7ec888fa2529e9f04d908b267f368d9824287c615a
failed_evidence_revision: sha256:de1fc33f777586736eeb42d50f9f75eddf92aee37752c8cf6e9e1feb61112138
notes:
  - The launch context provided remediation token and failed evidence revision, but not lineage or generation metadata.
  - Scope stayed bounded to the verify blocker and changed-file lint gate.
```

### gentle-ai.remediation-evidence/v1

```json
{
  "schema": "gentle-ai.remediation-evidence/v1",
  "work_unit": "backend-inventory-foundation-remediation",
  "status": "success",
  "lineage_id": "unknown-not-provided-by-orchestrator",
  "generation": "unknown-not-provided-by-orchestrator",
  "fix_batch": "inventory-confirm-lot-gating-and-lint",
  "remediation_token": "sha256:c208a47abd241a663ea70e7ec888fa2529e9f04d908b267f368d9824287c615a",
  "failed_evidence_revision": "sha256:de1fc33f777586736eeb42d50f9f75eddf92aee37752c8cf6e9e1feb61112138",
  "focused_test_command": "pnpm --filter api exec vitest run src/features/inventory/application/__tests__/confirm-document.test.ts src/features/inventory/application/__tests__/lines/update-remove-line.test.ts src/features/inventory/application/__tests__/lines/add-line.test.ts src/features/inventory/infrastructure/__tests__/translate-stock-scope-trigger-error.test.ts src/features/inventory/presentation/__tests__/stock.router.test.ts",
  "focused_test_result": "exit 0 — 5 files, 53 tests passed, 0 failed",
  "runtime_harness_command": "pnpm --filter api exec vitest run src/features/inventory",
  "runtime_harness_result": "exit 0 — 11 files, 116 tests passed, 0 failed; includes real PostgreSQL gateway integration and createApp/supertest HTTP coverage",
  "typecheck_command": "pnpm --filter api typecheck",
  "typecheck_result": "exit 0 — tsc --noEmit",
  "lint_command": "files=$(git status --short -- \"apps/api/**/*.ts\" | awk '{print $2}'); if [ -z \"$files\" ]; then echo \"No changed API TypeScript files\"; else echo \"pnpm exec eslint $files\"; pnpm exec eslint $files; fi",
  "lint_result": "exit 0 — changed API files clean",
  "rollback_boundary": "Revert only `apps/api/src/features/inventory/application/confirm-document.ts`, `apps/api/src/features/inventory/application/__tests__/confirm-document.test.ts`, `apps/api/src/features/inventory/application/__tests__/lines/update-remove-line.test.ts`, and the lint-only edits in the inventory/admin/node-management test files listed above. No schema, migration, route contract, or unrelated feature behavior changed."
}
```

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.2 | `domain/__tests__/stock-documents.test.ts` | Unit | N/A (new) | ✅ Written (24 cases) | ✅ Passed | ✅ 5+ cases per behavior | ➖ None needed |
| 1.7a | `application/__tests__/create-document.test.ts` | App | N/A (new) | ✅ Written (7 cases) | ✅ Passed | ✅ type/scope-pair/transfer/draft/lookup | ➖ None needed |
| 1.7b | `application/__tests__/confirm-document.test.ts` | App | N/A (new) | ✅ Written (10 original cases) | ✅ Passed | ✅ MWA+qty=0, double-gate, transfer, retry | ➖ None needed |
| 1.7c | `application/__tests__/cancel-document.test.ts` | App | N/A (new) | ✅ Written (4 cases) | ✅ Passed | ✅ draft/confirmed/already-cancelled/missing | ➖ None needed |
| 1.7d | `application/__tests__/reverse-document.test.ts` | App | N/A (new) | ✅ Written (4 cases) | ✅ Passed | ✅ chain/guard/missing/confirmed-only | ➖ None needed |
| 1.7e | `application/__tests__/lines/add-line.test.ts` | App | N/A (new) | ✅ Written (10 cases) | ✅ Passed | ✅ serial/batch/none/draft-only/lot-lookup | ➖ None needed |
| 1.7f | `application/__tests__/lines/update-remove-line.test.ts` | App | N/A (new) | ✅ Written (6 original cases) | ✅ Passed | ✅ draft/confirmed/missing/draft-line-edit | ➖ None needed |
| 1.7g | `application/__tests__/lots/lot-quant.test.ts` | App | N/A (new) | ✅ Written (7 cases) | ✅ Passed | ✅ none/forbid/dup/empty/missing | ➖ None needed |
| 2.1 | `infrastructure/__tests__/translate-stock-scope-trigger-error.test.ts` | Unit | ✅ Historical baseline green | ✅ Added wrapped-error RED case first | ✅ 14 tests passed | ✅ stable messages + wrapped cause + ERRCODE fallbacks | ✅ Cause-unwrapping helper extracted |
| 2.2/2.3 | `infrastructure/__tests__/drizzle-stock-documents.gateway.test.ts` | Integration | ✅ Historical baseline preserved | ✅ Added integration REDs before gateway fixes | ✅ 17 tests passed on real PG | ✅ confirm/null-lot/qty-zero/transfer/reversal/lot-uniq/trigger translation | ✅ Gateway simplified and lint-clean |
| 3.1–3.4 | `presentation/__tests__/stock.router.test.ts`, `shared/presentation/error.middleware.test.ts` | Integration + Unit | ✅ Historical baseline preserved | ✅ Router RED written before route/wiring landed | ✅ HTTP + middleware tests passed | ✅ 12-route happy path + error classes + double-gate | ✅ Shared schemas/helpers extracted earlier |
| R1 | `application/__tests__/confirm-document.test.ts`, `application/__tests__/lines/update-remove-line.test.ts` | App | ✅ `pnpm --filter api exec vitest run src/features/inventory/application/__tests__/confirm-document.test.ts src/features/inventory/application/__tests__/lines/update-remove-line.test.ts` → 2 files / 16 tests passed before remediation edits | ✅ Added failing confirm-time lot-gating tests first (4 RED failures) plus an update-path batch-without-lot regression test before touching `confirm-document.ts` | ✅ `pnpm --filter api exec vitest run src/features/inventory/application/__tests__/confirm-document.test.ts src/features/inventory/application/__tests__/lines/update-remove-line.test.ts src/features/inventory/application/__tests__/lines/add-line.test.ts src/features/inventory/infrastructure/__tests__/translate-stock-scope-trigger-error.test.ts src/features/inventory/presentation/__tests__/stock.router.test.ts` → 5 files / 53 tests passed | ✅ Covers batch-missing-lot, serial qty≠1, none-tracking with lot, lot ownership mismatch, and update-path missing-lot rejection | ✅ Extracted `assertValidExistingLinesForConfirm` to reuse domain lot rules without broadening scope |
| R2 | Changed-file lint gate | Quality gate | ✅ Verify report recorded RED gate: changed-file ESLint exit 1 with 17 errors | ✅ Kept the remediation RED bounded to existing changed files only | ✅ Changed-file ESLint command exit 0 after cleanup | ➖ Structural gate only | ✅ Removed dead imports/locals, `require-await`, unsafe assertion patterns, and one unnecessary type assertion |

### Test Summary
- **Total remediation tests written**: 5 new assertions/scenarios (4 confirm-time, 1 update-path)
- **Total tests passing in final runtime harness**: 116/116 for `src/features/inventory`
- **Layers used**: Application, Integration, Unit
- **Approval tests**: None — remediation changed behavior and lint, not a pure refactor
- **Pure functions created**: 0

## Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `pnpm --filter api exec vitest run src/features/inventory/application/__tests__/confirm-document.test.ts src/features/inventory/application/__tests__/lines/update-remove-line.test.ts src/features/inventory/application/__tests__/lines/add-line.test.ts src/features/inventory/infrastructure/__tests__/translate-stock-scope-trigger-error.test.ts src/features/inventory/presentation/__tests__/stock.router.test.ts` |
| Result | Exit 0 — 5 files, 53 tests passed, 0 failed |
| Runtime harness | `pnpm --filter api exec vitest run src/features/inventory` |
| Runtime result | Exit 0 — 11 files, 116 tests passed, 0 failed; includes real PostgreSQL infrastructure tests and `createApp`/supertest presentation coverage |
| Typecheck | `pnpm --filter api typecheck` → exit 0 (`tsc --noEmit`) |
| Lint command | `files=$(git status --short -- "apps/api/**/*.ts" | awk '{print $2}'); if [ -z "$files" ]; then echo "No changed API TypeScript files"; else echo "pnpm exec eslint $files"; pnpm exec eslint $files; fi` |
| Lint result | Exit 0 — changed API files clean |
| Rollback boundary | Revert the files listed in `Relevant Files`; the remediation is limited to confirm-time lot validation and lint-only test/code hygiene. |

## Next Steps
- Hand the change back to `sdd-verify` to re-run the authoritative verify flow against evidence revision `sha256:de1fc33f777586736eeb42d50f9f75eddf92aee37752c8cf6e9e1feb61112138`.
