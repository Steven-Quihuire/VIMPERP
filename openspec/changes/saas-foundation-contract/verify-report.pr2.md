```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7600ff930a91c20c81ddb04f990d5c3c0da770a0ebcfbe278255c6b1c016ee5c
verdict: fail
blockers: 1
critical_findings: 1
requirements: 5/5
scenarios: 7/7
test_command: pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts
test_exit_code: 1
test_output_hash: sha256:94cbe4a7fb2ae50260df27ce3023273eabd480a3c145fc52f01111d936ce0686
build_command: pnpm --filter api typecheck
build_exit_code: 0
build_output_hash: sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92
```

## Verification Report

**Change**: saas-foundation-contract
**Work Unit**: PR2-verify-onboarding-items-enforcement
**Version**: PR2 scoped verification evidence
**Mode**: Strict TDD
**Scope Note**: This is a scoped PR2 verification only for tasks 2.1–2.5. Tasks 3.1–3.4 and 4.1–4.3 are intentionally out of scope and are not failures for this slice.

### Completeness
| Metric | Value |
|--------|-------|
| PR2 tasks total | 5 |
| PR2 tasks complete | 5 |
| PR2 tasks incomplete | 0 |
| Out-of-scope pending tasks | 7 |

### Build & Tests Execution
**Build / Typecheck**: ✅ Passed
```text
Command: pnpm --filter api typecheck
Exit: 0
Hash: sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92
Output:
$ tsc --noEmit
```

**Focused Receipt Command**: ❌ Failed
```text
Command: pnpm --filter api test -- src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts
Exit: 1
Hash: sha256:94cbe4a7fb2ae50260df27ce3023273eabd480a3c145fc52f01111d936ce0686
Observed runner behavior: pnpm forwarded to the api Vitest suite and executed 31 files / 144 tests, not only the two named suites.
Failure: src/features/identity/application/register.test.ts > createRegister > persists user and session through the atomic gateway method
Why it fails: the expected session payload omits `capabilities: []`, but `apps/api/src/features/identity/application/register.ts` now returns that field as part of the shared auth session contract.
```

**Supporting Direct Named-Suite Run**: ✅ 20 passed / 0 failed
```text
Command: pnpm --filter api exec vitest run src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts
Exit: 0
Hash: sha256:6f6800f76a3b6b1dc9043a706924968b3c0ef1f13bc4cf532063a6b803a8eff6
Observed: 2 files / 20 tests passed.
```

**Changed-file Lint**: ❌ Failed
```text
Command: pnpm --filter api exec eslint src/app/create-app.ts src/features/companies/application/create-company.test.ts src/features/companies/application/create-company.ts src/features/companies/application/get-current-company-summary.ts src/features/companies/domain/company.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts src/features/companies/infrastructure/drizzle-company.gateway.ts src/features/companies/infrastructure/drizzle-provisioning.recorder.ts src/features/companies/infrastructure/provisioning.recorder.test.ts src/features/companies/presentation/company.route.test.ts src/features/companies/presentation/company.router.ts src/features/identity/application/login.ts src/features/identity/application/register.ts src/features/identity/application/resolve-auth-session.ts src/features/identity/domain/auth.ts src/features/identity/presentation/auth.route.test.ts src/features/identity/presentation/auth.router.ts src/features/items/application/create-category.test.ts src/features/items/application/create-category.ts src/features/items/application/create-item.test.ts src/features/items/application/create-item.ts src/features/items/application/get-item.test.ts src/features/items/application/get-item.ts src/features/items/application/list-categories.test.ts src/features/items/application/list-categories.ts src/features/items/application/list-items.test.ts src/features/items/application/list-items.ts src/features/items/application/soft-delete-item.test.ts src/features/items/application/soft-delete-item.ts src/features/items/application/update-category.test.ts src/features/items/application/update-category.ts src/features/items/application/update-item.test.ts src/features/items/application/update-item.ts src/features/items/presentation/item.route.test.ts src/features/items/presentation/item.router.ts src/shared/presentation/error.middleware.ts --max-warnings=0
Exit: 1
Hash: sha256:d28b36abc9e33710bbe3d56e656f83c71737fd6d22c2dafecd1ae174453678d5
Key errors:
- apps/api/src/features/companies/application/create-company.test.ts:71,96,99,186,188,251,253 — @typescript-eslint/no-unsafe-assignment
- apps/api/src/features/companies/infrastructure/drizzle-company.gateway.test.ts:22,39 — @typescript-eslint/require-await
- apps/api/src/features/items/presentation/item.router.ts:206 — @typescript-eslint/no-unused-vars
```

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Multi-Step Registration and Company Capture | Required company data is completed | `apps/api/src/features/companies/presentation/company.route.test.ts > creates a company for the authenticated owner and stores the default palette preference` | ✅ COMPLIANT |
| Multi-Step Registration and Company Capture | Business creation fails after onboarding submission | `apps/api/src/features/companies/application/create-company.test.ts > records a failed provisioning step and rethrows when atomic company creation fails` | ✅ COMPLIANT |
| Item listing | List | `apps/api/src/features/items/presentation/item.route.test.ts > lists only active items from the authenticated tenant` | ✅ COMPLIANT |
| Item detail | Foreign | `apps/api/src/features/items/presentation/item.route.test.ts > returns not-found for cross-tenant item reads` | ✅ COMPLIANT |
| Item soft delete | Delete | `apps/api/src/features/items/presentation/item.route.test.ts > allows owners to soft-delete items and forbids company users` | ✅ COMPLIANT |
| Item soft delete | Forbid | `apps/api/src/features/items/presentation/item.route.test.ts > allows owners to soft-delete items and forbids company users` | ✅ COMPLIANT |
| Multi-tenant isolation | Ignore | `apps/api/src/features/items/presentation/item.route.test.ts > ignores body companyId and still writes into the authenticated active company` | ✅ COMPLIANT |

