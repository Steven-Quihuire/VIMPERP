# Tasks: Item Catalog Web UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1200-1600 (5 shadcn primitives + 11 web files + 4 backend files + 4 modifications + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR0 (backend mini) -> PR1 (web foundation) -> PR2 (items presentation) -> PR3 (categories presentation) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 0 | Backend `GET /item-categories` slice | PR0 | `pnpm --filter api test -- list-categories item.route` | N/A — pure unit + supertest harness boots via `pnpm --filter api dev`; PR0 lands first, no runtime needed for tasks | Revert `apps/api/src/features/items/application/list-categories.ts`, `presentation/item.router.ts`, `app/create-app.ts` and matching tests |
| 1 | Web foundation: deps, 5 primitives, `HttpClient.delete`, domain, infra | PR1 | `pnpm --filter web test -- items-domain items-client use-items` | N/A — Vitest + RTL; fetch is stubbed via `vi.stubGlobal('fetch', vi.fn())` per `app.dashboard-shell.test.tsx`; no live backend needed | Revert `apps/web/src/features/items/{domain,infrastructure}`, `shared/ui/{table,select,dialog,badge,switch}.tsx`, `shared/lib/http/http-client.ts` |
| 2 | Items presentation: split panel, table, form, store, route, sidebar | PR2 | `pnpm --filter web test -- items/presentation` | N/A — RTL with `QueryClientProvider` + stub `AuthSession`; dev server (`pnpm --filter web dev`) for manual split-panel check | Revert `apps/web/src/features/items/presentation/{item-*,item-catalog-*}`, `dashboard-app-sidebar.tsx`, `app.tsx` items route |
| 3 | Categories presentation: tree, create form, route, sidebar link | PR3 | `pnpm --filter web test -- items/presentation/categories` | N/A — RTL with `QueryClientProvider` + stub session | Revert `apps/web/src/features/items/presentation/{category-tree,categories-page}*`, `app.tsx` categories route |

## Phase 1: Backend mini-slice (PR0)

- [x] 1.1 RED: `apps/api/src/features/items/application/list-categories.test.ts` — returns active categories for company, filters by companyId
- [x] 1.2 GREEN: create `apps/api/src/features/items/application/list-categories.ts` with `createListCategories` use case (mirrors `list-items` shape)
- [x] 1.3 Add `router.get('/item-categories', ...)` to `apps/api/src/features/items/presentation/item.router.ts`
- [x] 1.4 Wire `listCategories` use case in `apps/api/src/app/create-app.ts` (DI alongside existing item use cases)
- [x] 1.5 RED: route test in `item.route.test.ts` — 200 returns array; 401 unauth
- [x] 1.6 GREEN: implement route handler
- [x] 1.7 Verify `pnpm --filter api test` + typecheck + lint all green

## Phase 2: Web foundation (PR1)

- [x] 2.1 Add `react-hook-form`, `zod`, `@hookform/resolvers` to `apps/web/package.json`; `pnpm install`
- [x] 2.2 Extend `HttpClient` in `apps/web/src/shared/lib/http/http-client.ts` with `delete<T>(path): Promise<Response>`
- [x] 2.3 Create 5 shadcn primitives in `apps/web/src/shared/ui/`: `table.tsx`, `select.tsx`, `dialog.tsx`, `badge.tsx`, `switch.tsx`
- [x] 2.4 RED: `features/items/domain/items.test.ts` — `isCompanyOwner` true/false, `itemQueryKeys` shape
- [x] 2.5 GREEN: `features/items/domain/items.ts` — `Item`, `ItemType`, `ItemUnit`, `ItemTrackBatchMode`, `ItemGateway` port, `isCompanyOwner`, `itemQueryKeys`
- [x] 2.6 RED: `features/items/infrastructure/items-client.test.ts` — repo hits `/items`, `/items/:id`, `/item-categories` with correct verbs
- [x] 2.7 GREEN: `features/items/infrastructure/items-client.ts` — `createItemsRepository(http)` implementing `ItemGateway`
- [x] 2.8 RED: `features/items/infrastructure/use-items.test.tsx` — query keys, mutation invalidation targets
- [x] 2.9 GREEN: `features/items/infrastructure/use-items.ts` — `useItemsQuery`, `useItemQuery`, `useCategoriesQuery`, `useCreateItem`, `useUpdateItem`, `useSoftDeleteItem`, `useCreateCategory`, `useUpdateCategory`; mutations invalidate `['items','list']` and `['item-categories']`
- [x] 2.10 `pnpm --filter web test` + typecheck + `pnpm build` all green

## Phase 3: Items presentation (PR2)

- [x] 3.1 RED: `presentation/item-form-schema.test.ts` — strips `type` on patch payload; rejects negative price; rejects empty name
- [x] 3.2 GREEN: `presentation/item-form-schema.ts` — Zod schema + `toPatchPayload(input)` helper
- [x] 3.3 `presentation/item-catalog-store.ts` — Zustand store: `selectedItemId`, `panelMode` (`closed`|`create`|`edit`), `formDraft`; no server data
- [x] 3.4 `presentation/item-table.tsx` — `<Table>` from `shared/ui`; row click -> store; USD `$` prefix; delete column hidden for non-owner
- [x] 3.5 `presentation/item-form-panel.tsx` — RHF + Zod resolver; `type` disabled on edit; owner-only delete opens `<Dialog>` confirmation
- [x] 3.6 `presentation/item-catalog-page.tsx` — split panel; loading skeleton + error state; 409 from category cycle shows user-friendly toast
- [x] 3.7 RED+GREEN: presentation tests — table render, row->store, validation blocks invalid submit, RBAC hides delete, 409 surfaced
- [x] 3.8 Add `/dashboard/items` route in `apps/web/src/app/app.tsx`; add Items `NavLink` in `features/dashboard/presentation/dashboard-app-sidebar.tsx` (replace `#inventory` placeholder)
- [x] 3.9 `pnpm --filter web test` + `pnpm build` green

## Phase 4: Categories presentation (PR3)

- [ ] 4.1 `presentation/category-tree.tsx` — recursive tree; inline rename; expand/collapse
- [ ] 4.2 `presentation/categories-page.tsx` — tree + create form; 409 cycle -> user-friendly inline error
- [ ] 4.3 RED+GREEN: `categories-page.test.tsx` — create renders tree; 409 surfaces error
- [ ] 4.4 Add `/dashboard/categories` route in `app.tsx`; add Categories `NavLink` in sidebar (replace `#sales` placeholder)
- [ ] 4.5 `pnpm --filter web test` + `pnpm build` green

## Notes

- Strict TDD: RED before GREEN in every numbered task where a test file is created.
- PR0 lands first; PR1's `useCategoriesQuery` consumes the new `GET /item-categories` route, so it MUST exist before PR1 verifies.
- Threat matrix: N/A per design — app-internal React Router only, no shell/subprocess/VCS/executable/process boundaries.
- `Decision needed before apply: No` — `auto-chain` proceeds with PR0 as the first slice; no user confirmation required.
- `pnpm` only (never npm/yarn/bun); no `useMemo`/`useCallback`/`useEffect`-for-fetch; server state stays in TanStack, client state in Zustand.
