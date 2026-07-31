# Archive Report: item-catalog

| Field | Value |
|---|---|
| Change | `item-catalog` |
| Project | `vimcore` |
| Mode | hybrid (Engram + OpenSpec files) |
| Strict TDD | active |
| Archive date | 2026-07-31 |
| Archived folder | `openspec/changes/archive/2026-07-31-item-catalog/` |
| New main spec location | `openspec/specs/item-catalog/spec.md` |
| Final verdict | **PASS WITH WARNINGS** (user/orchestrator explicit acceptance) |
| Review gate | **ALLOWED via `disabled/unmanaged` relaxation** — user explicitly disabled review mode for this repo (see Decision Log) |
| Branches shipped | 4 local, none merged to `master` |
| Task reconciliation | Performed (see Task Completion Gate) |

## Change Outcome

The `item-catalog` SDD cycle is **COMPLETE**. The new `item-catalog` capability is now part of the source of truth at `openspec/specs/item-catalog/spec.md`. The change folder is archived; all artifacts preserved as audit trail.

The change delivers the first ERP business module: a backend-first, multi-tenant item catalog (products and services) with company-scoped categories, RBAC, audit emission, and forward-compatible inventory metadata. USD-only by explicit assumption.

## Specs Synced

| Domain | Action | Details |
|---|---|---|
| `item-catalog` | **Created (new capability)** | 9 requirements, 18 scenarios copied verbatim from `openspec/changes/item-catalog/specs/item-catalog/spec.md` (no prior main spec existed — this is a new capability, not a delta) |

## Source of Truth Updated

`openspec/specs/item-catalog/spec.md` is now the canonical spec for the `item-catalog` capability. Future changes that touch item/category behavior should delta-merge against this file.

## PR Slices Delivered

Four chained PR slices per `auto-chain` / `stacked-to-main` delivery strategy (forecasted `400-line budget risk: High`, chained PRs honored).

| PR | Branch | Slice | RED commit | GREEN commit | Status |
|---|---|---|---|---|---|
| 1 | `pr-1/item-catalog-schema` | schema + 0006 migration + migration test | `bb760ba` | `5cc7a1b` | merged into chain |
| 1 (fix) | `pr-1/item-catalog-schema` | pre-existing lint + admin test assertion repair | — | `2c00b05` | repo fix |
| 2 | `pr-2/item-catalog-domain` | domain ports + Drizzle gateway + gateway test | `608c927` | `ef67432` | merged into chain |
| 3 | `pr-3/item-catalog-usecases` | application use cases + unit tests | `06ab030` | `ce4e9c8` | merged into chain |
| 4 | `pr-4/item-catalog-router` | presentation + wiring + route test | `56a351c` | `f12fbe9` | merged into chain (current branch at archive) |

