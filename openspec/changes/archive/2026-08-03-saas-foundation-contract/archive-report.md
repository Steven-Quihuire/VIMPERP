# Archive Report: saas-foundation-contract

| Field | Value |
|---|---|
| Change | `saas-foundation-contract` |
| Project | `vimcore` |
| Mode | hybrid (Engram + OpenSpec files) |
| Strict TDD | active |
| Delivery strategy | `auto-chain` (feature-branch-chain) |
| Archive date | 2026-08-03 |
| Archived folder | `openspec/changes/archive/2026-08-03-saas-foundation-contract/` |
| Final verdict | **PASS WITH WARNINGS** (user/orchestrator explicit acceptance) |
| Review gate | **ALLOWED via `disabled/unmanaged` relaxation** — repo-level `gentle-ai review mode` kill switch is off; no review receipts were produced for this change. |
| Task reconciliation | Performed (Phase 4 checkboxes reconciled at archive time — see Task Completion Gate) |

## Change Outcome

The `saas-foundation-contract` SDD cycle is **COMPLETE**. The change delivered the SaaS core contract: explicit active tenant context, centralized capability-based authorization, idempotent company onboarding, minimal company lifecycle states, and a web blocked-company experience.

The new `company-lifecycle` capability was added to source of truth. Four existing capabilities (`identity-access`, `company-onboarding`, `item-catalog`, `item-catalog-web`) were modified to consume the new contract. The change folder is archived; all artifacts preserved as audit trail.

## Specs Synced

| Domain | Action | Details |
|---|---|---|
| `identity-access` | **Modified** | Replaced `Protected Access and Roles` requirement with capability-driven variant. Added new `Active Company Context` requirement (2 scenarios). |
| `company-onboarding` | **Modified** | Replaced `Tenant Structure and Ownership` requirement with active-binding variant. Added new `Idempotent Company Creation` requirement (2 scenarios). |
| `item-catalog` | **Modified** | Replaced `Item soft delete` and `Multi-tenant isolation` requirements to consume explicit active-company context and centralized capability gate. |
| `item-catalog-web` | **Modified** | Replaced `RBAC enforcement` requirement to derive from session capability contract. Added new `Active Company Entry Gate` requirement (2 scenarios). |
| `company-lifecycle` | **Created (new capability)** | 2 requirements, 4 scenarios copied verbatim from `openspec/changes/saas-foundation-contract/specs/company-lifecycle/spec.md`. |

## Source of Truth Updated

The following files now reflect the new SaaS contract:

- `openspec/specs/identity-access/spec.md` — capability-based authorization + active-company context
- `openspec/specs/company-onboarding/spec.md` — additional-company becomes active + idempotent replay
- `openspec/specs/item-catalog/spec.md` — explicit tenant context + capability-based delete
- `openspec/specs/item-catalog-web/spec.md` — capability contract + entry gate
- `openspec/specs/company-lifecycle/spec.md` — new capability

Future changes that touch tenant, capability, lifecycle, or onboarding behavior should delta-merge against these files.

## PR Slices Delivered

Three chained PR slices per `auto-chain` / `feature-branch-chain` delivery strategy (forecasted `400-line budget risk: High`, chained PRs honored). The 800-line review budget was exceeded on each slice; the maintainer accepted and committed each slice as `pass_with_warnings`.

| PR | Commit | Slice | Verify verdict |
|---|---|---|---|
| PR1 | `94a7627` | active company + session + switch contract (tasks 1.1–1.3) | PASS WITH WARNINGS (lint fixed in `ad666b6`) |
| PR2 | `d6305d8` | onboarding idempotency + item capability enforcement (tasks 2.1–2.5) | PASS WITH WARNINGS (coverage informational only; rerun after `ee3bbdc` blocker fixes) |
| PR3 | `20acafb` | web routing + blocked company UX (tasks 3.1–3.4) | Verified inline by orchestrator via full API + web suites (no separate sub-agent run) |

**Support commits**: `ad666b6` (PR1 lint fix), `ee3bbdc` (PR2 verify blockers cleared), `3de2216` (PR2 verify report docs), `a8dd510` (PR3 stale auth baseline test fix).

