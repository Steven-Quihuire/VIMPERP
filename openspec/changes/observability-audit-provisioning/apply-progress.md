# Apply Progress: Observability Audit Provisioning

## Change
observability-audit-provisioning

## Work Unit
PR 2 / Observability foundation (`pr-2/observability-foundation` -> `pr-1/schema-baseline`)

## Previous Progress Merged
- Prior batch created RED scaffolding only for `0003_company_services.test.ts` and stopped because Docker/Postgres was unavailable.
- Baseline PR 1 implementation completed tasks 1.1-1.7 and passed the focused migration suite plus runtime `drizzle-kit migrate`.
- PR 2 completed the shared observability foundation: sanitizer, correlation/request context propagation, and error middleware recorder integration.

## Completed Tasks
- [x] 1.1 `0003_company_services.test.ts`
- [x] 1.2 `0003_company_services.sql`
- [x] 1.3 `0004_audit_events.test.ts`
- [x] 1.4 `0004_audit_events.sql`
- [x] 1.5 `0005_observability.test.ts`
- [x] 1.6 `0005_observability.sql`
- [x] 1.7 `schema.ts` observability schema updates
- [x] 2.1 `error-sanitizer.test.ts`
- [x] 2.2 `error-sanitizer.ts`
- [x] 2.3 `error.middleware.test.ts`
- [x] 2.4 `error.middleware.ts` recorder integration
- [x] 2.5 `observability.ts` correlation/request context propagation