**Compliance summary**: 7/7 scoped PR2 baseline-spec scenarios compliant

### Scoped Change-Contract Evidence
| Contract expectation | Runtime proof | Result |
|----------------------|---------------|--------|
| Onboarding replays identical idempotent requests | `company.route.test.ts > replays the original company response when the same idempotency key is retried with the same payload` | ✅ COMPLIANT |
| Onboarding rejects idempotency key reuse with different payload | `company.route.test.ts > rejects reusing an idempotency key with a different payload` | ✅ COMPLIANT |
| Duplicate-company conflicts stay sanitized | `company.route.test.ts > returns a sanitized conflict when the company legal identifier already exists` | ✅ COMPLIANT |
| New company becomes the persisted active company | `company.route.test.ts > creates a company for the authenticated owner and stores the default palette preference` plus `/auth/me` assertion | ✅ COMPLIANT |
| Tenant routes require an active company when memberships exist | `item.route.test.ts > denies tenant routes when the user has memberships but no active company selected` | ✅ COMPLIANT |
| Request body `companyId` is ignored | `item.route.test.ts > ignores body companyId and still writes into the authenticated active company` | ✅ COMPLIANT |
| Delete permission is capability-based for the active company | `item.route.test.ts > forbids delete when the user is only an owner in another company, not in the active company` | ✅ COMPLIANT |
| Blocked lifecycle denies tenant item access | `item.route.test.ts > denies tenant routes when the active company lifecycle is blocked` | ✅ COMPLIANT |

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Replay binds idempotency key to normalized payload fingerprint | ✅ Implemented | `apps/api/src/features/companies/application/create-company.ts:12-89` computes a fingerprint from normalized onboarding data and returns the stored terminal result on `replay-succeeded`. |
| Company creation writes lifecycle defaults and active-company preference in one transaction | ✅ Implemented | `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts:44-140` inserts the company with `status: 'active'`, creates membership, updates theme preference, and upserts `user_preferences.active_company_id` inside one DB transaction. |
| Shared auth session contract exposes `activeCompany` plus `capabilities` | ✅ Implemented | `apps/api/src/features/identity/domain/auth.ts:31-182`, `resolve-auth-session.ts:25-99`, and `register.ts:61-68`/`login.ts:85-93` centralize the session shape used by onboarding and item routes. |
| Item routes use explicit active-company context, not body spoofing | ✅ Implemented | `apps/api/src/features/items/presentation/item.router.ts:202-212` drops body `companyId` and builds write context from authenticated route state. |
| Delete and write enforcement is capability/lifecycle based | ✅ Implemented | `apps/api/src/features/identity/domain/auth.ts:161-182`, `create-item.ts:30-61`, and `soft-delete-item.ts:23-48` require an active company, check lifecycle, and gate by `catalog.write` / `catalog.delete`. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Persist active company on onboarding in the same transaction | ✅ Yes | `drizzle-company.gateway.ts` updates `user_preferences.active_company_id` before the transaction commits. |
| Idempotent replay should return the original outcome, while changed payloads conflict | ✅ Yes | `create-company.ts` + provisioning recorder tests/route tests match the design intent. |
| Item authorization should be centralized on active company + capabilities | ✅ Yes | `requireTenantCapability` and the item use cases replace first-membership / owner-only branching. |
| Blocked-company dashboard shell route is deferred to PR3 | ➖ Deferred | The API-side blocked lifecycle denial is implemented in PR2; the dedicated web blocked-company route remains intentionally out of scope for this slice. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress` contains a TDD Cycle Evidence table for tasks 2.1–2.5. |
| All tasks have tests | ✅ | 5/5 PR2 tasks reference concrete test files, and those files exist on disk. |
| RED confirmed (tests exist) | ✅ | `create-company.test.ts`, `company.route.test.ts`, `item.route.test.ts`, `create-item.test.ts`, and `soft-delete-item.test.ts` exist, plus additional PR2 item/auth suites. |
| GREEN confirmed (tests pass) | ❌ | The required receipt command fails now because the broader suite hits the stale `register.test.ts` expectation, even though the two named PR2 suites pass in a direct Vitest run. |
| Triangulation adequate | ✅ | Replay/conflict/duplicate onboarding paths and positive/negative item authorization paths are both covered across route and application layers. |
| Safety Net for modified files | ✅ | The modified route/application suites existed before PR2 and were extended rather than added as smoke tests. |

**TDD Compliance**: 5/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 39 | 10 | Vitest |
| Integration | 36 | 4 | Vitest + Supertest + Drizzle harness |
| E2E | 0 | 0 | Playwright installed but not used for PR2 scope |
| **Total** | **75** | **14** | |

---

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `apps/api/src/features/companies/application/create-company.ts` | 96.99% | 96.00% | 99-102 | ✅ Excellent |
| `apps/api/src/features/companies/presentation/company.router.ts` | 50.99% | 100.00% | 85-203, 210-222 | ⚠️ Low |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | 75.36% | 70.83% | 46-47, 65-77, 82-83, 87-88 | ⚠️ Low |
| `apps/api/src/features/identity/presentation/auth.router.ts` | 59.82% | 66.66% | 127-135, 139-152 | ⚠️ Low |
| `apps/api/src/features/identity/application/register.ts` | 30.95% | 100.00% | 37-70 | ⚠️ Low |

**Average changed file coverage (files surfaced by the targeted coverage run)**: 62.82% line coverage

Coverage command details:
```text
Command: pnpm --filter api exec vitest run --coverage src/features/companies/application/create-company.test.ts src/features/items/presentation/item.route.test.ts
Exit: 1
Hash: sha256:4fe7a596b01b98c1c4727f55196c3e30dac5ee937d34d46b79a28adeacd173cf
Note: the two named suites passed (20/20), but Vitest failed the run on the global 80% line threshold after emitting partial per-file coverage for loaded modules.
```

---

### Assertion Quality
**Assertion quality**: ✅ All assertions verify real behavior

---

### Quality Metrics
**Linter**: ❌ 10 errors
**Type Checker**: ✅ No errors

### Issues Found
**CRITICAL**:
- The required receipt command fails because `apps/api/src/features/identity/application/register.test.ts:119-129` still expects a session payload without `capabilities: []`, while `apps/api/src/features/identity/application/register.ts:61-68` now returns the shared auth session contract with capabilities. Strict TDD verification cannot pass while the prescribed verification command is red.

**WARNING**:
- Changed-file lint fails with 10 errors across `create-company.test.ts`, `drizzle-company.gateway.test.ts`, and `item.router.ts`.
- The targeted coverage run reports several changed auth/company files below the informational 80% line threshold and fails the global 80% gate.
- The current OpenSpec baseline specs do not yet encode PR2's idempotency/lifecycle delta behaviors, so those checks were verified against the approved proposal, design, tasks artifact, and runtime tests rather than standalone spec scenarios.

**SUGGESTION**:
- Add or refresh direct unit coverage for the shared auth-session builders (`register` / `login`) whenever the session payload changes, so the receipt command cannot regress on omitted fields outside the named PR2 suites.

### Remaining Out-of-Scope Tasks
- Phase 3 tasks 3.1–3.4 remain pending by plan and are intentionally out of scope for PR2 verification.
- Phase 4 tasks 4.1–4.3 remain pending by plan and are intentionally out of scope for PR2 verification.

### Verdict
FAIL
PR2 behavior is substantially implemented and the directly targeted PR2 suites pass, but strict verification for this slice fails because the required receipt test command is currently red and changed-file lint is also failing.
