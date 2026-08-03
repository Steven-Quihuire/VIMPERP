# Proposal: SaaS Foundation Contract

## Intent

Stabilize the SaaS core contract before more ERP features spread implicit tenant and role assumptions. This slice makes tenant context explicit, centralizes capability checks, makes company onboarding safely idempotent, and adds a minimal company lifecycle contract.

## Proposal question round

- Resolved from approved assumptions: active company selection is mandatory only when a user belongs to multiple companies; lifecycle UX stays support-safe.
- Deferred for later confirmation: billing/cancelled semantics and full workspace switcher UX.

## Scope

### In Scope
- Add explicit active company context to auth/session and tenant-scoped API/UI flows.
- Replace scattered role checks with a centralized capability gate for platform-admin, company-owner, and company-user actions.
- Make create-company idempotent with stable replay, payload conflict rejection, and sanitized duplicate-company errors.
- Add minimal company lifecycle states with support-screen behavior for `suspended` and `provisioning_failed`.

### Out of Scope
- Billing, cancellation, plan enforcement, or payment flows.
- Full multi-workspace switcher UX beyond correctness-required selection.

## Capabilities

### New Capabilities
- `company-lifecycle`: Minimal tenant lifecycle states and support-safe blocked access behavior.

### Modified Capabilities
- `identity-access`: Session contract gains explicit active company context and capability evaluation.
- `company-onboarding`: Onboarding gains idempotent company creation and ownership/multi-company rules.
- `item-catalog`: Tenant-scoped item access must use explicit active company context and centralized delete permissions.
- `item-catalog-web`: Catalog UI must respect active company selection and capability-driven actions.

## Approach

Use one controlled contract slice across API and web. Extend auth/session models first, add a single permission evaluator adapter, wire idempotency through onboarding request → persistence → replay, then enforce lifecycle and tenant rules in onboarding and item flows before broader rollout.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/features/identity/**` | Modified | Active company + capability contract |
| `apps/api/src/features/companies/**` | Modified | Idempotent onboarding + lifecycle semantics |
| `apps/api/src/features/items/**` | Modified | Explicit tenant scoping + permission gate |
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | Company lifecycle and replay persistence fields |
| `apps/web/src/features/auth/**` | Modified | Session/active company contract |
| `apps/web/src/features/onboarding/**` | Modified | Active-company and support-safe onboarding UX |
| `apps/web/src/features/dashboard/**` | Modified | Selection/capability-aware tenant entry behavior |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing first-membership assumptions break flows | High | Migrate auth/session contract first and prove on items |
| Split authorization logic during rollout | Med | Route all new checks through one capability adapter |
| Duplicate onboarding creates inconsistent replay | Med | Bind key to request fingerprint and persist terminal result |

## Rollback Plan

Revert session/capability consumers to role-only behavior, disable idempotent replay path, and ignore lifecycle gating while preserving added columns as dormant state.

## Dependencies

- Existing `provisioning_runs.idempotency_key` support and current auth membership model.

## Success Criteria

- [ ] Tenant-scoped work requires a valid active company when multiple memberships exist.
- [ ] Company-owner vs company-user capabilities are enforced consistently in API and web item flows.
- [ ] Repeated create-company calls with same key and payload return the same outcome; changed payload returns conflict.
- [ ] Suspended/provisioning-failed companies see a generic support/contact experience without internal details.
