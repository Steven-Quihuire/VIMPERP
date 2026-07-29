# Design: Observability Audit Provisioning

## Technical Approach

Wrap the existing atomic onboarding transaction (`drizzle-company.gateway.ts`) with observability writes that commit **outside** it: a provisioning run starts before the business transaction and finalizes after, so failure evidence survives rollback. Normalize `company_profiles.services` into `company_services`, upgrade `audit_events` to JSONB with correlation/entity metadata, add sanitized `application_errors`, and expose everything via the existing admin slice and dashboard shell, following the established factory + gateway port pattern and `requirePlatformAdmin` middleware.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Evidence durability | Sequential writes on same `AppDb`, outside `db.transaction` | Separate pool; savepoints | Pool is `max: 1` (`client.ts`); savepoints roll back with the parent tx. Pre/post-tx commits survive rollback. |
| Orchestration | `create-company.ts` via new `ProvisioningRecorder` domain port (`startRun`/`succeedRun`/`failRun`) | Middleware; gateway internals | Keeps domain framework-free; gateway stays one atomic write. |
| Correlation | Middleware honors `x-correlation-id` (bounded, sanitized), defaults to `requestId`; stored on `response.locals.requestContext` | AsyncLocalStorage | Matches existing `response.locals.auth` pattern; no new deps. |
| Services normalization | `company_services` table; dual-write legacy text column (deprecated) in same tx | Drop text column now | Dual-write keeps reads unchanged and rollback trivial; drop deferred. |
| Audit upgrade | `details` text → `jsonb` (`USING details::jsonb`); add correlation/entity/old/new columns | Sidecar table | Existing values are `JSON.stringify` output — cast is safe; one table keeps admin queries simple. |
| Step granularity | Success: all named steps succeeded; failure: one failed `company-creation` step | Intra-tx markers | The tx is atomic — intra-tx steps cannot persist. Honest granularity without savepoints. |
| Error capture | Central `error-sanitizer.ts`; allowlist-only context + regex token redaction + truncation; fingerprint = sha256(process, code, route, normalized message). `errorMiddleware` records 500s, failure-swallowed | Denylist; blocking writes | Allowlist structurally prevents leakage; observability must never break the request path. |
| APIs & UI | Extend `admin` slice (6 list/detail routes) + `/dashboard/admin/*` routes guarded by `canViewAdminSignals` | New feature; embed in dashboard-page | Reuses role middleware, gateway, and TanStack Query `enabled` patterns. |
| Stale-run sweep | In-process interval worker started in `main.ts`, calling a `sweepStaleProvisioningRuns` use case; runs stuck `running` past the stale threshold → `incomplete` | External cron; derived display only | User decision: sweep is in MVP. Repo has no scheduler — an unref'd `setInterval` adds zero deps/infra. One bounded UPDATE per cadence is negligible against pool `max: 1`. Sweep errors are caught and logged (observability never breaks the request path). Retry/re-run stays out of MVP. |

