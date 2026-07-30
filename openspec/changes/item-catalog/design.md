# Design: Item Catalog

## Technical Approach

New vertical slice `apps/api/src/features/items/` (domain → application → infrastructure → presentation) mirroring `companies`. Two Drizzle tables (`items`, `item_categories`) plus two pgEnums, scoped strictly by `response.locals.auth.memberships[].companyId` (body `companyId` ignored). Soft delete via `deletedAt`; list reads exclude deleted rows. All mutations atomic in a Drizzle transaction with `audit_events` inserts using `type = 'item.created' | 'item.updated' | 'item.deleted'`. USD-only enforced at the Zod layer (no currency field accepted). RBAC split: presentation `createRequireRole('company-owner')` guard on DELETE, plus defense-in-depth role checks in the `softDeleteItemUseCase` (matches the admin `requirePlatformAdmin` precedent). Type immutability enforced twice: use case rejects `body.type !== existing.type`; gateway `updateItem` never includes `type` in `.set()`.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Feature layout | (a) drop into `companies` (b) new `items` slice | (b) new slice | Screaming-architecture; `items` is a separate bounded context with its own RBAC matrix and future inventory hooks |
| Category uniqueness | (a) single `unique(companyId, parentId, name)` (b) two partial uniques (c) `unique(companyId, name)` | (a) composite | PG treats `NULL parentId` as distinct → siblings allowed; app layer rejects duplicate top-level names. One index follows existing `company_services_company_name_idx` style |
| Item SKU uniqueness | (a) `unique(companyId, sku)` (b) partial `unique(companyId, sku) WHERE sku IS NOT NULL` | (b) partial | SKU is optional; partial index matches existing `provisioning_runs_process_idempotency_idx` pattern; multiple items with `sku = NULL` allowed |
| Category cycle prevention | (a) recursive CTE in DB (b) app-layer ancestor walk | (b) app-layer | Catalog depth ≤ a few hundred per company; one gateway call (`getDescendantIds`) keeps domain free of SQL and matches how companies feature does cross-entity checks in the use case |
| RBAC location | (a) presentation middleware only (b) use case only (c) both | (c) both | Mirrors `requirePlatformAdmin` precedent (presentation) + use case rejects when role is `company-user` (defense-in-depth) so a future CLI cannot bypass |
| `companyId` source | (a) `auth.memberships[0].companyId` (b) gateway lookup by `userId` | (a) direct | Membership is already loaded in `AuthSession` by `resolveAuthSession`; avoids an extra DB roundtrip; spec mandates session-scope |
| Currency field | (a) accept and ignore (b) reject with 400 (c) strict Zod | (c) `z.object(...).strict()` body | Spec "Reject" scenario requires the request to be rejected when currency is added; strict mode does it at the validation layer |
| Error mapping | (a) per-route try/catch (b) shared middleware `instanceof` | (b) extend shared `error.middleware.ts` | Single mapping point; matches how `ForbiddenError` / `DuplicateIdentityError` are handled today |

## Data Flow

```
HTTP ──► createItemRouter (Zod strict, requireAuth)
            │
            ▼
   use case (role check, type immutability, normalize, domain errors)
            │
            ▼
   DrizzleItemGateway (tx: itemsTable + itemCategoriesTable + auditEventsTable)
            │
            ▼
   Postgres ──► partial unique idx (companyId, sku) WHERE sku NOT NULL
            └─► composite unique idx (companyId, parentId, name) on item_categories
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/features/items/domain/item.ts` | Create | Ports `ItemCatalogGateway`, `CategoryGateway`; enums `itemTypeValues`, `itemUnitValues`, `itemTrackBatchModeValues`; typed errors `ItemNotFoundError`, `ItemSkuConflictError`, `ItemTypeImmutableError`, `CategoryNotFoundError`, `CategoryCycleError` (each with `code` field) |
| `apps/api/src/features/items/application/create-item.ts` | Create | `createCreateItemUseCase`: normalizes, forces `tracksStock=false` for services, calls gateway, returns `{ itemId }` |
| `apps/api/src/features/items/application/update-item.ts` | Create | `createUpdateItemUseCase`: rejects `body.type` if present and different, delegates to gateway with only mutable fields |
| `apps/api/src/features/items/application/soft-delete-item.ts` | Create | `createSoftDeleteItemUseCase`: defense-in-depth role check (`company-owner`), `softDeleteItem` on gateway |
| `apps/api/src/features/items/application/get-item.ts` | Create | `createGetItemUseCase` (active + soft-deleted lookup) |
| `apps/api/src/features/items/application/list-items.ts` | Create | `createListItemsUseCase` (excludes `deletedAt`) |
| `apps/api/src/features/items/application/create-category.ts` | Create | Trims name, normalizes, calls gateway |
| `apps/api/src/features/items/application/update-category.ts` | Create | Rejects `parentId` cycle (walks descendants via `gateway.getDescendantIds`) |
| `apps/api/src/features/items/application/list-categories.ts` | Create | Tree-preserving flat list |
| `apps/api/src/features/items/infrastructure/drizzle-item.gateway.ts` | Create | Implements both ports; mirrors `drizzle-company.gateway.ts` (tx + `randomUUID` + `now()` + audit inserts on create/update/soft-delete) |
| `apps/api/src/features/items/infrastructure/drizzle-item.gateway.test.ts` | Create | Vitest fake-DB assertions (atomic writes + audit shape), mirrors `drizzle-company.gateway.test.ts` |
| `apps/api/src/features/items/presentation/item.router.ts` | Create | `createItemRouter` factory: Zod strict body schemas; routes `POST/GET /items`, `GET/PATCH/DELETE /items/:id`, `GET/POST /item-categories`, `GET/PATCH/DELETE /item-categories/:id`; `requireAuth` + `requireRole(['company-owner'])` only on DELETE |
| `apps/api/src/features/items/presentation/item.route.test.ts` | Create | supertest + InMemoryGateway (mirrors `company.route.test.ts`): tenant isolation, RBAC 403 for `company-user` on DELETE, USD strict-rejection |
| `apps/api/src/features/items/application/*.test.ts` | Create | Per use case: fake gateway, normalize, role rejection, type immutability, cycle detection |
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | Add `itemTypeEnum`, `itemUnitEnum`, `itemTrackBatchModeEnum`, `itemCategoriesTable` (with `uniqueIndex(companyId, parentId, name)`), `itemsTable` (with `uniqueIndex(companyId, sku) WHERE sku IS NOT NULL`) |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modify | Import new domain errors; map `ItemNotFoundError` / `CategoryNotFoundError` → 404 `NOT_FOUND`, `ItemSkuConflictError` / `CategoryCycleError` / `ItemTypeImmutableError` → 409 `CONFLICT` |
| `apps/api/src/app/create-app.ts` | Modify | Wire `itemGateway`, use cases, `createItemRouter({...})`; mount under `/` after company router |
| `apps/api/src/db/migrations/0006_item_catalog.sql` | Create | `drizzle-kit generate` output: 2 enums, 2 tables, 4 indexes |
| `apps/api/src/db/migrations/__tests__/0006_item_catalog.test.ts` | Create | Real Postgres via `createMigrationTestDatabase`: enum values, column types, partial unique on `items.sku`, composite unique on `item_categories` |
| `apps/api/src/db/migrations/meta/_journal.json` | Modify | Append entry `{ idx: 6, tag: "0006_item_catalog", ... }` |

