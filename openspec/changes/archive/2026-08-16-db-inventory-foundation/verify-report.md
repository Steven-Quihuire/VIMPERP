```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9a9252fb07a8713b6e5cda275f12ea3e06881937f31fe6f799dd67c4bed454f6
verdict: pass
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 10/10
test_command: pnpm --filter api test
test_exit_code: 0
test_output_hash: sha256:fb787eac6db3b8488091c0b489cefd40a94f8cff1fad8ba66cc389fb14f9e902
build_command: pnpm --filter api lint
build_exit_code: 0
build_output_hash: sha256:5d34889c1e3b860978c69e5a6af0a5fb0b4079c8719c04e0a24d56302306dc05
```

## Verification Report

**Change**: db-inventory-foundation
**Version**: N/A
**Mode**: Strict TDD

### Canonical Verification Evidence
```text
focused_test_command=pnpm --filter api test migration-0027-inventory-foundation
focused_test_exit_code=0
focused_test_output_hash=sha256:92447b756ff837fa3c80b1c6494028f1dbc2a694631ec84862aabae0d438bc92
snapshot_guard_command=pnpm --filter api test migration-journal
snapshot_guard_exit_code=0
snapshot_guard_output_hash=sha256:9246c665c682219e4bcfe541aa807c4bf26add221348e33c4f532442a837931b
full_test_command=pnpm --filter api test
full_test_exit_code=0
full_test_output_hash=sha256:fb787eac6db3b8488091c0b489cefd40a94f8cff1fad8ba66cc389fb14f9e902
lint_command=pnpm --filter api lint
lint_exit_code=0
lint_output_hash=sha256:5d34889c1e3b860978c69e5a6af0a5fb0b4079c8719c04e0a24d56302306dc05
typecheck_command=pnpm --filter api typecheck
typecheck_exit_code=2
typecheck_output_hash=sha256:b38bcb63c2d240abe9a5495906388f430199dcfef383254c338cf82757f94312
typecheck_error_files=src/features/identity/application/register.test.ts,src/features/items/presentation/item.route.test.ts,src/features/node-management/application/accept-node-management-invitation.test.ts,src/features/org-hierarchy/application/delete-area.test.ts,src/features/org-hierarchy/application/hierarchy-parent-invariants.test.ts,src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts,src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts
apply_progress_file_present=true
apply_progress_has_tdd_cycle_evidence=true
spec_requirement_count=5
spec_scenario_count=10
head_commit=f66d658d164804a9619336ccc57bd40392d330b5
reverify_attempt_token=sha256:87070b98a2bfd5a0bab48affcef3192e1f111af29d6a0e5febaab6b25879547a
```

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 12 |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed (`pnpm --filter api lint`, exit 0, hash `sha256:5d34889c1e3b860978c69e5a6af0a5fb0b4079c8719c04e0a24d56302306dc05`)
```text
$ eslint src --max-warnings=0
```

**Tests**: ✅ 409 passed / 0 failed / 0 skipped (`pnpm --filter api test`, exit 0, hash `sha256:fb787eac6db3b8488091c0b489cefd40a94f8cff1fad8ba66cc389fb14f9e902`)
```text
Focused evidence: `pnpm --filter api test migration-0027-inventory-foundation` → 1 file / 5 tests passed, exit 0, hash `sha256:92447b756ff837fa3c80b1c6494028f1dbc2a694631ec84862aabae0d438bc92`.
Snapshot guard evidence: `pnpm --filter api test migration-journal` → 1 file / 2 tests passed, exit 0, hash `sha256:9246c665c682219e4bcfe541aa807c4bf26add221348e33c4f532442a837931b`.
Full suite evidence: `pnpm --filter api test` → 82 files / 409 tests passed.
Typecheck baseline check: `pnpm --filter api typecheck` → exit 2, hash `sha256:b38bcb63c2d240abe9a5495906388f430199dcfef383254c338cf82757f94312`, limited to the known unrelated 7-file baseline only; no inventory files appear in the error set.
Fresh-DB migrate evidence: `migration-journal.test.ts` passed via `pnpm exec drizzle-kit migrate --config drizzle.config.ts` against a temporary PostgreSQL database.
```

