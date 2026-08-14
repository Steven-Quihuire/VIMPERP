```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:de829aaac34eb78bbc2f0c3a035b6e9778caf95ff97705a90b6d4bf96c2ee4ab
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 13/13
scenarios: 28/28
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:dacfa13e76e7b63daf595026a63bb987be4e09ab09068a50bf823ff5577cc4fd
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:d18b08de5db112ad245451b7f4374b642b51a645bd72b5ed28bcf049fa05df72
```

## Verification Report

**Change**: rrhh-foundation  
**Version**: N/A  
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 37 |
| Tasks complete | 37 |
| Tasks incomplete | 0 |
| Proposal | Done |
| Specs | 5 capability deltas read; 13 requirements and 28 scenarios counted |
| Design | Done |
| Apply progress | Done; 37/37 |

### Build & Tests Execution
**Build**: ✅ Passed
```text
Command: pnpm build
Exit: 0
Result: Turbo completed API and web builds successfully. Web emitted the existing large-chunk warning.
Output hash: sha256:d18b08de5db112ad245451b7f4374b642b51a645bd72b5ed28bcf049fa05df72
```

**Tests**: ✅ 527 passed / 0 failed / 0 skipped in the authoritative `pnpm test` run
```text
Command: pnpm test
Exit: 0
Root: 1 test passed.
API: 72 files; 367 tests passed.
Web: 43 files; 159 tests passed.
Turbo: 4 successful tasks.
The two previously timing-sensitive tests passed in the full suite: `migration-0012-org-hierarchy.test.ts` and `drizzle-approval-policy.gateway.test.ts`.
Output hash: sha256:dacfa13e76e7b63daf595026a63bb987be4e09ab09068a50bf823ff5577cc4fd
```

**Coverage**: ✅ API coverage passed: 89.01% statements, 83.55% branches, 97.43% functions, and 89.01% lines; 72 files / 367 tests passed. The configured coverage include list does not produce changed-file coverage for the new RRHH files.
```text
Command: pnpm --filter api test:coverage
Exit: 0
Output hash: sha256:6862017d68f99171f42bfaf0212aa4030b1740aa55b529b2bc656aea8dc94689
```

