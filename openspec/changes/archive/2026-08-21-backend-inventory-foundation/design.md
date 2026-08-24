# Design: Backend Inventory Foundation

## Technical Approach

Mirror the `hr-timesheets` vertical slice. Add `apps/api/src/features/inventory/` with `domain` (state machine, MWA, `documentNo` generator, lot rules, errors), `application` (12 use-case factories: document CRUD, draft-line add/update/remove, confirm, cancel, reversal, lot create/list, quant list), `infrastructure` (composite-tenant Drizzle gateway: tx confirm/cancel/reversal, MWA quant upsert incl. NULL-lot, trigger translator), `presentation` (12 routes under `/companies/:companyId/stock-*`). Wire in `app/create-app.ts`; new errors in `shared/presentation/error.middleware.ts`. Strict TDD: S1 domain+application via `InMemoryStockDocumentsGateway`; S2 real PG via `createMigrationTestDatabase`; S3 router+`createApp` via supertest.

## Route Inventory (12 routes)

| # | Method | Path | Operation | Permission |
|---|---|---|---|---|
| 1 | POST | `/companies/:companyId/stock-documents` | create | `inventory.documents.write` |
| 2 | GET | `/companies/:companyId/stock-documents` | list | `inventory.documents.read` |
| 3 | GET | `/companies/:companyId/stock-documents/:documentId` | get | `inventory.documents.read` |
| 4 | POST | `/companies/:companyId/stock-documents/:documentId/lines` | addLine | `inventory.documents.write` |
| 5 | PATCH | `/companies/:companyId/stock-documents/:documentId/lines/:lineId` | updateLine | `inventory.documents.write` |
| 6 | DELETE | `/companies/:companyId/stock-documents/:documentId/lines/:lineId` | removeLine | `inventory.documents.write` |
| 7 | POST | `/companies/:companyId/stock-documents/:documentId/confirm` | confirm | `inventory.documents.confirm` (+ `inventory.stock.adjust` for adjustment) |
| 8 | POST | `/companies/:companyId/stock-documents/:documentId/cancel` | cancel | `inventory.documents.write` |
| 9 | POST | `/companies/:companyId/stock-documents/:documentId/reversal` | reverse | `inventory.documents.write` |
| 10 | POST | `/companies/:companyId/stock-lots` | createLot | `inventory.stock.write` |
| 11 | GET | `/companies/:companyId/stock-lots` | listLots | `inventory.stock.read` |
| 12 | GET | `/companies/:companyId/stock` | listQuants | `inventory.stock.read` |

## Architecture Decisions

| # | Topic | Choice | Tradeoff | Decision |
|---|---|---|---|---|
| 1 | Slice layout | `domain/application/infrastructure/presentation` | Matches repo | Follow `hr-timesheets` |
| 2 | `documentNo` | Pure `generateDocumentNo({companyCode, originShort, seq})` → `ACME-WH-00042` | No DB in fn | Domain; gateway retries 23505 |
| 3 | Lot gating | Use case loads item, validates `trackBatchMode` (batch⇒lot, serial⇒lot+qty1, none⇒forbid) | Extra read | Fail-fast in use case |
| 4 | MWA | Pure `computeNewAvg(prevQty,prevAvg,addQty,addCost)` → `toFixed(4)` | String math | Domain fn |
| 5 | Quant upsert | Raw `INSERT … ON CONFLICT (company,item,scope,lot) NULLS NOT DISTINCT DO UPDATE` | Drizzle lacks `nullsNotDistinct` | Raw `sql` in tx |
| 6 | NULL avg at qty 0 | `avgUnitCost = newQty===0 ? null : newAvg` | Explicit | In upsert |
| 7 | Transfer | `confirm` emits OUT line at origin + IN line at dest in same tx | Two quant rows | Gateway |
| 8 | Adjustment gate | Use case requires `inventory.stock.adjust` + `inventory.documents.confirm` when `type==='adjustment'` | Extra perm | Use case gate |
| 9 | Cancel of confirmed | Apply compensating quants (negate lines) in tx; status→`cancelled` | Audit-richer | Tx in gateway |
| 10 | Reversal | New `confirmed` doc with negated lines, `reversalOfId` set; chain allowed | Matches DB | One new doc per call |
| 11 | Trigger translator | `translateStockScopeTriggerError(err)` matches stable PG messages + `ERRCODE 23514/23503` | Message-based | Tested helper |
| 12 | Permission mw | Reuse `createRequireHrCapability` (key-agnostic) with `inventory.*`; gateway joins `items`/`scopeNodes`/`users`; company-only scope; `string` numerics via `Number`+`toFixed(4)` | Repo-forced | Reuse as-is |

## Data Flow

**Confirm** — Client → Router (`requireAuth` + `requireCapability` + `ensureCompanyAccess`) → UseCase (assert, load item, validate lot, compute MWA, gen/retry no.) → Gateway.tx: (1) `SELECT … FOR UPDATE stock_documents`; (2) `UPDATE status='confirmed', documentNo=…`; (3) `INSERT … ON CONFLICT (company,item,scope,lot) NULLS NOT DISTINCT DO UPDATE SET quantity, avg_unit_cost` (null at qty 0); (4) COMMIT / trigger err → translator → `error.middleware` maps to 4xx; success 200/201.

