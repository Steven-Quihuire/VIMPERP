# Design: Item Catalog Web UI

## Technical Approach

New vertical slice `apps/web/src/features/items/` consuming the `item-catalog` REST API. Server state via TanStack Query, client state via Zustand, forms via React Hook Form + Zod, primitives from shadcn. Split-panel `/dashboard/items` (table + form) and tree `/dashboard/categories`. RBAC from `AuthSession.memberships`. `dashboard-shell` delta satisfied by replacing `#inventory` / `#sales` hash placeholders with real `NavLink`s and adding two child routes.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Feature layout | `domain` / `infrastructure` / `presentation` | React skill: TanStack Query hooks ARE the application boundary. |
| Server state | TanStack Query | Project standard; explicit query keys for invalidation. |
| Client state | Zustand for `selectedItemId`, `panelMode` | Never copy server data into Zustand. |
| Form strategy | RHF + Zod resolver | Spec needs name, price≥0, unit, optional SKU, immutable type on edit. **Add `react-hook-form`, `zod`, `@hookform/resolvers` to `apps/web/package.json`** — none installed. |
| Components | shadcn primitives in `shared/ui/` | Project standard. Add `table`, `select`, `dialog`, `badge`, `switch`. |
| HTTP client | Extend `shared/lib/http/http-client.ts` with `delete()` | One extension point keeps "no Axios, typed HttpClient" rule. |
| RBAC | `isCompanyOwner(session)` in domain | Mirrors `canViewAdminSignals`. Backend still enforces via `requireOwner`. |
| Routes | `items` + `categories` children of `/dashboard` | Inside `ProtectedDashboardShell` → inherit auth + onboarding gate. |
| Testing | Vitest + RTL; `vi.fn()` to stub fetch | Same pattern as `app.dashboard-shell.test.tsx`. |

React skill rules honored: no `useMemo`/`useCallback`, no `useEffect` for fetch, server state only in TanStack, client state only in Zustand.

## Data Flow

Component → Zustand (selection) → TanStack Query → HttpClient → fetch → `/items` or `/item-categories`. Mutations invalidate `['items', 'list']` and `['item-categories']`. `useCategoriesQuery` feeds both the form `<Select>` and the tree.

## File Changes

| File | Action |
|---|---|
| `apps/web/src/features/items/domain/items.ts` | Create — types, `ItemGateway` port, `isCompanyOwner`, query keys. |
| `apps/web/src/features/items/infrastructure/items-client.ts` | Create — `createItemsRepository` over `HttpClient`. |
| `apps/web/src/features/items/infrastructure/use-items.ts` | Create — queries, mutations, category hooks. |
| `apps/web/src/features/items/presentation/item-catalog-store.ts` | Create — Zustand. |
| `apps/web/src/features/items/presentation/item-form-schema.ts` | Create — Zod; strip `type` on PATCH. |
| `apps/web/src/features/items/presentation/item-form-panel.tsx` | Create — RHF + (owner-only) delete. |
| `apps/web/src/features/items/presentation/item-table.tsx` | Create — `<Table>`; row click → store. |
| `apps/web/src/features/items/presentation/item-catalog-page.tsx` | Create — split panel. |
| `apps/web/src/features/items/presentation/category-tree.tsx` | Create — recursive tree + rename. |
| `apps/web/src/features/items/presentation/categories-page.tsx` | Create — tree + create form. |
| `apps/web/src/features/items/**/*.test.tsx` | Create — table, validation, RBAC, 409. |
| `apps/web/src/shared/ui/{table,select,dialog,badge,switch}.tsx` | Create — shadcn primitives. |
| `apps/web/src/shared/lib/http/http-client.ts` | Modify — add `delete(path)`. |
| `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` | Modify — replace `#inventory`/`#sales` with `NavLink`. |
| `apps/web/src/app/app.tsx` | Modify — add `items` + `categories` child routes. |
| `apps/web/package.json` | Modify — add `react-hook-form`, `zod`, `@hookform/resolvers`. |

## Interfaces / Contracts

**Types** (`domain/items.ts`): `ItemType` = `'product' \| 'service'`; `ItemUnit` = `'unit' \| 'hour' \| 'kg' \| 'liter' \| 'meter' \| 'box' \| 'service'`; `ItemTrackBatchMode` = `'none' \| 'batch' \| 'serial'`. `Item` mirrors the API shape (timestamps as ISO strings in the web layer). `ItemGateway`: `listItems`, `getItem`, `createItem`, `updateItem`, `softDeleteItem`, `listCategories`, `createCategory`, `updateCategory`. `itemQueryKeys = { all:['items'], list, detail(id), categories:['item-categories'] }`. `isCompanyOwner = s.memberships.some(m => m.role === 'company-owner')`.

**Form schema** (`item-form-schema.ts`): `name: min(1)`, `type: enum`, `unitPrice: coerce.number().min(0)`, `sku/categoryId: nullable`, `tracksStock: boolean`, `trackBatchMode: enum`. On PATCH, omit `type` per spec.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Domain | `isCompanyOwner`, query keys | Vitest unit, no DOM. |
| Infrastructure | repository hits correct paths | `vi.stubGlobal('fetch', vi.fn())` per `app.dashboard-shell.test.tsx`. |
| Presentation | table render, row → store, form rejects negative price, delete hidden for non-owner, 409 cycle → user-friendly | RTL + `QueryClientProvider` + stub `session`. |
| Integration | list → select → save invalidates list | One faked endpoint. |

Coverage 80% (`openspec/config.yaml`). No E2E (no Playwright yet).

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. App-internal React Router only.`

## Rollout

Chained PRs (this slice + 5 primitives exceeds the 400-line review budget):
1. **PR-A** — domain + infrastructure + HttpClient `delete` + 4 primitives (`table`/`select`/`badge`/`switch`) (~350 lines).
2. **PR-B** — `ItemCatalogPage` + `ItemTable` + `ItemFormPanel` + RHF schema + store + `dialog` + tests (~400 lines).
3. **PR-C** — `CategoriesPage` + `CategoryTree` + sidebar nav + `app.tsx` routes + tests (~200 lines).

No data migration. No feature flag — owner delete is render-time gated; backend still enforces.

## Open Questions

- [ ] **BLOCKS `sdd-tasks`.** `item.router.ts` has POST/GET-by-id/PATCH for `/item-categories` but no `router.get('/item-categories', …)` for the list. The web UI's category dropdown and tree require it. **Default**: add `GET /item-categories` to the backend (~10 lines, parallel change). **Fallback if out of scope**: replace `<Select>` with free-text input and make `CategoriesPage` create-only. Needs user decision before tasks.
