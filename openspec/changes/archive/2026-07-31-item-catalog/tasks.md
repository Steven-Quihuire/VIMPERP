# Tasks: Item Catalog

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | PR | Test command | Runtime harness | Rollback |
|------|----|--------------|-----------------|----------|
| 1 Schema+0006 | PR 1 | `pnpm --filter api test -- 0006_item_catalog.test.ts` | `pnpm db:up` (Postgres healthcheck) | Revert `schema.ts` + 0006 SQL + journal |
| 2 Domain+gateway | PR 2 | `pnpm --filter api test -- drizzle-item.gateway.test.ts` | N/A fake `AppDb` mock | Delete `features/items/{domain,infrastructure}/` |
| 3 Use cases | PR 3 | `pnpm --filter api test -- features/items/application` | N/A Vitest+fake gateway | Delete `features/items/application/*.ts` |
| 4 Router+wiring | PR 4 | `pnpm --filter api test -- item.route.test.ts` | N/A unit (curl optional) | Revert `error.middleware.ts`+`create-app.ts`+del `presentation/` |

## Phase 1: Schema & Migration (PR 1)

- [x] 1.1 Add 3 enums + `itemCategoriesTable` (composite unique `companyId+parentId+name`) + `itemsTable` (partial unique `companyId+sku WHERE sku IS NOT NULL`) to `apps/api/src/shared/infrastructure/db/schema.ts`.
- [x] 1.2 `pnpm --filter api drizzle-kit generate` → `apps/api/src/db/migrations/0006_item_catalog.sql`.
- [x] 1.3 Append `{idx:6,tag:"0006_item_catalog",...}` to `apps/api/src/db/migrations/meta/_journal.json`.
- [x] 1.4 RED then GREEN: `__tests__/0006_item_catalog.test.ts` (real Postgres via `createMigrationTestDatabase`) — enum values, columns, partial SKU unique, composite category unique.

## Phase 2: Domain & Infrastructure (PR 2)

- [x] 2.1 Create `features/items/domain/item.ts` — `ItemCatalogGateway`+`CategoryGateway` ports, 3 enum arrays, 5 typed errors with `code`.
- [x] 2.2 Create `features/items/infrastructure/drizzle-item.gateway.ts` — implements both ports; atomic tx + `randomUUID` + `now()` + audit inserts.
- [x] 2.3 RED then GREEN: `drizzle-item.gateway.test.ts` (fake `AppDb` tx mock) — atomic write order, audit shape, `softDeleteItem` sets `deletedAt`, `listItems` excludes deleted.

## Phase 3: Application Use Cases (PR 3)

- [x] 3.1 RED then GREEN: `create-item.{test,}.ts` — R1; service forces `tracksStock=false`; normalize.
- [x] 3.2 RED then GREEN: `update-item.{test,}.ts` — R4; rejects `type` change.
- [x] 3.3 RED then GREEN: `soft-delete-item.{test,}.ts` — R5; defense-in-depth rejects `company-user`.
- [x] 3.4 RED then GREEN: `get-item.{test,}.ts` — R3.
- [x] 3.5 RED then GREEN: `list-items.{test,}.ts` — R2; cursor pagination.
- [x] 3.6 RED then GREEN: `create-category`+`update-category` {test,}.ts — R6; cycle via `gateway.getDescendantIds` (spec-required parts).
- [ ] 3.6.d RED then GREEN: `list-categories` {test,}.ts — R6 list tree — **DEFERRED** (not required by spec scenarios; conscious scope decision recorded in verify-report design coherence + apply-progress deviations).
- [x] 3.7 `pnpm --filter api test -- features/items/application` exits 0.

## Phase 4: Presentation & Wiring (PR 4)

- [x] 4.1 Extend `apps/api/src/shared/presentation/error.middleware.ts` — `ItemNotFoundError`/`CategoryNotFoundError` → 404, `ItemSkuConflictError`/`CategoryCycleError`/`ItemTypeImmutableError` → 409.
- [x] 4.2 Create `apps/api/src/features/items/presentation/item.router.ts` — Zod `.strict()` bodies, `requireAuth` everywhere, `requireRole(['company-owner'])` only on DELETE; 8 routes.
- [x] 4.3 RED then GREEN: `item.route.test.ts` (supertest + `InMemoryItemGateway` + `InMemoryAuthGateway`) — R7 isolation, R5 RBAC 403, R9 USD strict-reject, CRUD happy paths.
- [x] 4.4 Wire `itemGateway` + 7 use cases + `createItemRouter` in `apps/api/src/app/create-app.ts`; mount after company router.
- [x] 4.5 Run `pnpm typecheck && pnpm lint && pnpm --filter api test` — full suite green.