## Interfaces / Contracts

Domain port (pure TS, no framework imports):

```ts
export const itemTypeValues = ['product', 'service'] as const;
export const itemUnitValues = ['unit', 'hour', 'kg', 'liter', 'meter', 'box', 'service'] as const;
export const itemTrackBatchModeValues = ['none', 'batch', 'serial'] as const;

export type ItemCatalogGateway = {
  createItem: (input: { companyId: string; actorUserId: string; correlationId: string;
    name: string; type: ItemType; unit: ItemUnit; sku: string | null; categoryId: string | null;
    unitPrice: number; tracksStock: boolean; trackBatchMode: ItemTrackBatchMode }) => Promise<{ itemId: string }>;
  updateItem: (input: { companyId: string; actorUserId: string; correlationId: string;
    itemId: string; name?: string; unit?: ItemUnit; sku?: string | null; categoryId?: string | null;
    unitPrice?: number; tracksStock?: boolean; trackBatchMode?: ItemTrackBatchMode }) => Promise<{ itemId: string }>;
  softDeleteItem: (input: { companyId: string; actorUserId: string; correlationId: string; itemId: string }) => Promise<void>;
  getItemById: (input: { companyId: string; itemId: string; includeDeleted?: boolean }) => Promise<Item | null>;
  listItems: (input: { companyId: string; limit: number; cursor?: string }) => Promise<{ items: Item[]; nextCursor: string | null }>;
};
```

Zod strict body example (presentation): `z.object({ name: z.string().min(1), type: z.enum(itemTypeValues), unit: z.enum(itemUnitValues), sku: z.string().min(1).nullable().optional(), categoryId: z.string().min(1).nullable().optional(), unitPrice: z.number().nonnegative().default(0), tracksStock: z.boolean().default(false), trackBatchMode: z.enum(itemTrackBatchModeValues).default('none') }).strict()` — `.strict()` rejects any `companyId` / `currency` field.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (use case) | normalize, role rejection, type immutability, category cycle, service → `tracksStock=false` forced | Vitest + fake `ItemCatalogGateway` (mirrors `create-company.test.ts`) |
| Gateway (integration-ish) | atomic write order, audit shape, soft-delete sets `deletedAt`, list excludes deleted | Fake `AppDb` tx mock capturing writes (mirrors `drizzle-company.gateway.test.ts`) |
| Migration | enums, columns, partial SKU unique, composite category unique | Real Postgres via `createMigrationTestDatabase` helper (mirrors `0005_observability.test.ts`) |
| HTTP (route) | tenant isolation, RBAC 403, strict body 400, full CRUD happy paths | supertest + `InMemoryItemGateway` + `InMemoryAuthGateway` (mirrors `company.route.test.ts`) |

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The change adds application-internal HTTP routes only.`

## Migration / Rollout

Single forward migration `0006_item_catalog.sql` generated by `drizzle-kit generate` (Postgres dialect, matching `0005_observability.sql` format). Applied via existing `drizzle-kit migrate` flow. No backfill (empty tables). No feature flag — slice is additive. Rollback: revert commit, run `drizzle-kit down` (or drop the two tables + enums), remove wiring from `create-app.ts`.

## Open Questions

None.
