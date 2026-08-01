# Proposal: Item Catalog Web UI

## Intent
Deliver the first ERP business UI in the web app: a split-panel item catalog consuming the completed `item-catalog` backend. Companies register/edit products and services, manage categories, and (owners) soft-delete — all CRUD on one screen, no page navigation.

## Scope

### In Scope
- New feature `apps/web/src/features/items/` (domain/application/infrastructure/presentation vertical slice)
- Split-panel layout: items table (left), form/detail (right); "Add Product" opens a blank draft; row select loads item for edit
- Categories view (tree, parent/child) + category create form
- TanStack Query for all server state (list, detail, create/update/delete mutations w/ invalidation)
- Zustand store for client state only (selected item id, form draft, panel state)
- React Hook Form + Zod item form; type immutable on edit; USD-only price with "$" prefix
- shadcn/ui primitives; add table, select, dialog, badge, switch to `shared/ui`
- RBAC: soft-delete visible only to `company-owner`; user sees create/edit
- Routes `/dashboard/items` (catalog) and `/dashboard/categories` (categories)
- Sidebar nav wiring in dashboard shell

### Out of Scope
- Inventory/stock management (phase 2)
- CSV import/export, bulk ops, variant matrices, supplier/tax linking
- Mobile responsive (desktop-first ERP admin)
- Any backend/schema change

## Capabilities

### New Capabilities
- `item-catalog-web`: frontend split-panel item + category UI consuming the `item-catalog` backend API

### Modified Capabilities
- `dashboard-shell`: evolves "ERP navigation placeholders" → real catalog module routes (`/dashboard/items`, `/dashboard/categories`)

## Approach
Feature-first vertical slice mirroring existing `auth`/`dashboard` features. Domain ports map the verified REST API (`/items`, `/items/:id`, `/item-categories`). Infrastructure = typed `HttpClient` adapter + TanStack Query hooks/keys. Presentation = split panel composing shadcn primitives. Client-only state in a Zustand store; server state never copied into it (react skill rule). Form via React Hook Form + Zod + resolver.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/features/items/` | New | Full vertical slice |
| `apps/web/src/shared/ui/{table,select,dialog,badge,switch}.tsx` | New | shadcn primitives added |
| `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` | Modified | Real nav links for items/categories |
| App router | Modified | Add `/dashboard/items`, `/dashboard/categories` routes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Line budget exceeded (new feature + 5 shadcn primitives) | High | Chained PRs sliced by layer (domain/infra → presentation → categories) |
| RBAC leak (delete shown to user) | Med | Derive role from auth session; gate button render + disabled state |

## Rollback Plan
Remove `apps/web/src/features/items/`, revert sidebar/router additions, and undo the 5 added `shared/ui` primitives. No backend or DB impact.

## Dependencies
- Completed `item-catalog` backend API (archived 2026-07-31)
- Existing auth session (companyId, role memberships)

## Success Criteria
- [ ] Owner/user create/edit items; only owner sees/uses soft-delete
- [ ] Listing shows only session-company active items; USD "$" prefix only
- [ ] Categories CRUD with tree; cycle prevention handled by API
- [ ] Type disabled on edit; Zod form rejects invalid input
- [ ] `pnpm build` + `pnpm test` green

## Proposal Assumptions
The proposal question round was already completed by the orchestrator — the key product decision (split-panel layout: table left, form/detail right, single-screen CRUD, no page navigation) is resolved and encoded above. Two routes (`/dashboard/items` main, `/dashboard/categories` secondary) are assumed rather than a single tabbed route.