**Cancel-of-confirmed** — UseCase rejects (404) if not found/cancelled → Gateway.tx: (1) lock original doc; (2) load lines; (3) quant upsert with negated line quantities (NULL avg when new qty = 0); (4) `UPDATE status='cancelled'`; (5) COMMIT → translator on trigger err.

**Reversal** — UseCase clones the confirmed doc with negated lines + `reversalOfId=originalId` + new `type='adjustment'`, then runs the confirm flow above in one tx.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/features/inventory/domain/stock-documents.ts` + `__tests__` | Create | Entities, errors, MWA, `generateDocumentNo`, asserts; unit tests |
| `apps/api/src/features/inventory/application/{create,list,get,confirm,cancel,reverse}-document.ts` | Create | Document lifecycle use cases (6) |
| `apps/api/src/features/inventory/application/lines/{add,update,remove}-line.ts` | Create | Draft-only line use cases (3) |
| `apps/api/src/features/inventory/application/lots/{create,list}-lot.ts` + `list-quants.ts` | Create | Lot/quant use cases (3) — total 12 use cases |
| `apps/api/src/features/inventory/application/__tests__/support.ts` + `*.test.ts` | Create | S1: `InMemoryStockDocumentsGateway` + builders + use case tests |
| `apps/api/src/features/inventory/infrastructure/drizzle-stock-documents.gateway.ts` + `.test.ts` | Create | S2: real PG; tx, raw upsert, translator; integration via `createMigrationTestDatabase` |
| `apps/api/src/features/inventory/infrastructure/translate-stock-scope-trigger-error.ts` + `.test.ts` | Create | Trigger error → typed error; 5 messages RED-tested |
| `apps/api/src/features/inventory/presentation/stock.router.ts` + `.test.ts` | Create | S3: 12 routes, Zod, `ensureCompanyAccess`; supertest |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modify | Add 6 inventory error classes (400/404/409) |
| `apps/api/src/app/create-app.ts` | Modify | Construct gateway; mount `createStockRouter(...)` |

## Interfaces / Contracts

`StockDocumentsGateway` (12 methods): `createDocument`/`getDocument`/`listDocuments`/`addLine`/`updateLine`/`removeLine`/`listLines`/`confirmDocument`/`cancelDocument`/`reverseDocument`/`findItem`/`getNextDocumentSequence`. `StockLotsGateway` (2): `createLot`/`listLots`. `StockQuantsGateway` (1): `listQuants`. Enums: `StockDocumentType = 'receipt'|'transfer'|'adjustment'|'loss'`; `StockDocumentStatus = 'draft'|'confirmed'|'cancelled'`. Numerics `string` I/O.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | State machine, MWA (qty→0 ⇒ null), `generateDocumentNo`, lot validator, trigger translator (5 messages) | Table-driven Vitest |
| Application | 12 use cases; adjustment double-gate 403; cancel-of-confirmed compensates; reversal chain | `InMemoryStockDocumentsGateway` + builders |
| Integration | `confirm` tx; raw upsert with NULL lot; NULL-avg at qty 0; transfer out+in; reversal chain; trigger translation; lot uniq 23505 | `createMigrationTestDatabase` + `applyMigrationsThrough('0027_…sql')` |
| HTTP | 12 routes; 401/403/404/409; cross-company 403; adjustment double-gate; Zod 400 | supertest + `createApp` with in-memory gateways |

## Threat Matrix

The design adds new HTTP routes (12) and an Express router wiring in `create-app.ts` but does not introduce shell execution, subprocesses, VCS automation, PR commands, executable-file classification, or external process integration. The matrix below is therefore INCLUDED for completeness per the `sdd-design` applicability rule but every row evaluates to `N/A` with a concrete reason; no fabricated tests are added for non-applicable boundaries. The HTTP routing surface itself is covered by the existing trust perimeter: `requireAuth` → `requireCapability(inventory.*)` → `ensureCompanyAccess(auth, companyId)` → Zod validation → typed domain errors → centralized `error.middleware`. Trigger/constraint error translation is RED-tested at the unit + integration layers (see Testing Strategy).

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A — design adds `.ts` Express routes only; no `requirements.txt`, `CMakeLists`, executable docs, or shell-script-as-doc assets are touched or created. | None — no classification/exec boundary introduced. | None |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A — design is additive TypeScript only; no `git` CLI calls, no repo selectors, no `child_process`/`execa` invocations. | None — no git authority boundary introduced. | None |
| Commit state | staged, `commit -a`, empty index | N/A — design creates no commit logic; `sdd-apply` is the only commit boundary and lives outside this change. | None — no commit/index semantics. | None |
| Push state | tracking branch, first push, explicit refspec | N/A — design never calls `git push`; CI/deploy is out of scope. | None — no destination/ref resolution. | None |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A — design does not open, comment on, or close PRs; `branch-pr` skill is outside this change. | None — no PR-automation boundary. | None |

## Migration / Rollout

No schema/migration (`0027` archived on `horas`). Branch `backend-inventory-foundation` lacks the DB foundation and `hr-timesheets` slice — orchestrator must `git rebase horas` (or reset) before `sdd-apply` starts; the design assumes that. Rollback: revert slice commits + the `error.middleware.ts`/`create-app.ts` wiring additions; schema, seeds, permission catalog remain valid. No feature flag — additive, backend-only, all 12 routes behind `requireAuth` + `requireCapability`.

## Open Questions

None. All product decisions in Engram `sdd/backend-inventory-foundation/product-decisions`.
