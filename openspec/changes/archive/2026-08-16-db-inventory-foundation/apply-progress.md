```yaml
schema: gentle-ai.remediation-result/v1
change: db-inventory-foundation
mode: strict-tdd
status: completed
fix_batch: inventory-verify-critical-runtime-coverage
failed_evidence_revision: sha256:81f239ae6247e7c473cf8a49928590d7d23a287269188947dbd798a1a43b97a6
remediation_token: sha256:77c4d73cd6cd29a2f6ce47d53a958a3b59945eff6af261bc32ba95e8084a58d6
```

```json
{
  "schema": "gentle-ai.remediation-evidence/v1",
  "change": "db-inventory-foundation",
  "mode": "strict-tdd",
  "fix_batch": "inventory-verify-critical-runtime-coverage",
  "failed_evidence_revision": "sha256:81f239ae6247e7c473cf8a49928590d7d23a287269188947dbd798a1a43b97a6",
  "remediation_token": "sha256:77c4d73cd6cd29a2f6ce47d53a958a3b59945eff6af261bc32ba95e8084a58d6",
  "scope": [
    "apps/api/src/db/migrations/__tests__/migration-0027-inventory-foundation.test.ts",
    "openspec/changes/db-inventory-foundation/design.md",
    "openspec/changes/db-inventory-foundation/apply-progress.md"
  ]
}
```

## Completed Tasks
- [x] 3.1 Create `migration-0027-inventory-foundation.test.ts`
- [x] 3.2 `pnpm --filter api test migration-0027-inventory-foundation`
- [x] 4.2 Fresh DB `pnpm --filter api db:migrate` confirmation for `stock_quants_company_item_scope_lot_uk` and scope trigger functions
- [x] 5.1 Update `design.md` with the Phase 1.2 `NULLS NOT DISTINCT` evaluation result

## Remaining Tasks
- [ ] 4.1 Full `pnpm --filter api test`, `pnpm --filter api typecheck`, `pnpm --filter api lint` — typecheck baseline remains red outside inventory scope

## Remediation Scope
- Add real PostgreSQL runtime coverage for valid `transfer`, `adjustment`, and `loss` document writes.
- Add real PostgreSQL runtime coverage rejecting reversal rows unless the reversal document is `confirmed`.
- Normalize the design prose for `reversal_of_id` to `uuid`.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Verify remediation | `apps/api/src/db/migrations/__tests__/migration-0027-inventory-foundation.test.ts` | Integration (real PostgreSQL) | ✅ `pnpm --filter api test migration-0027-inventory-foundation` → 3/3 passing before edits | ✅ Added the new runtime assertions before touching design/apply-progress artifacts; the new coverage targeted previously unverified transfer/adjustment/loss + reversal behavior | ✅ `pnpm --filter api test migration-0027-inventory-foundation` → 1 file / 5 tests passing | ✅ Added distinct positive flow coverage for three document types plus a separate negative reversal case | ➖ No production refactor required; behavior already existed and only lacked runtime proof |

## Work Unit Evidence
| Evidence | Required value |
| --- | --- |
| Focused test command and exact result | `pnpm --filter api test migration-0027-inventory-foundation` → PASS, 1 file / 5 tests passing |
| Runtime harness command/scenario and exact result | `pnpm --filter api test migration-0027-inventory-foundation` against temporary PostgreSQL databases created by `createMigrationTestDatabase` → PASS; valid `transfer`, `adjustment`, `loss`, and invalid draft-reversal scenarios executed against migration `0027_inventory_foundation.sql` |
| Rollback boundary | Revert `apps/api/src/db/migrations/__tests__/migration-0027-inventory-foundation.test.ts`, `openspec/changes/db-inventory-foundation/design.md`, and this `apply-progress.md` file without touching schema or migration SQL |

## Verification
- `pnpm --filter api test migration-0027-inventory-foundation` ✅ (1 file / 5 tests)
- `pnpm --filter api test` ✅ (82 files / 409 tests)
- `pnpm --filter api lint` ✅
- `pnpm --filter api typecheck` ❌ known unrelated 7-file baseline outside inventory scope

## Notes
- The remediation fix is intentionally limited to verification criticals only; no schema, migration SQL, or permission logic changed.
