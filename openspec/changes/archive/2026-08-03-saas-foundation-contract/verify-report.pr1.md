```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:21150e418bea473319829dc9f7280edcf61d1db8cd88931138315e018fce7748
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 6/6
test_command: pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts
test_exit_code: 0
test_output_hash: sha256:b268ed84630451ed5b2ebd810de5e7d5c16d99e58393c8903122ac7b5dc72669
build_command: pnpm --filter api typecheck
build_exit_code: 0
build_output_hash: sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92
```

## Verification Report

**Change**: saas-foundation-contract
**Work Unit**: PR1-verify-active-company-session-switch
**Version**: PR1 scoped verification evidence
**Mode**: Strict TDD
**Scope Note**: This is a scoped PR1 verification only for tasks 1.1–1.3. Phase 2/3/4 tasks remain intentionally out of scope and are not treated as failures here.

### Completeness
| Metric | Value |
|--------|-------|
| PR1 tasks total | 3 |
| PR1 tasks complete | 3 |
| PR1 tasks incomplete | 0 |
| Out-of-scope pending tasks | 10 |

### Build & Tests Execution
**Build / Typecheck**: ✅ Passed
```text
Command: pnpm --filter api typecheck
Exit: 0
Hash: sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92
Output:
$ tsc --noEmit
```

**Focused Tests**: ✅ 133 passed / 0 failed / 0 skipped
```text
Command: pnpm --filter api test -- src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts
Exit: 0
Hash: sha256:b268ed84630451ed5b2ebd810de5e7d5c16d99e58393c8903122ac7b5dc72669
Observed runner behavior: pnpm forwarded to the api Vitest suite and executed 31 files / 133 tests, including the two PR1 route suites and the new 0008 migration test.
```

**Migration Proof**: ✅ Passed
```text
Command: pnpm --filter api exec vitest run src/db/migrations/__tests__/0008_active_company_preferences.test.ts
Exit: 0
Hash: sha256:f4eb0fa03abe2d6de47dbff3d5ce52b7733531b470375a7a84bdd03d7e72ebe6
Observed: 1 file / 1 test passed
```

**Coverage**: available via focused Vitest coverage run → ⚠️ informational only

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Active Company Context | Single membership auto-selects into session payload | `apps/api/src/features/identity/presentation/auth.route.test.ts > returns 204 and sets a cookie for valid credentials, then returns auth/me payload` | ✅ COMPLIANT |
| Active Company Context | Persisted active company is returned in `/auth/me` | `apps/api/src/features/identity/presentation/auth.route.test.ts > returns the persisted active company in auth/me` | ✅ COMPLIANT |
| Active Company Context | Invalid saved company falls back to the only valid membership | `apps/api/src/features/identity/presentation/auth.route.test.ts > falls back to the single membership when the persisted active company is no longer valid` | ✅ COMPLIANT |
| Active Company Switch Contract | Valid switch persists for the next `/auth/me` call | `apps/api/src/features/companies/presentation/company.route.test.ts > switches the active company for a valid membership and persists it for the next auth/me call` | ✅ COMPLIANT |
| Active Company Switch Contract | Switching outside memberships is rejected | `apps/api/src/features/companies/presentation/company.route.test.ts > rejects switching to a company outside the authenticated memberships` | ✅ COMPLIANT |
| Active Company Switch Contract | Throttle returns generic `429` | `apps/api/src/features/companies/presentation/company.route.test.ts > returns a generic 429 when the user exceeds the active-company switch throttle` | ✅ COMPLIANT |

