# Archive Report: rrhh-foundation

Change: `rrhh-foundation`
Archived: 2026-08-14
Status: **Archived — PASS with warnings**

## Goal

Establish an upfront-coherent RRHH V1 foundation (Employee Master, organization linkage, Positions, assignment history, reporting hierarchy, ERP-access invitations, hierarchical permission scopes, ApprovalPolicy groundwork) so the platform can carry HR-shaped workflows without drifting from the canonical organization tree or the active-scope contract.

## Summary of What Shipped

End-to-end RRHH V1 from `0021` migration baseline through web pages:

- **DB foundation**: additive migration `0022_rrhh_foundation.sql` adds six foundation tables (`positions`, `employees`, `employee_assignments`, `reporting_lines`, `erp_access_links`, `erp_access_invitations`, `approval_policies`) with partial unique indexes, foreign keys, and CHECK constraints. Drizzle schema reflects the migration exactly. Migration test `migration-0022-rrhh-foundation.test.ts` proves `0021` has no legacy `employees` table.
- **Backend `hr-employees`**: domain entities (`positions`, `employees`, `employee-assignments`, `reporting-line`), application use cases (create/update/get/list employee, create-position, create-assignment, resolve-reporting-line, resolve-direct-reports), Drizzle gateway, Supertest router, and `countEmployeesInArea` preflight wired into the org-hierarchy gateway.
- **Backend `hr-erp-access`**: invitation/link domain, application cases (create, accept, list, revoke invitations), Drizzle gateway with hashed tokens and re-invitation identity reuse, Supertest router.
- **Backend `approval-policy`**: company/node scope CRUD with CHECK-enforced scope boundary; CRITICAL workflow execution is intentionally absent.
- **Identity + roles-management MODIFIED**: `hr.*` permission keys seeded; `PermissionScope` union extended with `direct_reports | self`; `evaluateReportingLineScopes` port wired through `computeEffectivePermissions` against live HR assignments and active ERP links in production runtime; `resolve-auth-session` rejects `direct_reports`/`self` as `activeScope`.
- **Org-tree MODIFIED**: gateway counts active employee assignments; delete-area use case blocks nonzero counts.
- **Frontend**: TanStack Query + RHF/Zod + shadcn pages for HR employees, positions, assignments/timeline, ERP-access invitations, accept-invitation, approval-policies (list + form). Routes `/hr/{employees,positions,erp-access,approval-policies}` registered in `apps/web/src/app/app.tsx`.
- **E2E**: Playwright happy path creates positions, assigns employees, issues/accepts ERP access, resolves the direct manager against the `vimcore_e2e` database.

## Test Results (final state)

- `pnpm test`: 527 passed / 0 failed / 0 skipped (1 root + 367 API + 159 web), full Turbo pipeline. The two previously timing-sensitive tests (`migration-0012-org-hierarchy.test.ts`, `drizzle-approval-policy.gateway.test.ts`) passed under authoritative timeout.
- `pnpm build`: pass, API and web tsc clean.
- `pnpm --filter api test:coverage`: pass. Lines 89.01%, statements 89.01%, branches 83.55%, functions 97.43%. The configured include list does not measure all new RRHH feature files; this is a known coverage-scope limitation.
- `pnpm exec playwright test e2e/rrhh-foundation.spec.ts`: 1 pass.
- Spec compliance: 13/13 requirements and 28/28 scenarios covered by passing tests.
- TDD compliance: 5/6 checks unqualified; triangulation warning inherited from apply progress.

## Spec Sync Summary

| Domain | Action | Details |
|--------|--------|---------|
| `hr-employees` | **Created** | 4 requirements, 8 scenarios — copied from `openspec/changes/rrhh-foundation/specs/hr-employees/spec.md` to `openspec/specs/hr-employees/spec.md` (new capability). |
| `hr-erp-access` | **Created** | 3 requirements, 6 scenarios — copied to `openspec/specs/hr-erp-access/spec.md` (new capability). |
| `approval-policy` | **Created** | 2 requirements, 4 scenarios — copied to `openspec/specs/approval-policy/spec.md` (new capability). |
| `identity-access` | **Modified** | `Protected Access and Roles` text + 1 new scenario `Direct-reports scope excludes indirect reports`; `Active Scope Context` text extended with reporting-line rejection rule + 1 new scenario `Reporting-line scope cannot become active scope`. Existing 7 scenarios preserved. |
| `org-tree` | **Modified** | `Canonical Scope Tree` text extended with non-extension rule for employee/position/reporting-line node types. Added requirement `Employee-linked deletion preflight` (2 scenarios). Existing 6 scenarios preserved. |

### Naming drift (documented interpretation)

The rrhh-foundation delta references `Active Company Context` while the current main `identity-access` spec holds `Active Scope Context` after the rename made by archived `2026-08-11-org-tree-canonical-model`. The two names refer to the same requirement. The delta's MODIFIED block was applied to `Active Scope Context` in the merged main spec, preserving the post-rename requirement name. No requirement was added, removed, or deleted; only the text and one new scenario were carried over. The active change `canonical-org-rbac-hierarchy` (still in `openspec/changes/`) also references the legacy name in its own delta; that pending merge will need to align with the same interpretation.

## Archive Contents