**E2E**: ✅ Passed
```text
Command: CI=1 pnpm exec playwright test e2e/rrhh-foundation.spec.ts
Exit: 0
Result: 1 Playwright test passed. The dedicated `vimcore_e2e` database was reset and migrated; the flow created positions, assigned employees, issued and accepted ERP access, and resolved the direct manager.
Output hash: sha256:dac5c297d8efac02e308de0ea7c9d7e84b52a53bfe4c4290c1663477c17acf9e
```

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Approval policy scope boundary | Company-level policy is stored | `approval-policy.router.test.ts > creates, lists, updates, and deactivates approval policies through createApp` | ✅ COMPLIANT |
| Approval policy scope boundary | Node-level policy is stored without reporting-line scope | `approval-policy.router.test.ts > creates, lists, updates, and deactivates approval policies through createApp` | ✅ COMPLIANT |
| Foundation-only lifecycle | Base policy CRUD succeeds | `drizzle-approval-policy.gateway.test.ts`, `approval-policy.router.test.ts` | ✅ COMPLIANT |
| Foundation-only lifecycle | Workflow execution is out of scope | `approval-policy.router.test.ts > treats approval policies as configuration groundwork even when no workflow engine exists` | ✅ COMPLIANT |
| Employee master identity | Employee exists without ERP access | `drizzle-hr-employees.gateway.test.ts > persists employees, positions, assignments, managers, and direct reports` | ✅ COMPLIANT |
| Employee master identity | ERP access changes do not redefine the employee | `drizzle-erp-access.gateway.test.ts > persists invitations, accepts them into active links, and revokes access` | ✅ COMPLIANT |
| Position hierarchy and staffing | Top-of-hierarchy position is allowed | `positions.test.ts > allows a top-of-hierarchy position without a parent` | ✅ COMPLIANT |
| Position hierarchy and staffing | Vacancy count uses active staffing | `positions.test.ts > exposes occupied headcount and remaining vacancies from active staffing` | ✅ COMPLIANT |
| Assignment history and reporting line | New primary assignment closes the prior one | `create-assignment.test.ts > auto-closes the prior active primary assignment` | ✅ COMPLIANT |
| Assignment history and reporting line | Direct manager stays separate from node responsibility | `resolve-reporting-line.test.ts > returns null when the parent position is vacant instead of treating org-node responsibility as the direct manager` | ✅ COMPLIANT |
| Additive RRHH baseline | RRHH foundation starts from the live baseline | `migration-0022-rrhh-foundation.test.ts` | ✅ COMPLIANT |
| Invitation-gated ERP activation | Invited employee activates ERP access | `rrhh-foundation.spec.ts`, `hr-erp-access.router.test.ts`, `drizzle-erp-access.gateway.test.ts` | ✅ COMPLIANT |
| Invitation-gated ERP activation | Employee without invitation stays without ERP access | `accept-erp-access-invitation.test.ts > denies ERP access when no invitation token exists for the employee` | ✅ COMPLIANT |
| Employee and user linkage integrity | Existing employee links to one ERP user | `erp-access.test.ts`, `drizzle-erp-access.gateway.test.ts` | ✅ COMPLIANT |
| Employee and user linkage integrity | Conflicting active linkage is rejected | `accept-erp-access-invitation.test.ts`, `erp-access.test.ts` | ✅ COMPLIANT |
| ERP access lifecycle independence | Revoked access keeps employee history | `accept-erp-access-invitation.test.ts > revokes active access without deleting the employee identity`, `drizzle-erp-access.gateway.test.ts` | ✅ COMPLIANT |
| ERP access lifecycle independence | Re-invitation reuses the employee identity | `accept-erp-access-invitation.test.ts > reuses the existing employee identity when the company re-invites after revocation` | ✅ COMPLIANT |
| Protected Access and Roles | Authorized capability reaches protected resources | `hr-employees.router.test.ts`, `hr-erp-access.router.test.ts`, `approval-policy.router.test.ts`, `rrhh-foundation.spec.ts` | ✅ COMPLIANT |
| Protected Access and Roles | Unauthorized or scope-missing access is blocked | `require-hr-capability.test.ts`, `hr-employees.router.test.ts`, `hr-erp-access.router.test.ts`, `approval-policy.router.test.ts` | ✅ COMPLIANT |
| Protected Access and Roles | Direct-reports scope excludes indirect reports | `evaluate-reporting-line-scopes.test.ts > returns only direct reports and excludes deeper descendants for the direct_reports scope` | ✅ COMPLIANT |
| Active Company Context | Single implied scope auto-selects | `resolve-auth-session.test.ts > auto-selects the only valid scope` | ✅ COMPLIANT |
| Active Company Context | Multiple valid scopes require selection | `resolve-auth-session.test.ts > keeps activeScope null when multiple valid scopes exist` | ✅ COMPLIANT |
| Active Company Context | Legacy local session backfills on first read | `resolve-auth-session.test.ts > resolves activeLocalId to the equivalent active local scope` | ✅ COMPLIANT |
| Active Company Context | Reporting-line scope cannot become active scope | `resolve-auth-session.test.ts > rejects reporting-line scope ids as active scopes` | ✅ COMPLIANT |
| Employee-linked deletion preflight | Active employee assignment blocks deletion | `delete-area.test.ts > rejects deleting an area when an active employee assignment still references it` | ✅ COMPLIANT |
| Employee-linked deletion preflight | Node without employee references can be deleted | `delete-dependency-preflight.test.ts > allows area deletion when no dependencies exist` | ✅ COMPLIANT |
| Canonical Scope Tree | Resolve lineage for a descendant node | `scope-hierarchy.port.test.ts > returns ordered lineage from the requested node to the company root` | ✅ COMPLIANT |
| Canonical Scope Tree | Company root has no parent | `scope-hierarchy.port.test.ts > returns only the company node when the requested lineage starts at the root` | ✅ COMPLIANT |