**Compliance summary**: 6/6 scoped PR1 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Persist active company preference in DB contract | ✅ Implemented | `apps/api/src/shared/infrastructure/db/schema.ts` adds `user_preferences.active_company_id`; `apps/api/src/db/migrations/0008_tiny_scrambler.sql` and its migration test prove the schema contract. |
| Resolve session from memberships + persisted preference | ✅ Implemented | `apps/api/src/features/identity/application/resolve-auth-session.ts` prefers saved membership, falls back to the lone membership, and returns `activeCompany.status`. |
| Expose session payload with `activeCompany` | ✅ Implemented | `apps/api/src/features/identity/domain/auth.ts` and `apps/api/src/features/identity/presentation/auth.router.ts` define and validate the new payload shape. |
| Validate switch membership + persist change + audit count throttle | ✅ Implemented | `apps/api/src/app/create-app.ts`, `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`, and `apps/api/src/features/companies/presentation/company.router.ts` enforce membership, count recent audit events, persist preference, and record the switch. |
| Map throttle failure to generic 429 | ✅ Implemented | `apps/api/src/shared/presentation/error.middleware.ts` maps `TooManyRequestsError` to `TOO_MANY_REQUESTS`. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Dedicated `user_preferences.active_company_id` | ✅ Yes | Schema + migration match the design decision exactly. |
| `PATCH /me/active-company` placement | ✅ Yes | Implemented in `apps/api/src/features/companies/presentation/company.router.ts`. |
| Switch throttle via recent `audit_events` count | ✅ Yes | `countRecentActiveCompanySwitches` reads `audit_events` in `drizzle-auth.gateway.ts`. |
| Last-write-wins switch model | ✅ Yes | Same-company switch no-ops; otherwise persisted preference is overwritten. |
| Session returns company lifecycle status | ✅ Yes | `resolve-auth-session.ts` reads `findCompanyStatus()` and emits `activeCompany.status`. |
| Blocked-company dashboard route | ➖ Deferred | Explicitly out of scope for PR1; planned for PR3. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress` contains the TDD Cycle Evidence table for tasks 1.1–1.3. |
| All tasks have tests | ✅ | 3/3 PR1 tasks reference concrete test files. |
| RED confirmed (tests exist) | ✅ | `auth.route.test.ts`, `company.route.test.ts`, and new `0008_active_company_preferences.test.ts` exist on disk. |
| GREEN confirmed (tests pass) | ✅ | Focused route command, standalone migration proof, and typecheck all pass now. |
| Triangulation adequate | ✅ | PR1 behaviors are covered by happy-path plus negative-path route tests, plus a migration proof for schema changes. |
| Safety Net for modified files | ✅ | Modified route suites existed before this change; the migration proof file is new and correctly marked as new coverage. |

**TDD Compliance**: 6/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 0 | 0 | Vitest available |
| Integration | 21 | 3 | Vitest + Supertest + migration DB harness |
| E2E | 0 | 0 | Playwright installed but not used for PR1 scope |
| **Total** | **21** | **3** | |

---

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `apps/api/src/features/companies/presentation/company.router.ts` | 93.61% | 66.66% | 163, 181, 206-207 | ⚠️ Acceptable |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | 78.78% | 77.77% | 46-47, 65-75, 85-86 | ⚠️ Low |
| `apps/api/src/shared/presentation/error.middleware.ts` | 79.54% | 63.63% | 25, 39-40, 51-53 | ⚠️ Low |
| `apps/api/src/features/identity/presentation/auth.router.ts` | 96.49% | 87.50% | 69-70, 148-149 | ✅ Excellent |

**Average changed file coverage (files reported by the focused coverage run)**: 87.11% line coverage

Coverage command details:
```text
Command: pnpm --filter api exec vitest run --coverage src/db/migrations/__tests__/0008_active_company_preferences.test.ts src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.route.test.ts
Exit: 0
Hash: sha256:3c8a0acb5605a08ff26f9193c3dae3e6ab996f47bd2d003b571f5602da7be39f
Note: the V8 report emitted per-file coverage only for loaded production modules; schema/migration files were proven separately by the standalone migration test rather than by line coverage output.
```

---

### Assertion Quality
**Assertion quality**: ✅ All assertions verify real behavior

---

### Quality Metrics
**Linter**: ⚠️ 1 error
```text
Command: pnpm --filter api exec eslint src/app/create-app.ts src/features/identity/domain/auth.ts src/features/identity/application/resolve-auth-session.ts src/features/identity/infrastructure/drizzle-auth.gateway.ts src/features/identity/presentation/auth.router.ts src/features/identity/presentation/auth.route.test.ts src/features/companies/presentation/company.router.ts src/features/companies/presentation/company.route.test.ts src/shared/infrastructure/db/schema.ts src/shared/presentation/error.middleware.ts src/db/migrations/__tests__/0008_active_company_preferences.test.ts --max-warnings=0
Exit: 1
Hash: sha256:c510d59b6907dd1d2b714c729fcc6399f10559efcfe4cd21533182b0e70a9af4
Issue: `apps/api/src/features/companies/presentation/company.route.test.ts:472:28` — `@typescript-eslint/no-unsafe-member-access` on `meResponse.body.activeCompany`.
```

**Type Checker**: ✅ No errors

### Issues Found
**CRITICAL**: None

**WARNING**:
- ESLint fails on `apps/api/src/features/companies/presentation/company.route.test.ts:472` because the test reads `meResponse.body.activeCompany` without narrowing the response body type.
- The focused coverage run leaves `resolve-auth-session.ts` and `error.middleware.ts` below the 80% informational threshold.
- The prescribed `pnpm --filter api test -- ...` command is not file-scoped in this workspace and executed the broader api suite; scoped proof still exists because the targeted migration command and the named route suites passed inside that run.

**SUGGESTION**:
- When PR2 starts, add the missing multi-membership “selection required before tenant-scoped access” runtime proof against item routes, because `apps/api/src/features/items/presentation/item.router.ts` still derives tenant context from the first company membership rather than `activeCompany`.

### Remaining Out-of-Scope Tasks
- Phase 2 tasks 2.1–2.5 remain pending by plan.
- Phase 3 tasks 3.1–3.4 remain pending by plan.
- Phase 4 tasks 4.1–4.3 remain pending by plan.

### Verdict
PASS WITH WARNINGS
PR1 implementation satisfies the scoped active-company persistence and switch contract with passing runtime evidence, but the changed-file lint error and two low-coverage support files remain follow-up warnings.
