# Proposal: Backend Inventory Foundation

## Intent

Archived migration `0027` landed stock tables, triggers, seeds, tests — no backend. Deliver the `inventory` API slice: document lifecycle, confirm-time quant maintenance (moving weighted average), strict lot gating, generated numbering, reversal, lot/quant queries.

## Scope

### In Scope
- New slice `apps/api/src/features/inventory/`.
- Routes under `/companies/:companyId`: `stock-documents` create/list/get + draft line add/update/remove + `confirm|cancel|reversal`; `stock-lots` create/list; `stock` quant list. Permissions `inventory.documents.*`, `inventory.stock.*`; actor `auth.user.id`.
- Confirm: transactional draft→confirmed + quant upsert with MWA (avg `NULL` at qty 0); transfer = out + in.
- Server-generated `documentNo`: uppercase company + origin-scope prefix + 5-digit sequence, unique per company.
- Strict lots: batch ⇒ required; serial ⇒ required + qty 1/line; none ⇒ forbidden; no auto-create.
- Adjustment confirm requires `inventory.documents.confirm` + `inventory.stock.adjust`.
- Cancel: draft flips status; confirmed cancels with compensating quant maintenance (reversal stays audit-richer; chaining allowed).
- PG trigger/constraint error translation; `create-app.ts` wiring; strict-TDD tests.

### Out of Scope
Frontend; schema/migrations; reservation/quarantine; FIFO/cost layers; valuation; RLS; POS movements; movements endpoint.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `inventory-stock`: add backend requirements (lifecycle, numbering, draft line editing, confirm/cancel/reversal, lot gating, lot/quant queries, permissions, auth-scoped API, error translation) and widen the DB-only scope boundary to permit API (UI excluded).

## Approach

Mirror `hr-timesheets`: use-case factories, composite-tenant Drizzle gateway, `createRequireHrCapability` + `ensureCompanyAccess`, centralized errors, gateway-owned cross-feature reads. Strict-TDD slices (auto-chain): S1 domain+application in-memory (state machine, MWA, reversal negation, documentNo generator); S2 gateway on real PG (tx confirm, quant upsert incl. NULL-lot, trigger translation); S3 router+middleware+wiring (supertest); optional S4 split.

## Affected Areas

| Area | Impact |
|---|---|
| `apps/api/src/features/inventory/` | New |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modified |
| `apps/api/src/app/create-app.ts` | Modified |

## Risks

| Risk | L | Mitigation |
|---|---|---|
| Exceeds 800-line budget | High | auto-chain slices; sdd-tasks forecast |
| Trigger errors: message-only | Med | tested message-matching helper |
| MWA on string numerics | Med | pure function + rounding tests |
| Branch missing DB foundation | High | rebase onto `horas` before apply |

## Rollback Plan

Additive, backend-only: revert slice commits, middleware registrations, wiring; schema/seeds stay valid.

## Dependencies

- DB foundation (`0027`, schema, seeds, spec) lives only on `horas`; worktree branch sits at merge-base — rebase before apply.
- Baseline org-hierarchy typecheck failure: verify scoped to `pnpm --filter api`.

## Success Criteria

- [ ] Tenancy + permissions enforced; cross-company → 403; adjustment double-gate proven.
- [ ] Confirm maintains quants + MWA for all four types; qty→0 ⇒ avg `NULL`.
- [ ] Generated `documentNo` unique; strict lots; draft-only line edits; cancel compensates quants; reversal chaining.
- [ ] Trigger/constraint errors → 4xx; `pnpm --filter api test` green.
