# Tasks: Timesheets DB Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 410–500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (schema + perms + journal tags) → PR 2 (migration + meta + test + verify + doc fix) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Timesheet schema + permission seeds in repo | PR 1 (timesheets) | `pnpm --filter api typecheck` | N/A — TS compile only | Revert schema.ts enum + 2 tables; revert 4 perm keys |
| 2 | Migration SQL + journal/snapshot + per-migration test + verify + doc fix | PR 2 (timesheets) | `pnpm --filter api test migration-0026-timesheets` | Local `pnpm --filter api test` runs real PG via `createMigrationTestDatabase` | Drop 0026_timesheets.sql + meta entries; perm keys already merged in PR 1 |

## Phase 1: Foundation (repo only)

- [x] 1.1 Add `timesheetStatusEnum`, `timesheetPeriodsTable`, `timeEntriesTable` to `apps/api/src/shared/infrastructure/db/schema.ts` per `openspec/changes/db-timesheets-foundation/design.md` Schema section.
- [x] 1.2 Append 4 `hr.timesheets.*` keys to `hrPermissionKeys` in `apps/api/src/features/roles-management/domain/permissions.ts`; leave `permissionCatalogSeeds` spread untouched.
- [x] 1.3 Add `0026_timesheets` to `expectedJournalTags` and `expectedSnapshotTags` in `apps/api/src/db/migrations/__tests__/migration-journal.test.ts`.
  - Deferred to PR 2: adding the tag now would make `migration-journal.test.ts` expect `0026_snapshot.json` and the 0026 journal entry before those artifacts exist.
- [x] 1.4 `pnpm --filter api typecheck` must pass; commit as `feat(db-timesheets): add timesheet tables, pair checks, hours bounds and permission seeds`.
  - Completed as commit `f12d24d` (4 files, 267 lines). Typecheck gate waived by user: failures are pre-existing in 8 unrelated files (org-hierarchy, identity, items, node-management — likely tied to stash `user-work-before-sdd-org-hierarchy`); full API test suite green (396/396).

## Phase 2: Migration file + meta

- [x] 2.1 Run `pnpm --filter api db:generate` to produce `0026_timesheets.sql` and `0026_snapshot.json`.
- [x] 2.2 Hand-edit `0026_timesheets.sql`: prepend `CREATE EXTENSION IF NOT EXISTS btree_gist;`; append `ALTER TABLE timesheet_periods ADD CONSTRAINT timesheet_periods_no_overlap_excl EXCLUDE USING gist (employee_assignment_id WITH =, daterange(period_start, period_end, '[)') WITH &&);`.
- [x] 2.3 Verify `meta/_journal.json` got `idx: 25, tag: '0026_timesheets', breakpoints: true`; commit as `feat(db-timesheets): add 0026 migration with btree_gist and overlap exclusion`.

## Phase 3: Per-migration test (strict TDD)

- [x] 3.1 Create `apps/api/src/db/migrations/__tests__/migration-0026-timesheets.test.ts`: two `it` blocks — (a) `applyMigrationsThrough(0025) → applyMigrationFile(0026)` asserts column order, `pg_extension` for `btree_gist`, enum labels; (b) seed company+user+employee+assignment+approval_policy and assert EXCLUDE rejects overlap, allows adjacent ranges, hours bounds CHECK rejects 0/24.01, submission-pair CHECK rejects partial write.
- [x] 3.2 `pnpm --filter api test migration-0026-timesheets` must pass; commit as `test(db-timesheets): cover 0026 columns, btree_gist, EXCLUDE, hour bounds and pair checks`.

## Phase 4: Verification

- [x] 4.1 Run full `pnpm --filter api test`, `pnpm --filter api typecheck`, `pnpm --filter api lint` — all must pass.
  - Completed after lint-debt cleanup commits `30911f2` and `963213e`: `pnpm --filter api lint` passes; `pnpm --filter api test` passes (79 files / 398 tests); typecheck still fails only in the known pre-existing 7-file set, with no new error files introduced.
- [x] 4.2 Apply on fresh DB via `pnpm --filter api db:migrate`; confirm `\d+ timesheet_periods` lists `timesheet_periods_no_overlap_excl`.

## Phase 5: Doc correction

- [x] 5.1 In `openspec/changes/db-timesheets-foundation/design.md` L186 (Migration / Rollout), correct the rollback rationale: inventory's `stock_quants_company_item_scope_lot_uk` is plain `btree … NULLS NOT DISTINCT`, not gist — reword cross-extension sharing note to mention `btree_gist` is shared via EXCLUDE only.