- `proposal.md` ✅
- `specs/hr-employees/spec.md` ✅
- `specs/hr-erp-access/spec.md` ✅
- `specs/approval-policy/spec.md` ✅
- `specs/identity-access/spec.md` ✅ (delta)
- `specs/org-tree/spec.md` ✅ (delta)
- `design.md` ✅
- `tasks.md` ✅ (37/37 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅ (verdict: `pass_with_warnings`)
- `exploration.md` ✅

## Source of Truth Updated

The following main specs now reflect the new RRHH V1 behavior:

- `openspec/specs/hr-employees/spec.md` — new
- `openspec/specs/hr-erp-access/spec.md` — new
- `openspec/specs/approval-policy/spec.md` — new
- `openspec/specs/identity-access/spec.md` — HR permission-scope union, reporting-line rejection of active scope
- `openspec/specs/org-tree/spec.md` — non-extension of canonical tree; employee-linked deletion preflight

Archived at: `openspec/changes/archive/2026-08-14-rrhh-foundation/`.

## Warnings Carried Forward

1. **Repository lint**: `pnpm lint` reports 434 errors across the repo (changed HR router/test files plus existing shared/test files). `pnpm build` and `pnpm test` are clean; the change is not lint-clean. Verdict is `pass_with_warnings`, not blocked.
2. **Changed-file coverage**: the configured API coverage include list does not measure the new RRHH feature files. Aggregate API line coverage remains 89.01%.
3. **Assertion quality**: two WARNINGs in RRHH tests (`positions.test.ts` line 16 uses `toBeUndefined()` as the sole assertion; `require-hr-capability.test.ts` lines 38 and 74 rely on `toHaveBeenCalledWith()` rather than observable response/side effects). No CRITICAL, no tautologies, no ghost loops.
4. **Documented design deviation — token-driven ERP acceptance page**: no public invitation-details endpoint exists, so the acceptance page omits company/invitation metadata. Documented in `apply-progress.md`.
5. **Documented design deviation — route composition root**: implementation uses `apps/web/src/app/app.tsx`, not the nonexistent `main.tsx` named in the design task.
6. **Web large-chunk warning**: web production build emits the pre-existing large-chunk warning; unrelated to RRHH.
7. **Triangulation warning**: apply progress still records one original task row without multi-path triangulation; this is unchanged from the verification phase.

## Follow-ups (Tracked Outside This Change)

These are not blockers but should be addressed in subsequent changes:

### Follow-up A — Repo lint baseline
Clean the underlying lint baseline and make the changed HR files lint-clean in a bounded change. The current baseline noise buries actionable findings.

### Follow-up B — Changed-file coverage for new RRHH slices
Configure the API coverage include list (or add a per-change coverage tool) to measure the new `hr-employees`, `hr-erp-access`, and `approval-policy` feature folders. Add web coverage configuration if web coverage is desired.

### Follow-up C — Public ERP invitation metadata endpoint
Expose a token-driven public invitation-details endpoint so the acceptance page can show company/invitation context, removing the token-driven deviation.

### Follow-up D — Production-runtime coverage for reporting-line scopes
Add composed production-runtime tests asserting `direct_reports` and `self` evaluation against live assignments and ERP links, beyond the existing evaluator and router seams.

### Follow-up E — Resolve `Active Company Context` naming drift with `canonical-org-rbac-hierarchy`
That still-active change also references the pre-rename `Active Company Context` in its identity-access delta. When it archives, its MODIFIED block must align with the post-rename `Active Scope Context` requirement; coordinate naming before its archive phase.

### Follow-up F — Stricter assertion quality for `positions.test.ts` and `require-hr-capability.test.ts`
Replace the `toBeUndefined()` sole assertion with a behavior/value assertion. Replace mock-call-only assertions with observable response/side-effect assertions.

## Out of Scope (confirmed unchanged)

Payroll, salary, taxes; ATS/recruiting; attendance/biometric; time off/overtime; benefits; trainings; performance; surveys; OKRs; contract signing; approval workflows. These remain deferred per the proposal.

## Final State

- 37/37 tasks complete; tasks.md holds no stale unchecked implementation tasks.
- `verify-report.md` verdict: `pass_with_warnings`, 0 blockers, 0 critical findings, 13/13 requirements, 28/28 scenarios covered.
- All delta specs merged into the corresponding main specs (`hr-employees`, `hr-erp-access`, `approval-policy` created; `identity-access`, `org-tree` updated).
- Change folder moved to `openspec/changes/archive/2026-08-14-rrhh-foundation/`.
- The change is closed and ready for the next SDD cycle.

## SDD Cycle Complete

`rrhh-foundation` has been planned, specified, designed, implemented, verified, and archived. Follow-ups A–F are tracked outside this change.

## Key Learnings

1. The naming drift in `identity-access` between `Active Company Context` (pre-rename) and `Active Scope Context` (post-archive rename) propagates to other in-flight changes and must be coordinated at archive time, not silently absorbed.
2. The renamed `Active Scope Context` requirement covers the same semantics as the legacy `Active Company Context`; matching deltas across archive merges requires the same interpretation as documented here.
3. `evaluateReportingLineScopes` must be wired in production runtime via `createAppRuntime`, not just exposed on the domain port, for `direct_reports` and `self` scopes to be effective.
4. The configured coverage include list must be updated before a change that introduces new feature folders can claim changed-file coverage; otherwise the change ships with global aggregate-only coverage reporting.
5. The token-driven ERP acceptance page deviation was the right call when no public invitation-details endpoint exists, but it underlines the need for such an endpoint as a follow-up.
