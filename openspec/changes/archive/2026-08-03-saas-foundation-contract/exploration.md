## Exploration: saas-foundation-contract

### Current State
Authentication already exposes `platform-admin`, `company-owner`, and `company-user` memberships, but sessions only carry a membership list and no explicit active tenant selection. API guards are mostly role-based via `createRequireRole(...)`, while company-scoped routes like items derive the tenant implicitly from the first membership with a non-null `companyId`. Company onboarding is atomic at the business-transaction layer and records provisioning runs, but the request path does not pass or persist a real idempotency key even though `provisioning_runs.idempotency_key` and its partial unique index already exist. Company records also have no lifecycle/status fields yet; current company access/admin semantics are inferred from membership role and null/non-null company linkage.

### Affected Areas
- `apps/api/src/features/identity/domain/auth.ts` — session and membership contract currently stop at role + nullable `companyId`.
- `apps/api/src/features/identity/presentation/auth.middleware.ts` — authorization is centralized only at the role level today.
- `apps/api/src/app/create-app.ts` — composition root wires `requirePlatformAdmin`, `requireCompanyOwner`, company onboarding, and item routes.
- `apps/api/src/features/companies/domain/company.ts` — onboarding and company summary contracts would need tenant/lifecycle/idempotency extensions.
- `apps/api/src/features/companies/presentation/company.router.ts` — create-company request currently uses request/correlation IDs but no idempotency key.
- `apps/api/src/features/companies/application/create-company.ts` — provisioning runs are started/finalized without idempotent replay semantics.
- `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts` — transactional company creation inserts company/profile/services/branches/membership/theme/notification/audit data.
- `apps/api/src/features/companies/infrastructure/drizzle-provisioning.recorder.ts` — recorder persists runs and already has schema support for `idempotencyKey`, but does not use it.
- `apps/api/src/shared/infrastructure/db/schema.ts` — `companies`, `memberships`, and `provisioning_runs` schema are the core persistence touchpoints.
- `apps/api/src/features/items/presentation/item.router.ts` — item routes derive `companyId` implicitly from the first non-null membership.
- `apps/web/src/features/auth/domain/auth.ts` — frontend session contract mirrors backend memberships only.
- `apps/web/src/features/onboarding/domain/onboarding.ts` — onboarding access is inferred from `memberships.some(role === platform-admin || companyId)`.
- `apps/web/src/features/dashboard/domain/dashboard.ts` — dashboard/company labeling relies on the first membership and role-only checks.

### Approaches
1. **Single foundation contract slice** — Add one cross-cutting contract for active tenant context, capability evaluation, onboarding idempotency, and minimal company lifecycle before more feature work.
   - Pros: fixes the architectural seams once; aligns API and web on one tenant/access model; prevents more implicit-company behavior from spreading.
   - Cons: touches auth/session, company, onboarding, and guarded routes together; requires careful migration of existing session consumers.
   - Effort: Medium

2. **Piecemeal fixes per feature** — Patch onboarding idempotency first, then tenant context, then permissions, then lifecycle when each feature needs it.
   - Pros: smaller immediate diffs.
   - Cons: keeps implicit membership resolution and role-only authorization alive longer; likely duplicates contract churn across API/web/tests.
   - Effort: Medium/High

### Recommendation
Use **Single foundation contract slice**, but keep it controlled: define an explicit active tenant contract, introduce a centralized capability gate that can answer both platform and company-admin semantics, make onboarding idempotent on create-company, and add only minimal company lifecycle fields/semantics (`status/state` plus access/admin meaning). Do **not** expand into billing, multi-tenant switching UX breadth, or broad feature rewrites yet. First migration targets should be auth/session resolution, company onboarding, and one company-scoped route family such as items so the contract is proven end to end.

### Risks
- Existing API and web code often assumes the first membership or any non-null membership is the current tenant; changing that contract will ripple through route context and dashboard/onboarding guards.
- Role-only middleware is currently simple and widespread; introducing capabilities without a clean adapter could create split authorization logic during migration.
- Real idempotency needs persistence and replay semantics, not just a unique key, so duplicate onboarding requests must return a stable prior result instead of a raw conflict.
- Company lifecycle fields can leak into unrelated UX if the first version is not explicitly limited to access/admin semantics.

### Ready for Proposal
Yes — propose a controlled foundation change scoped to: explicit active tenant context, centralized capability evaluation, idempotent company onboarding, and minimal company lifecycle semantics without billing.