**Compliance summary**: 28/28 scenarios have passing covering tests in the authoritative full-suite run.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Additive RRHH migration and DB invariants | ✅ Implemented | Migration `0022` and Drizzle schema define the six foundation tables, foreign keys, partial unique indexes, and scope checks; migration tests pass in the full suite. |
| Employee, position, assignment, and reporting-line slices | ✅ Implemented | Feature-first slices preserve assignment history and separate manager resolution from organization-node responsibility. |
| Invitation-gated ERP access | ✅ Implemented | Separate invitation/link tables, hashed tokens, accepted-link creation, session issuance, revocation, and re-invitation identity reuse are covered. |
| Approval-policy CRUD and scope boundary | ✅ Implemented | Company/node scope validation and CRUD-only API paths are present; workflow execution remains absent by design. |
| HR permission catalog | ✅ Implemented | `hr.*` permission keys are seeded in the roles-management catalog. |
| HR authorization enforcement | ✅ Implemented | HR employees and ERP-access routers use `requireHrCapability` with `hr.*` permission keys and active-company checks. |
| Reporting-line permission scopes | ✅ Implemented | Production `createAppRuntime` wires `createEvaluateReportingLineScopes` into `computeEffectivePermissions` using active ERP links and live HR assignments. |
| Active canonical scope validation | ✅ Implemented | Persisted `direct_reports` and `self` values are rejected as active canonical scopes. |
| Employee-linked area deletion preflight | ✅ Implemented | The gateway counts active employee assignments and the delete use case rejects nonzero counts. |
| Web query/forms/routes | ✅ Implemented | Typed fetch adapters, TanStack Query hooks, RHF/Zod pages, route registration, and focused RTL tests are present. |
| Timeout-path determinism | ✅ Implemented | The migration and approval-policy integration tests reuse their migrated databases instead of recreating migration state per test, and both pass under the authoritative default timeout. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| DB → backend → frontend sequencing | ✅ Yes | Apply progress records all seven stacked slices complete. |
| Feature-first Clean Architecture | ✅ Yes | HR slices keep domain/application/infrastructure/presentation boundaries and typed fetch/query adapters. |
| Separate employee and user identity | ✅ Yes | ERP access uses separate link and invitation tables; no inline employee user id exists. |
| Catalog-driven HR authorization | ✅ Yes | Production HR routers delegate to `requireHrCapability`, which computes scoped `hr.*` permissions. |
| Reporting-line scopes evaluated at request time | ✅ Yes | The composed runtime provides the evaluator to `computeEffectivePermissions`; direct reports and self remain evaluation-time scopes. |
| Canonical tree remains organizational only | ✅ Yes | Reporting-line kinds are not added to `scope_node_type`; active-scope validation rejects them. |
| Token-driven ERP acceptance page | ⚠️ Documented deviation | No public invitation-details endpoint exists, so the activation page remains token-driven and omits company/invitation metadata. |
| Route composition root | ⚠️ Documented deviation | Actual code uses `apps/web/src/app/app.tsx`, not the nonexistent `main.tsx` named in the design task. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress.md` contains the original task table plus the remediation TDD evidence tables. |
| All tasks have tests | ✅ | 37/37 task rows point to existing test files or repository gates. |
| RED confirmed (tests exist) | ✅ | All referenced original and remediation test artifacts exist on disk. |
| GREEN confirmed (tests pass) | ✅ | The exact required `pnpm test` command passes with 527 tests across root, API, and web. |
| Triangulation adequate | ⚠️ | Remediation adds distinct tests for each previously missing scenario and wiring seam; the apply evidence still records one original task row without multi-path triangulation. |
| Safety net for modified files | ✅ | Apply progress records safety-net status for modified files and the remediation batch is bounded to the reported blockers. |

**TDD Compliance**: 5/6 checks pass without qualification; the only qualification is the existing triangulation warning.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 48 | 15 | Vitest |
| Integration | 77 | 19 | Vitest, Supertest, Testing Library |
| E2E | 1 | 1 | Playwright |
| **Total** | **126** | **35** | |

### Changed File Coverage
Coverage analysis for changed RRHH files is unavailable because the configured API coverage include list excludes the new RRHH feature files and no web coverage command is configured. Aggregate API coverage remains 89.01% lines.

### Assertion Quality
| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `apps/api/src/features/hr-employees/domain/__tests__/positions.test.ts` | 16 | `toBeUndefined()` | Type-only assertion is the sole assertion in the test; add a meaningful value/behavior assertion. | WARNING |
| `apps/api/src/features/roles-management/presentation/require-hr-capability.test.ts` | 38, 74 | `toHaveBeenCalledWith()` | Relies on middleware mock-call behavior rather than an observable response/side effect. | WARNING |

**Assertion quality**: 0 CRITICAL, 2 WARNING. No tautologies, ghost loops, or assertion-free production paths were found in the reviewed RRHH tests.

### Quality Metrics
**Linter**: ❌ 434 errors, 0 warnings in `pnpm lint`; errors include changed HR router/test files and existing shared/test files.
```text
Command: pnpm lint
Exit: 1
Output hash: sha256:e801744b090a864b91e4a5df31372a602fae9c1ebbd0d21b8e780e380626975f
```
**Type Checker**: ✅ No errors through `pnpm build` (API `tsc -p tsconfig.build.json` and web `tsc --noEmit`).
**React Doctor**: ➖ Not available; no React Doctor command is present in the project toolchain.

### Issues Found
**CRITICAL**: None.

**WARNING**:
1. Repository lint fails with 434 errors; build/typecheck and all required runtime gates pass, but the change is not lint-clean.
2. Changed-file coverage is unavailable from the configured coverage scope; aggregate API coverage does not measure all new RRHH files.
3. Two assertion-quality warnings remain as listed above.
4. The token-driven ERP activation page omits invitation metadata because the backend has no public invitation-details endpoint; this deviation is documented in apply progress.
5. The route composition-root name differs from the design text: implementation uses `apps/web/src/app/app.tsx` rather than the nonexistent `main.tsx`.
6. The web production build emits the existing large-chunk warning.

**SUGGESTION**:
1. Reduce the repository lint baseline and make the changed HR files lint-clean in a separate bounded change.
2. Configure changed-file coverage for the new RRHH backend and web slices.
3. Add composed production-runtime coverage for `direct_reports` and `self`, beyond the evaluator and router seams.

### Verdict
PASS WITH WARNINGS
All 13 requirements and 28 scenarios are covered, the full `pnpm test` and `pnpm build` gates pass, and the RRHH Playwright path passes; no verification blocker remains, but archive routing must still be confirmed by native status and any repository review gate.