## Correction Batch
- [x] R3-001 Added RED coverage for malformed and non-array legacy `company_profiles.services`, then made `0003_company_services.sql` fall back to an empty array when parsing fails or the parsed JSON is not an array.
- [x] R3-002 Added RED coverage for malformed legacy `audit_events.details`, then made `0004_audit_events.sql` preserve invalid raw text as `{"legacyRaw": <text>}` instead of aborting.
- [x] R3-003 Replaced malformed legacy `audit_events.details` raw-text preservation with a safe JSONB marker so malformed secrets are not exposed after migration.

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/db/migrations/__tests__/0003_company_services.test.ts` | Integration | ✅ Baseline rerun before edits: `4 passed` across `0003` + `0004` migration tests | ✅ Added failing malformed-JSON and non-array cases (`invalid input syntax for type json`, `cannot extract elements from an object`) | ✅ Focused rerun passed after `0003_company_services.sql` safe-parse fallback | ✅ 2 new edge cases plus existing happy/blank-array coverage | ✅ Extracted SQL fallback via temporary helper function and empty-array coercion without changing legacy column semantics |
| 1.3 | `apps/api/src/db/migrations/__tests__/0004_audit_events.test.ts` | Integration | ✅ Same baseline rerun before edits: `4 passed` across `0003` + `0004` migration tests | ✅ Added failing malformed-details case (`invalid input syntax for type json`) | ✅ Focused rerun passed after `0004_audit_events.sql` safe wrapper cast | ✅ New malformed-details case plus existing structured-json and index cases | ✅ Encapsulated fallback in a temporary helper function so valid JSON stays unchanged while invalid text is preserved |
| 1.3 / R3-003 | `apps/api/src/db/migrations/__tests__/0004_audit_events.test.ts` | Integration | ✅ Baseline rerun before edits: `3 passed` in `0004_audit_events.test.ts` | ✅ Replaced malformed-details expectation with safe-marker JSONB and secret non-leak assertion; RED: exit 1, `1 failed | 2 passed` | ✅ Focused rerun passed after `0004_audit_events.sql` returned `{"malformedLegacyDetails": true}`; GREEN: exit 0, `3 passed` | ✅ Existing valid-JSON migration case still passes alongside malformed secret case | ✅ Minimal SQL change only: fallback marker no longer stores source text |
| 2.1 | `apps/api/src/shared/infrastructure/observability/error-sanitizer.test.ts` | Unit | N/A (new file) | ✅ Added failing allowlist/redaction/fingerprint tests; RED: exit 1, `Cannot find module './error-sanitizer'` | ✅ Focused rerun passed after `error-sanitizer.ts`; GREEN: exit 0, `2 passed` | ✅ Covered allowlisted context retention plus equivalent-secret fingerprint stability/truncation | ✅ Extracted redaction, truncation, and fingerprint helpers without changing the persisted contract |
| 2.3 | `apps/api/src/shared/presentation/error.middleware.test.ts` | Integration | ✅ Baseline rerun before edits: `12 passed` across admin/company/auth routes | ✅ Added failing 500-recording tests; RED: exit 1, `2 failed` because `createErrorMiddleware` did not exist | ✅ Focused rerun passed after middleware factory + recorder integration; GREEN: exit 0, `2 passed` | ✅ Covered successful recorder path plus swallowed recorder failure path over a real Express request | ✅ Kept middleware response contract unchanged while isolating recorder injection behind a no-op default |
| 2.5 | `apps/api/src/shared/presentation/error.middleware.test.ts` | Integration | ✅ Same baseline rerun before edits: `12 passed` across admin/company/auth routes | ✅ Added failing correlation/request-context assertions inside the 500-recording route test before touching `observability.ts` | ✅ Focused rerun passed after bounded `x-correlation-id` handling and `response.locals.requestContext`; GREEN: exit 0, `2 passed` | ✅ Covered explicit bounded header propagation and default fallback to `x-request-id` when no correlation header is provided | ✅ Logged correlation alongside request ids and kept the middleware API backward-compatible |

## Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test src/shared/infrastructure/observability/error-sanitizer.test.ts src/shared/presentation/error.middleware.test.ts src/features/admin/presentation/admin.route.test.ts src/features/companies/presentation/company.route.test.ts src/features/identity/presentation/auth.route.test.ts` -> exit 0, `5 passed` files / `16 passed` tests |
| Runtime harness command/scenario and exact result | `pnpm --filter api test src/shared/presentation/error.middleware.test.ts` -> exit 0, `2 passed`; scenario exercises a real Express request through `createRequestContextMiddleware` + `createErrorMiddleware`, proving sanitized persistence and failure-swallowed 500 handling |
| Rollback boundary | Revert `apps/api/src/shared/infrastructure/observability/error-sanitizer.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, `apps/api/src/shared/presentation/observability.ts`, and the two new shared test files; scope is limited to shared sanitizer/correlation/error-recording behavior for PR 2 |

## Remaining Tasks
- [ ] Phase 3 / PR 3 tasks 3.1-3.10
- [ ] Phase 4 / PR 4 tasks 4.1-4.6
- [ ] Phase 5 / PR 5 tasks 5.1-5.6
- [ ] Phase 6 verification tasks 6.1-6.4

## Notes
- `0003_company_services.sql` now tolerates malformed JSON and valid non-array JSON by parsing through a helper function and coercing unsupported shapes to `[]`, which preserves successful backfill behavior for real arrays and prevents migration aborts.
- `0004_audit_events.sql` now replaces malformed legacy `details` text with `{"malformedLegacyDetails": true}` so migration inspectability remains intact without persisting raw secrets.
- `error-sanitizer.ts` now persists allowlisted context only, redacts credential-shaped strings in message/stack, truncates stored text, and hashes fingerprints from normalized redacted messages.
- `createRequestContextMiddleware` now preserves `x-request-id`, honors bounded valid `x-correlation-id` values, falls back to `requestId`, and stores both ids on `response.locals.requestContext` for later PR 3 orchestration work.
- `createErrorMiddleware` wraps 500 recording behind an injected recorder port with a no-op default so PR 2 stays backward-compatible until PR 3 wires the real Drizzle recorder.

## Correction Evidence: review-f144c45cfc6af3ed
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test src/db/migrations/__tests__/0004_audit_events.test.ts` -> Safety net: exit 0, `3 passed`; RED: exit 1, `1 failed | 2 passed`; GREEN: exit 0, `3 passed` |
| Runtime harness command/scenario and exact result | `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vimcore pnpm --filter api exec drizzle-kit migrate` -> exit 0, `migrations applied successfully!` against Docker Postgres |
| Rollback boundary | Revert `apps/api/src/db/migrations/0004_audit_events.sql` and `apps/api/src/db/migrations/__tests__/0004_audit_events.test.ts`; correction scope only changes malformed legacy audit-details fallback behavior |

## Correction Evidence: review-98bbf783dfc2b175
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test src/shared/infrastructure/observability/error-sanitizer.test.ts src/shared/presentation/error.middleware.test.ts` -> RED before fix: exit 1, `4 failed | 5 passed`; long JSON secret RED: exit 1, `1 failed | 8 passed`; GREEN after fix: exit 0, `2 passed` files / `9 passed` tests |
| Runtime harness command/scenario and exact result | N/A as a separate command; the focused command includes `src/shared/presentation/error.middleware.test.ts`, whose real Express scenarios prove synchronous and rejected recorder failures are swallowed before returning the generic 500 body |
| Rollback boundary | Revert `apps/api/src/shared/infrastructure/observability/error-sanitizer.ts`, `apps/api/src/shared/infrastructure/observability/error-sanitizer.test.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, `apps/api/src/shared/presentation/error.middleware.test.ts`, and this evidence section; correction scope only changes PR2 sanitizer and error-recorder safety behavior |
