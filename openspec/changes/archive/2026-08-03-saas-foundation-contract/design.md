# Design: SaaS Foundation Contract

## Technical Approach

Keep one API/web contract, but make `activeCompany` a persisted user preference. `resolveAuthSession` reads memberships, the saved company, and lifecycle, then returns capabilities plus the active company. Company switching becomes a validated mutation with lightweight throttling and last-write-wins. If the active company is `suspended` or `provisioning_failed`, the web app stays in the dashboard shell and redirects to a dedicated blocked-company route with generic support guidance.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Active company persistence | Session / theme prefs / dedicated prefs | Dedicated `user_preferences.active_company_id` | User-scoped and cross-session. |
| Switch API placement | Auth route / company route | `PATCH /me/active-company` | Fits company lifecycle ownership. |
| Switch throttle | Memory / new table / audit count | Count recent `audit_events` | Cross-instance and reusable. |
| Conflict model | CAS / queue / last write wins | Last write wins | Simple after membership validation. |
| Blocked-company UX placement | Onboarding / modal / dashboard route | Dashboard child route | Post-creation operational state; keep shell, avoid leaking internals. |

## Data Flow

```text
GET /auth/me
  -> resolveAuthSession
  -> memberships + user_preferences.activeCompanyId
  -> validate/auto-select active company
  -> load company.status + capabilities
  -> AuthSession

PATCH /me/active-company
  -> requireAuth
  -> count actor switch events in last 60s (<10)
  -> verify membership for requested company
  -> upsert user_preferences.activeCompanyId
  -> append audit event
  -> 204; next /auth/me reflects new company

POST /companies
  -> create company + membership + lifecycle defaults
  -> set new company as active preference in same transaction

GET /dashboard/*
  -> useAuth -> /auth/me
  -> if activeCompany.status in {suspended, provisioning_failed}
  -> Navigate to /dashboard/company-status
  -> render DashboardShell + blocked-company page
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | Add `user_preferences.active_company_id` and `companies.status`. |
| `apps/api/src/features/identity/{domain,application,infrastructure}/*` | Modify | Resolve active company, lifecycle, and capabilities from persisted state. |
| `apps/api/src/features/companies/{domain,application,infrastructure,presentation}/*` | Modify/Create | Add `PATCH /me/active-company`, throttle, audit, and preference writes. |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modify | Map generic 429. |
| `apps/web/src/features/auth/domain/auth.ts` | Modify | Mirror `activeCompany` + lifecycle. |
| `apps/web/src/app/app.tsx` | Modify | Redirect blocked companies to `/dashboard/company-status`. |
| `apps/web/src/features/onboarding/domain/onboarding.ts` | Modify | Restrict onboarding to no-company users. |
| `apps/web/src/features/dashboard/domain/dashboard.ts` | Modify | Add blocked-company route helper/section label. |
| `apps/web/src/features/dashboard/presentation/blocked-company-page.tsx` | Create | Generic support-safe blocked screen. |
| `apps/web/src/app/app.{auth,onboarding}.test.tsx` | Modify | Cover route decisions. |

## Interfaces / Contracts

```ts
type UserPreference = { userId: string; activeCompanyId: string | null };
type SetActiveCompanyInput = { userId: string; companyId: string };
type AuthSession = {
  user: AuthUser;
  memberships: AuthMembership[];
  activeCompany: { companyId: string; status: CompanyLifecycle } | null;
  capabilities: AuthCapability[];
};

type BlockedCompanyViewModel = {
  status: 'suspended' | 'provisioning_failed';
  title: string;
  body: string;
  supportHref: string;
};
```

`PATCH /me/active-company` accepts `{ companyId: string }`, returns `204`, and uses a generic `429` on throttle.

`/dashboard/company-status` is only for blocked active companies. Copy MUST stay generic and MUST NOT expose provisioning traces, correlation IDs, or internal failure reasons.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Resolution, fallback, lifecycle, throttle | Vitest in identity/companies slices. |
| Integration | `/auth/me`, saved preference, invalid preference, switch happy path, non-member, 429 | Supertest + Drizzle gateway tests. |
| Web route | `/onboarding` vs `/dashboard` vs `/dashboard/company-status` | RTL in `apps/web/src/app/*.test.tsx`. |
| E2E | Reload persistence, blocked shell route, generic 429 | Playwright tenant flows. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-file classification boundary | None | None |
| Git repository selection | N/A — no git process invocation | None | None |
| Commit state | N/A — no commit automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR/process command composition | None | None |

## Migration / Rollout

Add `user_preferences` with nullable `active_company_id`; no destructive backfill. Existing companies backfill `status='active'`. Multi-company users start with null preference; single-membership users may be auto-selected. Release API/session contract before web guards.

## Open Questions

None.
