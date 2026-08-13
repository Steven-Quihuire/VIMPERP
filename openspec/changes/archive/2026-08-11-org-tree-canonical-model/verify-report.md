```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:444aa348a6cc49ab8af472fe6789cc137152b6731edc1a27be33fb0303de2b52
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 6/6
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:3ef3f6341297946b9cbeb12bed7ebbbff05099d8950285eadc6cb6eed42b744f
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:135477bfa1525b7a2d9c56d3ca1be6ccc7608f170e80b779cafa842d5f98ae6c
```

## Verification Report

**Change**: org-tree-canonical-model
**Version**: N/A
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 20 |
| Tasks incomplete | 0 |
| Verification task | `5.1` checked; API coverage, root tests, and build passed |

All proposal, delta spec, base specification, design, tasks, apply-progress, and prior verify-report artifacts were present and inspected. The native denominator is 4 requirements and 6 scenarios from the registered identity-access delta. The base `org-tree` specification is reported as supplemental evidence. No source changes were made during this verification attempt.

### Build & Tests Execution
**Coverage**: ✅ Passed — 88.81% statements, 83.65% branches, 97.29% functions; configured threshold: 80%
```text
Command: pnpm --filter api test:coverage
Exit: 0
Hash: sha256:2bb5031d47992d4168d417008c5af4c81b90c74ab6e46603df871acd022a1ef2
Result: 45 test files passed; 238 tests passed; V8 aggregate coverage exceeded the configured threshold.
```