**Coverage**: ➖ Not available

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `openspec/changes/db-inventory-foundation/apply-progress.md` is present on disk and contains the strict-TDD RED/GREEN/Safety Net/Triangulate table for the remediation batch. |
| All tasks have tests | ✅ | The behavior-bearing slices remain covered by `schema.inventory.test.ts`, `permissions.inventory.test.ts`, `migration-journal.test.ts`, and `migration-0027-inventory-foundation.test.ts`. |
| RED confirmed (tests exist) | ✅ | All four change-related test files exist on disk, including the remediated `migration-0027-inventory-foundation.test.ts`. |
| GREEN confirmed (tests pass) | ✅ | The focused migration suite, journal suite, and full API suite all pass on current execution. |
| Triangulation adequate | ✅ | The migration suite now proves receipt, transfer, adjustment, and loss happy paths plus invalid shape, cross-tenant, negative-stock, scope mismatch, unique-index, and reversal rejection cases. |
| Safety Net for modified files | ✅ | The remediation apply-progress artifact records a pre-edit focused run (`3/3` passing) before the new runtime assertions were added. |

**TDD Compliance**: 6/6 strict checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 4 | 2 | Vitest |
| Integration | 7 | 2 | Vitest + PostgreSQL (`createMigrationTestDatabase`) |
| E2E | 0 | 0 | not installed |
| **Total** | **11** | **4** | |

---

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected in the requested verification commands.

---

### Assertion Quality
**Assertion quality**: ✅ All assertions verify real behavior

---

### Quality Metrics
**Linter**: ✅ No errors
**Type Checker**: ❌ 40 errors across the known pre-existing 7-file baseline only; no inventory files and no new error files appeared.

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Tenant-safe inventory foundations | Inventory relations stay in-tenant | `migration-0027-inventory-foundation.test.ts > adds inventory tables, enums, foreign keys, indexes, and scope triggers`; `migration-0027-inventory-foundation.test.ts > persists a valid lot, document, line, and quant happy path` | ✅ COMPLIANT |
| Tenant-safe inventory foundations | Cross-company references fail | `migration-0027-inventory-foundation.test.ts > rejects invalid scope shapes, tenant leaks, and impossible inventory states` | ✅ COMPLIANT |
| Document states, flow types, and reversal model | Valid document flow persists | `migration-0027-inventory-foundation.test.ts > persists a valid lot, document, line, and quant happy path`; `migration-0027-inventory-foundation.test.ts > accepts valid transfer, adjustment, and loss document writes` | ✅ COMPLIANT |
| Document states, flow types, and reversal model | Invalid type or reversal shape is rejected | `migration-0027-inventory-foundation.test.ts > rejects invalid scope shapes, tenant leaks, and impossible inventory states`; `migration-0027-inventory-foundation.test.ts > rejects reversal rows unless the reversal document is confirmed` | ✅ COMPLIANT |
| Restricted stock locations and lot gating | Allowed stock scopes persist | `migration-0027-inventory-foundation.test.ts > persists a valid lot, document, line, and quant happy path`; `migration-0027-inventory-foundation.test.ts > accepts valid transfer, adjustment, and loss document writes` | ✅ COMPLIANT |
| Restricted stock locations and lot gating | Disallowed scopes fail | `migration-0027-inventory-foundation.test.ts > rejects invalid scope shapes, tenant leaks, and impossible inventory states` | ✅ COMPLIANT |
| Non-negative quantities and valuation columns | Valid positive inventory persists | `migration-0027-inventory-foundation.test.ts > persists a valid lot, document, line, and quant happy path` | ✅ COMPLIANT |
| Non-negative quantities and valuation columns | Negative stock state is rejected | `migration-0027-inventory-foundation.test.ts > rejects invalid scope shapes, tenant leaks, and impossible inventory states` | ✅ COMPLIANT |
| Indexes, permission seeds, migration proof, and scope boundary | Migration tests prove inventory constraints | `migration-0027-inventory-foundation.test.ts > adds inventory tables, enums, foreign keys, indexes, and scope triggers`; `migration-0027-inventory-foundation.test.ts > rejects invalid scope shapes, tenant leaks, and impossible inventory states`; `migration-0027-inventory-foundation.test.ts > accepts valid transfer, adjustment, and loss document writes`; `migration-0027-inventory-foundation.test.ts > rejects reversal rows unless the reversal document is confirmed`; `migration-journal.test.ts > lets drizzle-kit migrate apply cleanly on a fresh local postgres database`; `schema.inventory.test.ts`; `permissions.inventory.test.ts` | ✅ COMPLIANT |
| Indexes, permission seeds, migration proof, and scope boundary | Change remains DB-only | Static review of `schema.ts`, `0027_inventory_foundation.sql`, migration metadata, permission seeds, migration tests, and SDD artifacts touched through commit `f66d658` | ✅ COMPLIANT |