## Final Test Counts (per orchestrator's final-state facts, written at close 2026-08-03)

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter api test` | 0 | **31 files / 144 tests** all pass (requires PostgreSQL running for migration tests) |
| `pnpm --filter web test` | 0 | **15 files / 81 tests** all pass |
| `pnpm --filter api typecheck` | 0 | `tsc --noEmit` clean |
| `pnpm --filter web typecheck` | 0 | `tsc --noEmit` clean |

**Final-state evidence ranking applied per sdd-archive Final-State Authority**:

- Highest-ranked: explicit final-state facts in the orchestrator's launch prompt (full API 144/144, full web 81/81, both typechecks pass).
- Mid-ranked: persisted `apply-progress` (observation #353) per-PR focused test evidence and runtime harness results.
- Lowest-ranked: `verify-report.pr1.md` / `verify-report.pr2.md` (intermediate snapshots; PR1 reported lint warning that was fixed in `ad666b6`, PR2 reported coverage informational-only warning).

No CRITICAL issues remain. All warnings are explicit and accepted.

## Spec Compliance Summary

Per the merged delta specs and the final-state facts, all scenarios are runtime-passing.

| Capability | Req | Scenarios | Compliance |
|---|---|---:|---|
| `identity-access` | 5 (was 4, +1 added) | 10 (was 6, +4 net) | PASS |
| `company-onboarding` | 3 (was 2, +1 added) | 8 (was 5, +3 net) | PASS |
| `item-catalog` | 9 (unchanged count) | 17 (was 18, net -1 from replaced scenarios) | PASS |
| `item-catalog-web` | 10 (was 9, +1 added) | 19 (was 18, +2 net — 1 replaced) | PASS |
| `company-lifecycle` (new) | 2 | 4 | PASS (new capability) |

## Issues Carried Forward (Accepted as Non-Blocking)

### WARNING 1 — PR1 lint warning (FIXED)

`verify-report.pr1.md` reported `@typescript-eslint/no-unsafe-member-access` at `apps/api/src/features/companies/...`. Fixed in `ad666b6` ("fix: type active company test response"). Final `pnpm --filter api typecheck` and `pnpm --filter api test` are both clean.

### WARNING 2 — PR2 coverage informational

`verify-report.pr2.md` reported coverage as informational only. V8 thresholds met at the suite level; no specific gap named. The full API suite passes 144/144; coverage posture is consistent with prior archive (`2026-07-31-item-catalog` carried an equivalent warning).

### WARNING 3 — Review budget exceeded on every slice

Each PR slice exceeded the 800-line review budget. The orchestrator/maintainer accepted each slice and committed. This is a per-slice policy warning, not a code defect.

### WARNING 4 — PR3 verify was not run as a separate sub-agent

The orchestrator ran the full API + web suites inline after the last slice landed and used the same evidence as the PR3 verify gate. No separate `verify-report.pr3.md` was produced. The full-suite results (API 144/144, web 81/81) are equivalent to PR3-focused slices and serve as the PR3 verify evidence by orchestrator explicit acceptance.

## Task Completion Gate Reconciliation (Phase 4)

Per the sdd-archive Task Completion Gate, the persisted tasks artifact is the source of truth. The tasks observation (#344) and `openspec/changes/.../tasks.md` showed Phase 4 tasks 4.1–4.3 as unchecked.

`apply-progress.md` (observation #353) covers Phases 1–3 implementation only; it does not include Phase 4 evidence. Phase 4 was verified inline by the orchestrator after the last PR slice landed.

**Exceptional archive-time repair** (per Task Completion Gate exception path, orchestrator explicit authorization with proof):

- `[ ] 4.1` → `[x] 4.1` — `pnpm --filter api test -- src/features/identity/.../auth.route.test.ts src/features/companies/.../company.route.test.ts src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts` is a strict subset of the full API suite that passed 144/144.
- `[ ] 4.2` → `[x] 4.2` — `pnpm --filter web test -- src/app/app.auth.test.tsx src/app/app.onboarding.test.tsx src/app/app.dashboard-shell.test.tsx` is a strict subset of the full web suite that passed 81/81.
- `[ ] 4.3` → `[x] 4.3` — runtime harness (`pnpm db:up && pnpm --filter api dev` and `pnpm dev`) ran per PR3 apply-progress PR3 work-unit evidence, covering login, switch, reload, blocked tenant (`activeCompany.companyId = companyB / provisioning_failed` across reload), and the generic support-safe page.

Reconciliation note added to the archived `tasks.md` under the Phase 4 section. This is **NOT** normal task completion — `sdd-apply` owns checkbox completion; `sdd-archive` only performed this single exceptional repair with orchestrator proof.

## Decision Log — Review Gate Path

The Native Review Receipt Gate was satisfied via the `disabled/unmanaged` relaxation. No review receipts were produced because the repo-level `gentle-ai review mode` kill switch is off (per the prior `2026-07-31-item-catalog` archive decision log — repo-level disable decision was inherited). No PR3 was opened against a GitHub remote (local-only delivery), so no PR-level review was applicable.

The receipt gate therefore permitted archive. **The receipt gate is satisfied via the disabled/unmanaged relaxation; it is NOT satisfied via an explicit `allow` receipt.** Re-enabling review mode revalidates from the current state and will require receipts for subsequent changes.

## Risks (Forward-Looking)

1. **Review mode disabled at the repo level** — future changes will not be receipt-gated until review is re-enabled. Re-enable if formal review discipline is required.
2. **Review budget exceeded on every slice** — the change exceeded 800 lines on each PR; the orchestrator accepted this on faith. Future changes above 400 lines should default to chained PRs.
3. **PR3 verify was inline, not a separate sub-agent run** — the full-suite evidence is equivalent, but future PRs should run a dedicated `sdd-verify` sub-agent for consistency.
4. **Coverage informational warning carried forward** — the suite passes, but the V8 threshold report is informational. Add explicit per-capability coverage if a regression appears.
5. **`company-lifecycle` is a new capability without its own prior main spec** — future changes that touch lifecycle UX should delta-merge against the new `openspec/specs/company-lifecycle/spec.md` from day one.
6. **Active-company preference write is now done in the same transaction as company creation (PR2)** — this couples the two and is an intentional design decision; consumers that bypass `POST /companies` (direct DB inserts) will not get an active-company preference.

## Engram Observation IDs (Traceability)

| Artifact | Observation ID | Sync ID | Created |
|---|---|---|---|
| `sdd/saas-foundation-contract/explore` | #312 | `obs-c97139deebb09e7a` | 2026-08-01 19:25:47 |
| `sdd/saas-foundation-contract/proposal` | #318 | `obs-4ac9b10a99c4d6cc` | 2026-08-01 19:37:38 |
| `sdd/saas-foundation-contract/spec` | #323 | `obs-efba198be598cd7f` | 2026-08-01 19:44:26 |
| `sdd/saas-foundation-contract/tasks` | #344 | `obs-020a2d493f5d2104` | 2026-08-01 20:06:35 |
| `sdd/saas-foundation-contract/apply-progress` | #353 | `obs-566ff2f76f7c91d2` | 2026-08-01 20:27:20 |
| `sdd/saas-foundation-contract/verify-report` | #355 | `obs-fa95dbbf1370ae1d` | 2026-08-01 20:38:04 |
| `sdd/saas-foundation-contract/archive-report` | (new — written by this archive) | (assigned at save) | 2026-08-03 |

Note: a dedicated `sdd/saas-foundation-contract/design` Engram observation was not created during the design phase; the design was tracked via session summaries (#341, #343) and a delta observation (#335). The OpenSpec file `openspec/changes/.../design.md` is the canonical design artifact.

## SDD Cycle Complete

The change has been fully planned, implemented (3 chained PR slices + 4 support commits), verified (full API 144/144, full web 81/81, both typechecks pass), reconciled (Phase 4 checkboxes ticked at archive time with orchestrator proof), and archived. The new `company-lifecycle` capability and the four modified capabilities are now part of source of truth.

Ready for the next change.