**Tests**: ✅ 336 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
Command: pnpm test
Exit: 0
Hash: sha256:3ef3f6341297946b9cbeb12bed7ebbbff05099d8950285eadc6cb6eed42b744f
Result: API 45 files / 238 tests passed; web 21 files / 97 tests passed; root sum 1 / 1 passed.
```

**Build**: ✅ Passed
```text
Command: pnpm build
Exit: 0
Hash: sha256:135477bfa1525b7a2d9c56d3ca1be6ccc7608f170e80b779cafa842d5f98ae6c
Result: Turbo completed API TypeScript build and web TypeScript/Vite build successfully.
```

**Final remediation focused tests**: ✅ Passed
```text
Command: pnpm --filter api exec vitest run src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts src/features/items/presentation/item.route.test.ts
Exit: 0
Hash: sha256:ca044f3859af8f194f6de4f51ebaad69e5dcf84ec74519f09b1d4f0301bac4bf
Result: 3 files passed; 27 tests passed, including same-company sibling exclusion and active-scope-required item access.
```

**E2E runtime harness**: ✅ Passed / ⚠️ cleanup warning
```text
Command: pnpm exec playwright test e2e/active-scope.e2e.spec.ts
Exit: 0
Hash: sha256:88df29bcee3a0111d62149232c0a3f693b268682e3d4235839d80339b2111620
Result: 1/1 scenario passed: local-to-warehouse switch, item re-scope, and forbidden out-of-scope switch rejection.
```

### Spec Compliance Matrix

#### Registered identity-access delta (native denominator: 4 requirements, 6 scenarios)
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Authorized Active Scope Switching | Authorized warehouse switch succeeds | `e2e/active-scope.e2e.spec.ts > switches from local to warehouse, re-scopes items, and rejects unauthorized switches` | ✅ COMPLIANT |
| Authorized Active Scope Switching | Out-of-scope switch is rejected | `e2e/active-scope.e2e.spec.ts` forbidden switch assertion; `auth.route.test.ts` unauthorized switch coverage | ✅ COMPLIANT |
| Protected Access and Roles | Authorized capability reaches a protected resource | `drizzle-scope-resolver.test.ts > preserves ScopeRef[] lineage semantics and powers effective permission inheritance`; item route and E2E protected-resource requests | ✅ COMPLIANT |
| Protected Access and Roles | Missing scope authority is blocked | `item.route.test.ts > denies scope-bound item routes until a user with multiple authorized scopes selects an active scope` | ✅ COMPLIANT |
| Active Scope Context | Saved local backfills to active scope | `resolve-auth-session.test.ts > resolves activeLocalId when the saved local belongs to the active company` | ✅ COMPLIANT |
| Active Scope Context | Multiple authorized scopes require selection | `resolve-auth-session.test.ts > keeps activeScope null when multiple authorized scopes require explicit selection`; item-route 403 guard | ✅ COMPLIANT |

**Native compliance summary**: 6/6 scenarios compliant; 4/4 registered requirements complete.

#### Supplemental base `org-tree` specification
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Canonical Scope Tree | Resolve lineage for a descendant node | `scope-hierarchy.port.test.ts > returns ordered lineage from the requested node to the company root`; `drizzle-scope-resolver.test.ts` descendant lineage assertions | ✅ COMPLIANT |
| Canonical Scope Tree | Company root has no parent | Root is represented with `parentRef: null` in resolver fixtures; no direct request-for-root assertion exists | ⚠️ PARTIAL |
| Authorized Tree Visibility | Parent assignment reveals descendants | `scope-hierarchy.port.test.ts > lists the visible assigned subtree...`; `drizzle-scope-resolver.test.ts` authorized descendants | ✅ COMPLIANT |
| Authorized Tree Visibility | Unauthorized sibling stays hidden | `scope-hierarchy.port.test.ts > keeps same-company sibling branches hidden...`; Drizzle sibling assertions | ✅ COMPLIANT |
| Active Scope Governs Operations | Visible descendants do not widen an operation | `item.route.test.ts > keeps item scope at company level when the active scope is a warehouse`; local-only derivation tests | ✅ COMPLIANT |
| Active Scope Governs Operations | Warehouse active scope drives defaults | `e2e/active-scope.e2e.spec.ts` warehouse switch and re-scoped item requests | ✅ COMPLIANT |

**Supplemental base-spec summary**: 5/6 scenarios compliant; 1 partial.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Single shared `ScopeResolver` | ✅ Implemented | Shared port and Drizzle adapter exist; roles-management delegates through shared infrastructure. |
| Six-type canonical read tree | ✅ Implemented | API/web org-tree slices and six-type switcher are present; root-lineage direct assertion remains a warning. |
| Assignment mode semantics | ✅ Implemented | `subtree_inclusive` and `exact_node` are modeled per assignment and pass unit/integration tests. |
| Typed `activeScope` with legacy backfill | ✅ Implemented | Login/register constructors, resolver, API schema, and web fixtures compile and pass. |
| Authorized active-scope switching | ✅ Implemented | Route authorization, persistence, web mutation invalidation, and E2E switch/rejection behavior pass. |
| Scope-selection requirement | ✅ Implemented | Multiple-scope resolution stays null and scope-bound item routes reject access until selection. |
| Migration journal and 0018 migration | ✅ Implemented | Journal continuity, canonical `locals` assertion, 0018 schema tests, coverage, root tests, and build pass. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Shared `ScopeResolver` port over duplicated CTEs | ✅ Yes | Roles-management delegates to shared infrastructure. |
| Assignment-level `subtree_inclusive` versus `exact_node` | ✅ Yes | Schema, domain, resolver, and effective-permission paths agree. |
| Additive typed `activeScope` with legacy `activeLocalId` backfill | ✅ Yes | Persistence and resolver paths preserve the legacy field while exposing typed scope. |
| Additive 0018 migration | ✅ Yes | Migration remains additive and its runtime tests pass. |
| Two stacked PR slices with bounded review workload | ⚠️ Partial | The final remediation stayed bounded, but the earlier PR-2 slice is recorded at approximately 985 changed lines against the 400-line target. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress.md` contains a TDD Cycle Evidence row for every task `0.1` through `5.1`. |
| All implementation tasks have tests | ✅ | 19/19 implementation tasks list existing test files or the E2E spec. |
| RED confirmed (tests exist) | ✅ | 19/19 listed test targets exist in the current tree. |
| GREEN confirmed (tests pass) | ✅ | Root Vitest suites, focused remediation tests, and the active-scope Playwright scenario pass. |
| Triangulation adequate | ⚠️ | Principal branches are covered, but direct company-root lineage evidence remains partial. |
| Safety net for modified files | ⚠️ | Existing-file safety-net claims are recorded in apply-progress; newly introduced files have no historical baseline safety net. |

