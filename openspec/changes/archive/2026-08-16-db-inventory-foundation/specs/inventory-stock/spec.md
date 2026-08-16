# Delta for inventory-stock

## ADDED Requirements

### Requirement: Tenant-safe inventory foundations

The system MUST create `stock_lots`, `stock_documents`, `stock_document_lines`, and `stock_quants` with uuid primary keys, `companyId`, and composite tenant foreign keys so rows cannot reference parents outside their company.

#### Scenario: Inventory relations stay in-tenant
- GIVEN inventory tables are migrated
- WHEN documents, lines, lots, and quants reference parent rows
- THEN each relation MUST enforce `(id, company_id)` tenant integrity

#### Scenario: Cross-company references fail
- GIVEN an inventory row targets a parent from another company
- WHEN the write executes
- THEN PostgreSQL MUST reject it

### Requirement: Document states, flow types, and reversal model

The system MUST store document type as `receipt|transfer|adjustment|loss`, status as `draft|confirmed|cancelled`, enforce origin/destination combinations, and preserve confirm-time quant maintenance plus `reversalOfId` semantics without requiring destructive stock updates.

#### Scenario: Valid document flow persists
- GIVEN a receipt, transfer, adjustment, or loss uses its allowed origin and destination shape
- WHEN the document is written
- THEN PostgreSQL MUST accept it

#### Scenario: Invalid type or reversal shape is rejected
- GIVEN a document violates its required origin or destination rules
- WHEN the row is inserted or updated
- THEN PostgreSQL MUST reject it

### Requirement: Restricted stock locations and lot gating

The system MUST restrict document and quant scope types to `warehouse` or `point-of-sale`, MUST enforce scope-type pair checks, and MUST provide `stock_lots` from day one while leaving `items.trackBatchMode` gating to later application logic.

#### Scenario: Allowed stock scopes persist
- GIVEN a document or quant uses a warehouse or point-of-sale node consistently
- WHEN the row is written
- THEN PostgreSQL MUST allow it

#### Scenario: Disallowed scopes fail
- GIVEN a document or quant uses another node type or mismatched scope pair
- WHEN the row is written
- THEN PostgreSQL MUST reject it

### Requirement: Non-negative quantities and valuation columns

The system MUST store line and quant quantities as `numeric(14,3)`, forbid negative stock through checks on quantity, reserved quantity, and quarantine quantity, and store moving weighted average as nullable `avgUnitCost numeric(14,4)` with per-line `unitCost numeric(14,4)`.

#### Scenario: Valid positive inventory persists
- GIVEN document lines and quants satisfy positive and non-negative bounds
- WHEN the rows are written
- THEN PostgreSQL MUST accept them

#### Scenario: Negative stock state is rejected
- GIVEN a quant would store a negative quantity or reserved plus quarantine above quantity
- WHEN the row is written
- THEN PostgreSQL MUST reject it

### Requirement: Indexes, permission seeds, migration proof, and scope boundary

The system MUST add indexes supporting lot uniqueness and null-safe quant uniqueness per company, item, scope, and lot, MUST seed `inventory.stock.read|write|adjust` plus additive `inventory.documents.*` permission keys, MUST ship per-migration real-PostgreSQL tests through `createMigrationTestDatabase`, and MUST NOT introduce API, UI, or application-layer behavior in this change.

#### Scenario: Migration tests prove inventory constraints
- GIVEN the migration test suite runs against PostgreSQL
- WHEN inventory migrations are applied
- THEN tests MUST verify type checks, scope checks, lot uniqueness, tenant integrity, and non-negative quants

#### Scenario: Change remains DB-only
- GIVEN this change is reviewed
- WHEN affected artifacts are inspected
- THEN only schema, migration, permission seed, index, constraint, and migration-test assets MUST be required