## Data Flow

    POST /companies
      middleware → response.locals { requestId, correlationId }
      create-company use case:
        recorder.startRun(correlationId)      ← commits (running)
        gateway.createCompany(input)          ← ONE atomic tx
        success → recorder.succeedRun(steps)  ← commits
        failure → recorder.failRun(sanitized) ← commits, rethrows
                  └─ application_errors row (fingerprint)

    background sweeper (interval, unref'd timer):
        sweepStaleProvisioningRuns(olderThan = now - staleTimeout)
          UPDATE provisioning_runs SET status='incomplete'
          WHERE status='running' AND created_at < olderThan
        (covers crashed process / failed final write; stale runs have no step rows)

## Schema Changes (drizzle-kit generate, three migrations)

- `0003` — `company_services` (`id` PK, `company_id`, `name`, `created_at`; unique `(company_id, name)`). Backfill via `jsonb_array_elements_text(services::jsonb)`, `DISTINCT`, empties trimmed.
- `0004` — `audit_events`: `details` → jsonb; add `correlation_id`, `entity_type`, `entity_id`, `old_values`/`new_values` jsonb NULL; indexes `(company_id, created_at)`, `correlation_id`. Append-only by convention: no UPDATE/DELETE paths, no delete UI/API.
- `0005` — enums `provisioning_status` (`running`,`succeeded`,`failed`,`incomplete`), `provisioning_step_status` (`pending`,`succeeded`,`failed`,`skipped`); `provisioning_runs` (ids, `correlation_id`, `request_id`, `actor_user_id`, `process`, `status`, `attempt` default 1, `idempotency_key` NULL, `error_summary` NULL, timestamps; partial unique `(process, idempotency_key)`); `provisioning_steps` (`id`, `run_id`, `name`, `status`, `attempt`, `detail` jsonb NULL, `created_at`); `application_errors` (`id`, `correlation_id`, `request_id`, `fingerprint`, `status`, `code`, `message`, `stack` NULL, `context` jsonb NULL, `created_at`; indexes `correlation_id`, `fingerprint`).

Sanitizer contract — **allowed context keys only**: `route`, `method`, `statusCode`, `code`, `process`, `stepName`, `companyId`. **Forbidden**: auth/cookie headers, passwords, tokens, API keys, session material, secrets, full request bodies. Message ≤500 chars, stack ≤4000 chars, credential-shaped strings regex-redacted.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | New tables, enums, audit columns |
| `apps/api/src/db/migrations/000{3,4,5}_*.sql` | Create | Normalization+backfill; audit upgrade; observability tables |
| `apps/api/src/shared/presentation/observability.ts` | Modify | `requestContext` on `response.locals`; honor `x-correlation-id` |
| `apps/api/src/shared/infrastructure/observability/error-sanitizer.ts` | Create | Allowlist sanitizer + fingerprint |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modify | Factory recording sanitized 500s |
| `apps/api/src/features/companies/domain/company.ts` | Modify | `ProvisioningRecorder` port, `correlationId` input |
| `apps/api/src/features/companies/application/create-company.ts` | Modify | Run/step orchestration around tx |
| `apps/api/src/features/companies/application/sweep-stale-provisioning-runs.ts` | Create | Sweeper use case: stale `running` → `incomplete` |
| `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts` | Modify | `company_services` insert; audit jsonb/correlation/entity |
| `apps/api/src/features/companies/infrastructure/drizzle-provisioning.recorder.ts` | Create | Recorder adapter (runs, steps, errors, sweep update) |
| `apps/api/src/features/admin/domain/admin.ts` | Modify | Observability read types + gateway methods |
| `apps/api/src/features/admin/application/` | Create | 6 use cases (list/get runs, errors, audit events) |
| `apps/api/src/features/admin/infrastructure/drizzle-admin.gateway.ts` | Modify | Filtered list/detail queries |
| `apps/api/src/features/admin/presentation/admin.router.ts` | Modify | 6 routes behind `requirePlatformAdmin` |
| `apps/api/src/app/create-app.ts` | Modify | Wire recorder, sanitizer, use cases |
| `apps/api/src/main.ts` | Modify | Start sweep interval worker (unref'd timer, errors caught + logged) |
| `apps/web/src/features/dashboard/{domain,infrastructure,presentation}` | Modify/Create | Types, client fns, query hooks, list/detail screens |
| `apps/web/src/app/app.tsx` | Modify | Guarded `/dashboard/admin/*` routes |

## Interfaces / Contracts

Routes (all `requireAuth` + `requirePlatformAdmin`, Zod-validated query/params, cursor = `created_at`+`id`):
`GET /admin/provisioning-runs?status&correlationId&limit&cursor`, `GET /admin/provisioning-runs/:id` (with steps), `GET /admin/application-errors?fingerprint&correlationId`, `GET /admin/application-errors/:id`, `GET /admin/audit-events?type&companyId&correlationId`, `GET /admin/audit-events/:id`.

Sweeper contract — `ProvisioningRecorder` port gains `sweepStaleRuns(olderThan: Date): Promise<number>` (returns rows marked `incomplete`). Config via env, Zod-validated at boot: `PROVISIONING_STALE_TIMEOUT_MS` (default 15 min) and `PROVISIONING_SWEEP_INTERVAL_MS` (default 5 min). The worker runs the use case each interval; a rejected sweep promise is caught and logged, never thrown.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Sanitizer; orchestration success + rollback paths; admin use cases; sweeper (only stale `running` rows transitioned; `succeeded`/`failed` untouched; sweep errors swallowed + logged) | Vitest, stub recorder/gateway |
| Route | 200 platform-admin, 403 company roles, 401 anonymous; Zod rejection | Extend `admin.route.test.ts` supertest pattern |
| Migration | Backfill from text JSON; legacy `details::jsonb` cast | Run against Docker Postgres |
| Web | Admin sees observability screens; company-user redirected | Extend `app.dashboard-shell.test.tsx` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. HTTP API + DB schema changes only.

## Migration / Rollout

Single deploy; migrations first (additive backfill; dual-write keeps legacy reads valid). Rollback: revert UI/routes, instrumentation, then drop new tables — the legacy `services` text column stays populated, so no restore step needed in MVP.

## Extension Point (documented, not implemented)

Recorder ports and `shared/presentation/observability.ts` are the seam: later adapters can forward sanitized errors to Sentry, ship pino logs to Loki, or add OpenTelemetry spans — without touching feature code.

## Open Questions

None — both resolved by user decision:

- **Stale `running` runs**: sweep job is in MVP (see Architecture Decisions and Data Flow); a backend sweeper marks runs stuck `running` past the stale threshold as `incomplete`. Retry/re-run remains out of MVP.
- **Retention**: confirmed — none/non-deletable for MVP; `application_errors` and `provisioning_runs` are append-only with no purge path.