**TDD Compliance**: 4/6 checks passed without qualification.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|----------|-------|
| Unit + integration | 336 | 67 | Vitest, Supertest, Testing Library, PostgreSQL |
| E2E | 1 | 1 | Playwright |
| **Total** | **337** | **68** | |

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `apps/api/src/features/identity/application/login.ts` | 96.77% | 93.33% | 69-70 | ✅ Excellent |
| `apps/api/src/features/identity/application/register.ts` | 100% | 100% | — | ✅ Excellent |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | 85.61% | 84.61% | reporter-abbreviated ranges `...51-164,174-175` | ⚠️ Acceptable |
| `apps/api/src/features/identity/presentation/auth.router.ts` | 79.71% | 78.94% | reporter-abbreviated ranges `...31-236,245-278` | ⚠️ Low |
| `apps/api/src/features/admin/presentation/admin.router.ts` | 91.08% | 58.82% | reporter-abbreviated ranges `...99-200,214-215` | ✅ Excellent |
| `apps/api/src/features/companies/presentation/company.router.ts` | 86.70% | 72.41% | reporter-abbreviated ranges `...09,227,252-253` | ⚠️ Acceptable |
| Other changed source/test/migration/web files | Not emitted | Not emitted | No complete changed-file rows in the V8 text report | Not claimed |

**Aggregate coverage**: 88.81% statements, above the configured 80% threshold. A complete changed-file average is not claimed because the command output does not provide a complete changed-file denominator.

### Assertion Quality
The modified and created test files listed in `apply-progress.md` were audited for tautologies, orphan empty assertions, type-only assertions without value checks, ghost loops, no-op tests, smoke-only tests, and mock-heavy tests. No critical assertion defects were found. Empty-array and zero-call assertions occur only in negative tests with companion positive behavior in the same suites.

**Assertion quality**: ✅ All inspected assertions verify real behavior.

### Quality Metrics
**Linter**: ⚠️ 163 errors, 0 warnings in the changed TypeScript/TSX/E2E diagnostic run; hash `sha256:db2acbf66425bcf2053d887819af72f67297ecca7a71a0f8f55424207b9d5075`; exit `1`.
**Type Checker**: ✅ No build/type-check errors; `pnpm build` exited 0.
**Formatter**: ➖ Not run; not a required verify gate in `openspec/config.yaml`.

### Issues Found
**CRITICAL**: None.

**WARNING**:
1. Company-root lineage has only partial evidence: fixtures assert `parentRef: null`, but no direct runtime assertion requests the company root lineage.
2. The changed-file ESLint diagnostic reports 163 errors; quality issues are informational because the configured build/test gates pass.
3. Playwright exits 0, but the web-server harness emits a PostgreSQL `57P01` administrator-termination error during shutdown.
4. The earlier PR-2 apply slice remains above the 400-line review target; this verification attempt changed zero source lines.

**SUGGESTION**:
1. Add a direct company-root lineage assertion before claiming complete canonical-tree scenario coverage.
2. Resolve changed-file lint errors and make E2E database shutdown graceful.

### Verdict
PASS WITH WARNINGS
All 4 registered requirements and 6 registered scenarios have passing runtime coverage, task `5.1` is complete, and archive-readiness blockers are zero; remaining warnings are non-blocking quality, direct-root-evidence, cleanup, and historical review-budget concerns.