**Compliance summary**: 10/10 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Tenant-safe lots, documents, lines, and quants are implemented with composite tenant FKs | ✅ Implemented | `schema.ts`, `0027_inventory_foundation.sql`, and migration metadata declare the four inventory tables plus composite tenant foreign keys for item, scope, lot, document, and reversal relations. |
| Document type/status enums, shape checks, and reversal constraint are present | ✅ Implemented | Schema and SQL both ship `stock_document_type`, `stock_document_status`, pair checks, type-shape checks, and `stock_documents_reversal_confirmed_chk`. |
| Scope-type boundary and NULLS-NOT-DISTINCT uniqueness are implemented in migration SQL and snapshot metadata | ✅ Implemented | `0027_inventory_foundation.sql` defines both trigger functions plus `stock_quants_company_item_scope_lot_uk ... NULLS NOT DISTINCT`; the metadata path is runtime-proven by `migration-journal.test.ts`. |
| Permission seeds are additive and exposed through company helpers | ✅ Implemented | `permissions.ts` appends the seven inventory permission keys and `permissions.inventory.test.ts` proves catalog/helper exposure. |
| Runtime proof covers the full document-flow matrix required by the spec | ✅ Implemented | The focused migration suite now runtime-proves valid `receipt`, `transfer`, `adjustment`, and `loss` writes plus draft-reversal rejection against real PostgreSQL. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Single `0027_inventory_foundation.sql` migration | ✅ Yes | All DDL, composite FKs, hand-written `NULLS NOT DISTINCT`, and triggers ship in one migration. |
| Hand-written `UNIQUE ... NULLS NOT DISTINCT` for `stock_quants` | ✅ Yes | Schema comments defer it to SQL, the migration emits it, and runtime introspection proves the index definition. |
| Trigger-enforced scope-type consistency | ✅ Yes | Both `stock_documents_scope_type_check_trg` and `stock_quants_scope_type_check_trg` exist in SQL and pass runtime verification. |
| Reversal pattern uses `reversal_of_id uuid` with confirmed-only semantics | ✅ Yes | `design.md` now states `stock_documents.reversal_of_id uuid NULL`, and the migration plus runtime reversal test enforce the same rule. |
| Additive inventory permission arrays | ✅ Yes | `inventoryStockPermissionKeys` and `inventoryDocumentsPermissionKeys` extend the existing inventory registry without replacing catalog keys. |

### Issues Found
**CRITICAL**: None.

**WARNING**:
- `pnpm --filter api typecheck` still exits 2 on the known pre-existing 7-file API baseline outside the inventory change.

**SUGGESTION**:
- Clear the unrelated API typecheck baseline before using strict-TDD verification as a global release gate, so future PASS verdicts do not carry unrelated noise.

### Verdict
PASS WITH WARNINGS
All five requirements and all ten scenarios are now runtime-proven or statically implemented as specified, including the previously missing `transfer` / `adjustment` / `loss` happy paths, draft-reversal rejection, and `reversal_of_id uuid` design normalization; only the known unrelated API typecheck baseline remains.
