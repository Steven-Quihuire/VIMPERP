# Proposal: Item Catalog

## Intent
Deliver the first ERP business module: a backend-first, multi-tenant item catalog for products and services, so companies can register commercial items before inventory phase 2. This slice standardizes item master data, RBAC, categories, and auditability.

## Proposal Assumptions
- Proposal question round already completed offline; decisions below are resolved.
- Single-currency assumption is explicit: **USD only for Ecuador; no currency field on items or companies in this slice**.

## Scope
### In Scope
- Add `items` with unified `type`, optional tenant-unique `sku`, enum unit, `unitPrice`, `tracksStock`, `trackBatchMode`, `deletedAt`, and `categoryId`.
- Add company-scoped hierarchical `item_categories` and item CRUD/list/detail APIs with tenant isolation from `AuthSession.memberships.companyId`.
- Enforce RBAC (`company-owner` + `company-user` create/update, only `company-owner` soft-delete) and append audit events on create/update/delete.

### Out of Scope
- Inventory, warehouses, stock levels/movements, lots/serial execution, transfers, alerts.
- Frontend UI, CSV import, variants, suppliers/manufacturers, taxes, price lists, multi-currency.

## Capabilities
### New Capabilities
- `item-catalog`: company-scoped catalog and category management for products/services with forward-compatible inventory metadata.

### Modified Capabilities
- None.

## Approach
Implement a new `apps/api/src/features/items/` vertical slice (domain → application → infrastructure → presentation). Keep domain free of Express/Drizzle/Zod; validate with Zod only in presentation. Extend Drizzle schema and migrations under `apps/api/src/shared/infrastructure/db/schema.ts` and `apps/api/src/db/migrations/`. Wire routes/use cases in `apps/api/src/app/create-app.ts`. Exclude soft-deleted rows by default.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/features/items/` | New | Item/category slice, use cases, gateways, routes |
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | `items` and `item_categories` tables/enums/indexes |
| `apps/api/src/db/migrations/` | New | Forward-compatible schema migration |
| `apps/api/src/app/create-app.ts` | Modified | Register items dependencies and router |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Phase 2 inventory needs different item shape | Med | Lock forward-compat fields now: `tracksStock`, `trackBatchMode` |
| Tenant/RBAC leakage | Med | Scope by session company only; route guards by role |
| Wrong money model later | Med | Document USD-only assumption loudly in specs/design |

## Rollback Plan
Revert with Drizzle down migration / `db:down`, remove `items` feature wiring from `create-app.ts`, and delete the new feature module.

## Dependencies
- Existing auth session membership context, audit events table, and Drizzle migration workflow.

## Success Criteria
- [ ] Company users can create/update company-scoped items and categories; only owners can soft-delete.
- [ ] Default reads exclude `deletedAt` rows and never trust client-provided `companyId`.
- [ ] Item schema ships without later phase-2 table rewrite for stock tracking metadata.
