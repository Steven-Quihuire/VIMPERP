# Apply Progress: Observability Audit Provisioning

## Change
observability-audit-provisioning

## Work Unit
PR 1 / Schema baseline (`pr-1/schema-baseline` -> `feature/observability-audit-provisioning`)

## Previous Progress Merged
- Prior batch created RED scaffolding only for `0003_company_services.test.ts` and stopped because Docker/Postgres was unavailable.
- Baseline PR 1 implementation completed tasks 1.1-1.7 and passed the focused migration suite plus runtime `drizzle-kit migrate`.

## Completed Tasks
- [x] 1.1 `0003_company_services.test.ts`
- [x] 1.2 `0003_company_services.sql`
- [x] 1.3 `0004_audit_events.test.ts`
- [x] 1.4 `0004_audit_events.sql`
- [x] 1.5 `0005_observability.test.ts`
- [x] 1.6 `0005_observability.sql`
- [x] 1.7 `schema.ts` observability schema updates

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

## Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test src/db/migrations/__tests__/0003_company_services.test.ts src/db/migrations/__tests__/0004_audit_events.test.ts` -> RED: exit 1, `3 failed | 4 passed`; GREEN: exit 0, `7 passed` |
| Runtime harness command/scenario and exact result | `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vimcore pnpm --filter api exec drizzle-kit migrate` -> exit 0, `migrations applied successfully!` against Docker Postgres |
| Rollback boundary | Revert `apps/api/src/db/migrations/0003_company_services.sql`, `apps/api/src/db/migrations/0004_audit_events.sql`, and the two migration test files; correction scope is limited to legacy JSON fallback behavior for PR 1 schema migrations |

## Remaining Tasks
- [ ] Phase 2 / PR 2 tasks 2.1-2.5
- [ ] Phase 3 / PR 3 tasks 3.1-3.10
- [ ] Phase 4 / PR 4 tasks 4.1-4.6
- [ ] Phase 5 / PR 5 tasks 5.1-5.6
- [ ] Phase 6 verification tasks 6.1-6.4

## Notes
- `0003_company_services.sql` now tolerates malformed JSON and valid non-array JSON by parsing through a helper function and coercing unsupported shapes to `[]`, which preserves successful backfill behavior for real arrays and prevents migration aborts.
- `0004_audit_events.sql` now replaces malformed legacy `details` text with `{"malformedLegacyDetails": true}` so migration inspectability remains intact without persisting raw secrets.
- PR 2+ scope remains untouched.

## Correction Evidence: review-f144c45cfc6af3ed
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api test src/db/migrations/__tests__/0004_audit_events.test.ts` -> Safety net: exit 0, `3 passed`; RED: exit 1, `1 failed | 2 passed`; GREEN: exit 0, `3 passed` |
| Runtime harness command/scenario and exact result | `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vimcore pnpm --filter api exec drizzle-kit migrate` -> exit 0, `migrations applied successfully!` against Docker Postgres |
| Rollback boundary | Revert `apps/api/src/db/migrations/0004_audit_events.sql` and `apps/api/src/db/migrations/__tests__/0004_audit_events.test.ts`; correction scope only changes malformed legacy audit-details fallback behavior |
