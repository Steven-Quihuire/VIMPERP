# Archive Report: db-timesheets-foundation

Change: `db-timesheets-foundation`
Archived: 2026-08-16
Status: **Archived — PASS with warnings**

## Goal

Add the DB-only timesheets foundation: tenant-safe `timesheet_periods` and `time_entries`, custom date ranges with overlap prevention, approval snapshot storage, and additive `hr.timesheets.*` permission seeds.

## Summary of What Shipped

- Added the timesheets persistence foundation in the API database layer only.
- Shipped migration `0026_timesheets.sql` with `btree_gist`, enum creation, tenant-safe foreign keys, checks, indexes, and `timesheet_periods_no_overlap_excl`.
- Added migration/runtime proof for overlap rejection, adjacency acceptance, cross-company FK rejection, hours bounds, submitted persistence, approved persistence, and approved-pair rejection.
- Added additive permission catalog seeds `hr.timesheets.read|write|submit|approve` without widening scope into API, UI, or application layers.

## Final Verification State

- Native verification artifact `verify-report.md` is authoritative for close: verdict `pass`, blockers `0`, critical findings `0`, requirements `5/5`, scenarios `10/10`.
- The first verify attempt had CRITICAL findings, but the launch facts and the final verify artifact agree they were remediated in commit `56ec43c` and re-verified successfully.
- Final evidence at close:
  - `pnpm --filter api test migration-0026` → pass, 1 file / 4 tests
  - `pnpm --filter api test migration-journal` → pass, 1 file / 2 tests
  - `pnpm --filter api test` → pass, 79 files / 400 tests
  - `pnpm --filter api lint` → pass
  - `pnpm --filter api typecheck` → still fails only on the known unrelated 7-file baseline; warning only, not a timesheets blocker

## Spec Sync Summary

| Domain | Action | Details |
|--------|--------|---------|
| `hr-timesheets` | **Created** | 5 added requirements, 10 scenarios — copied from `openspec/changes/db-timesheets-foundation/specs/hr-timesheets/spec.md` to `openspec/specs/hr-timesheets/spec.md` because no canonical main spec existed yet. |

## Archive Contents

- `proposal.md` ✅
- `specs/hr-timesheets/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (12/12 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅ (verdict: `pass`)

## Source of Truth Updated

The following main spec now reflects the shipped behavior:

- `openspec/specs/hr-timesheets/spec.md` — new capability

Archived at: `openspec/changes/archive/2026-08-16-db-timesheets-foundation/`.

## Traceability

- OpenSpec artifacts read:
  - `openspec/changes/db-timesheets-foundation/proposal.md`
  - `openspec/changes/db-timesheets-foundation/specs/hr-timesheets/spec.md`
  - `openspec/changes/db-timesheets-foundation/design.md`
  - `openspec/changes/db-timesheets-foundation/tasks.md`
  - `openspec/changes/db-timesheets-foundation/apply-progress.md`
  - `openspec/changes/db-timesheets-foundation/verify-report.md`
- Engram observations read:
  - proposal `#1229`
  - spec `#1231`
  - design `#1233`
  - tasks `#1235`
  - apply-progress `#1237`
  - verify-report `#1245`
- Final-state commits supplied by the orchestrator: `f12d24d`, `d40a234`, `f41de1b`, `6e21197`, `30911f2`, `963213e`, `0725a42`, `56ec43c`, `48494b9`.

## Warnings Carried Forward

1. Repository typecheck is still not globally clean: the final verify artifact reports the known unrelated 7-file baseline as unchanged warning-only debt.
2. Engram tasks observation `#1235` still shows Phase 4.1 unchecked, but the repository `tasks.md`, `apply-progress.md`, final `verify-report.md`, and orchestrator final-state facts all agree the change closed at 12/12 complete. This archive records the final repository state and preserves the stale Engram observation ID for traceability.
3. Proposal success-criteria checkboxes remain unchecked in `proposal.md`; they are planning checkboxes, not implementation-task state, and do not block archive.

## Out of Scope (confirmed unchanged)

Routes/controllers/use cases, frontend, approval policy behavior changes, projects FK, overtime modeling, per-day aggregate caps, RLS, and audit-event writes remain outside this change.

## Final State

- `tasks.md` holds no unchecked implementation tasks in the archived change folder.
- `verify-report.md` closes with `pass`, 0 blockers, 0 critical findings, 5/5 requirements, and 10/10 scenarios compliant.
- Canonical spec `openspec/specs/hr-timesheets/spec.md` now exists and matches the archived delta.
- Only `db-timesheets-foundation` was archived; pending `db-inventory-foundation` remained untouched.
- The change folder moved to `openspec/changes/archive/2026-08-16-db-timesheets-foundation/`.

## SDD Cycle Complete

`db-timesheets-foundation` has been planned, specified, designed, implemented, verified, and archived.

## Key Learnings

1. Hybrid SDD archives can close cleanly even when an Engram tasks observation is stale, but the final archive report must explicitly preserve that mismatch and anchor final state in the repository artifacts plus final verification evidence.
2. For a brand-new capability with no canonical main spec, the archive sync is a mechanical copy into `openspec/specs/<domain>/spec.md`, and the empty `diff -r` output is the only valid proof that no bytes changed in transit.
3. A prior CRITICAL verify failure does not block archive once a later authoritative verify artifact records `pass` with zero critical findings and the remediation commits are identified.