**All 4 slices merged through chain. 9 commits total on the `pr-4/item-catalog-router` lineage (RED/GREEN per slice + 1 repo-fix).** Per `sdd/item-catalog/apply-progress` (observation #221), each slice ran strict TDD with a safety-net command for modified-file precedents before implementation.

## Branch State at Archive Close

- **No GitHub remote configured** — all work is local-only.
- **4 feature branches exist locally**, none merged to `master`:
  - `pr-1/item-catalog-schema`
  - `pr-2/item-catalog-domain`
  - `pr-3/item-catalog-usecases`
  - `pr-4/item-catalog-router` ← currently checked out
- Master is one commit behind the chain (`513fa71` was the last `chore:` archive of the observability-audit-provisioning change).
- **Next action in the local workflow**: locally merge or rebase the four PR branches into `master` before starting the next ERP module. This is an OUT-OF-ARCHIVE follow-up, not an archive prerequisite.

## Final Test Counts (per verify-report observation #228, written 2026-07-31 09:55:39)

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter api typecheck` | 0 | `tsc --noEmit` clean |
| `pnpm --filter api lint` | 0 | `eslint src --max-warnings=0` clean |
| `pnpm --filter api test` | 0 | **29 files / 123 tests** all pass |
| `pnpm typecheck` (root, turbo) | 0 | 2/2 successful tasks |
| `drizzle-kit migrate` (real Postgres) | 0 | 0006 migration applied |

**Spec compliance: 9/9 requirements, 18/18 scenarios with runtime-passed covering tests.**

## Spec Compliance Summary

| Req | Title | Compliance |
|---|---|---|
| R1 | Item creation | PASS (2/2 scenarios) |
| R2 | Item listing | PASS (2/2 scenarios) |
| R3 | Item detail | PASS (2/2 scenarios) |
| R4 | Item update | PASS (2/2 scenarios) |
| R5 | Item soft delete | PASS (2/2 scenarios) |
| R6 | Category management | PASS (2/2 scenarios; list-categories route deferred — see below) |
| R7 | Multi-tenant isolation | PASS (2/2 scenarios) |
| R8 | Audit emission | PASS WITH WARNING (2/2 scenarios) |
| R9 | Currency constraint (USD only) | PASS (2/2 scenarios) |

## Issues Carried Forward (Coverage Debt — Accepted as Non-Blocking)

Two WARNINGs from `verify-report` (observation #228) were explicitly accepted by the user/orchestrator. They are recorded here for future traceability; they are NOT CRITICAL and did not block archive.

### WARNING 1 — R8 audit emission test depth

R8 audit emission is covered by `drizzle-item.gateway.test.ts` using a **fake transaction capture**. The test asserts the `auditEventsTable` insert shape for create/update/delete (including `item.created`, `item.updated`, `item.deleted`), but no runtime test currently asserts an actual row inserted into the real Postgres `audit_events` table during an item mutation.

- **Risk level**: low-to-medium
- **Source**: `verify-report` observation #228, table row "Audit event emission"
- **Mitigation if hardening desired**: add a real Postgres integration test for `audit_events` insertion. Tracked as a SUGGESTION in the verify report.

### WARNING 2 — task 3.6 planning drift (RECONCILED at archive time)

`tasks.md` originally bundled `list-categories` (deferred) with `create-category` + `update-category` (spec-required, runtime-passing) into a single checkbox `3.6`. The spec-required parts of 3.6 were implemented and covered by tests; `list-categories` is a conscious scope deferral.

**Reconciliation performed at archive time** (orchestrator explicit instruction, with apply-progress + verify-report proof of completion for the spec-required parts):

- `[ ] 3.6` → `[x] 3.6` (create-category + update-category with cycle prevention — spec-required, runtime-passing per `sdd/item-catalog/apply-progress` #221 PR3 and `sdd/item-catalog/verify-report` #228 R6 rows).
- New separate line `[ ] 3.6.d list-categories {test,}.ts — R6 list tree` marked **DEFERRED** with note pointing to verify-report design coherence + apply-progress deviations.

This is an **exceptional archive-time repair** per the sdd-archive skill's Task Completion Gate exception path. It is NOT normal task completion ownership — `sdd-archive` does not normally tick boxes; `sdd-apply` does. The orchestrator's launch prompt authorized this single repair with full proof. The archived `tasks.md` carries both the reconciled `3.6` and the explicit `3.6.d` deferral marker so future readers can see both what was done and what was consciously left out.

## Conscious Deferrals (NOT Gaps)

- **`GET /item-categories` (list tree)** — deferred per design-deviation note in `sdd/item-catalog/apply-progress` (observation #221, PR4 "Deviations" section) and design-coherence SUGGESTION in `verify-report` (observation #228). Not required by any spec scenario (R6 covers create + cycle prevention only). Conscious scope decision; future work item, not an archive blocker.
- **`GET /item-categories/:id`** — added in PR4 as the eighth route (per `apply-progress` PR4 "Files Changed" note), not deferred.

## Decision Log — Review Gate Path

The Native Review Receipt Gate initially blocked this archive because review receipts were OFF for this repo. The user **explicitly chose** to disable review mode rather than enable it for this change. The orchestrator executed:

```
gentle-ai review mode disable --cwd /home/linux/Vimcore --scope clone
```

`gentle-ai review mode status` reports: `receipt-driven development: off (decided by clone_local)`, `clone-local: off`.

Under the sdd-archive skill's Native Review Receipt Gate, `reviewGate.delivery: disabled/unmanaged` is the valid relaxation when the kill switch is OFF and no review governs the change. The gate therefore permitted archive. **The receipt gate is satisfied via the disabled/unmanaged relaxation; it is NOT satisfied via an explicit `allow` receipt — the user explicitly chose not to generate one for this change.**

This decision is recorded here for future traceability. Re-enabling review mode revalidates from the current state and will require receipts for subsequent changes.

## Risks (Forward-Looking)

1. **Review mode is disabled at the repo level** — future changes will not be receipt-gated until review is re-enabled. Re-enable if formal review discipline is required.
2. **Four local PR branches are not merged to `master`** — the implementation lives on chained branches. Local merge/rebase is required before the next ERP module starts to avoid drift.
3. **R8 audit emission tested at fake-tx layer only** — durability drift in real Postgres would not be caught by current tests. Add a real Postgres integration test if audit durability becomes critical.
4. **`list-categories` route deferred** — design intent unfulfilled at the API surface. Track as future work if category listing becomes a product requirement.
5. **No GitHub remote** — no remote review/PR workflow; review mode disable was a repo-level decision consistent with local-only delivery.

## Engram Observation IDs (Traceability)

| Artifact | Observation ID | Sync ID | Created |
|---|---|---|---|
| `sdd/item-catalog/proposal` | #215 | `obs-1d663d4c62b83534` | 2026-07-30 15:49:51 |
| `sdd/item-catalog/spec` | #216 | `obs-6a76fe0f2eca5dd6` | 2026-07-30 15:55:43 |
| `sdd/item-catalog/design` | #217 | `obs-a978595c51e45e60` | 2026-07-30 16:01:11 |
| `sdd/item-catalog/tasks` | #218 | `obs-2f1dc122fd0968bc` | 2026-07-30 16:04:18 |
| `sdd/item-catalog/apply-progress` | #221 | `obs-43c2d6df8746f087` | 2026-07-30 16:20:42 |
| `sdd/item-catalog/verify-report` | #228 | `obs-d7e8f424f81704a7` | 2026-07-31 09:55:39 |
| `sdd/item-catalog/archive-report` | (new — written by this archive) | (assigned at save) | 2026-07-31 |

## SDD Cycle Complete

The change has been fully planned, implemented (4 chained PR slices), verified (9/9 requirements, 18/18 scenarios runtime-passed; typecheck, lint, and migration all green), and archived. The new capability is now part of the source of truth at `openspec/specs/item-catalog/spec.md`.

Ready for the next change.
