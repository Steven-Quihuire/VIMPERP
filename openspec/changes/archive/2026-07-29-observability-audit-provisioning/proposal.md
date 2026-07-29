# Proposal: Observability Audit Provisioning

## Intent

Make onboarding failures diagnosable without weakening the existing atomic business transaction. Normalize JSON-in-text persistence, persist sanitized evidence, and expose first-slice Super Admin visibility.

## Scope

### In Scope
- Normalize services into `company_services`.
- Upgrade `audit_events` with JSONB payloads, `correlation_id`, and entity metadata.
- Add `provisioning_runs`, `provisioning_steps`, and sanitized `application_errors`.
- Thread requestId into onboarding persistence and admin reads.
- Add Super Admin process/error/audit list-detail APIs/screens.
- Document later Sentry/Loki/OTel extension points.

### Out of Scope
- Retry/re-run behavior, external observability tooling, and delete UI.

## Capabilities

### New Capabilities
- `provisioning-observability`: Onboarding run/step history.
- `application-error-observability`: Sanitized error capture/inspection.
- `audit-event-management`: Audit list/detail inspection.

### Modified Capabilities
- `company-onboarding`: Preserve atomic creation while recording process evidence.
- `dashboard-shell`: Add Super Admin visibility screens.
- `identity-access`: Keep observability APIs/screens Super Admin-only.

## decisions_encoded

- Super Admin/platform-admin visibility only.
- Append-only audit/provisioning; no delete UI.
- No retry UI/behavior in MVP.
- Store only sanitized technical error fields; never secrets, auth material, headers, API keys, or full payloads.
- Keep company creation atomic in one SQL transaction.
- Include future state/idempotency fields without implementing recovery.

## Approach

Use separate observability writes around the existing onboarding transaction: create a run before it, keep company creation atomic, then finalize run/steps or sanitized errors outside it so failure evidence survives rollback. Use feature-first backend slices and TanStack Query admin screens.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | DB models. |
| `apps/api/src/db/migrations/` | New | Backfill. |
| `apps/api/src/features/companies/` | Modified | Instrumentation. |
| `apps/api/src/features/admin/` | Modified | Read APIs. |
| `apps/web/src/features/dashboard/` | Modified | Admin screens. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unsafe migration | Med | Validate casts, dedupe services, verify on Postgres. |
| Secret leakage in errors | Med | Central sanitizer and allowlisted fields only. |
| Observability write failure | Med | Explicit incomplete state and correlation_id for reconciliation. |
| Scope exceeds review budget | High | Slice by schema, instrumentation, API, UI; ask before PR splitting. |

## Rollback Plan

Revert UI/routes, instrumentation, then schema. If rolling back normalization, restore `company_profiles.services` from `company_services` first.

## Dependencies

- Existing pino/requestId middleware, Drizzle Kit migrations, and platform-admin authorization.

## Success Criteria

- [ ] Failed onboarding leaves durable records with matching `correlation_id`.
- [ ] Successful onboarding remains atomic.
- [ ] Services persist as child records.
- [ ] Super Admin can inspect process, error, and audit views.
- [ ] External observability is documented as later-only.
