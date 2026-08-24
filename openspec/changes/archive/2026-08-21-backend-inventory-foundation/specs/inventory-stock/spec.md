# Delta for inventory-stock

## ADDED Requirements

### Requirement: Inventory document lifecycle and numbering

The system MUST expose authenticated backend behavior to create, list, and read stock documents, add/update/remove draft lines, and execute `confirm`, `cancel`, and `reversal`. Documents MUST use statuses `draft|confirmed|cancelled`. Line mutation MUST be allowed only while a document is `draft`. The system MUST generate a unique `documentNo` per company from the approved company-and-origin prefix policy.

#### Scenario: Draft document is edited and confirmed
- GIVEN an authorized actor opens a draft stock document
- WHEN the actor updates draft lines and confirms the document
- THEN the system MUST persist the edits, lock further draft mutation, and return a generated `documentNo`

#### Scenario: Confirmed document rejects draft mutation
- GIVEN a stock document is `confirmed` or `cancelled`
- WHEN an actor attempts to add, update, or remove a line
- THEN the system MUST reject the mutation

### Requirement: Quant maintenance, cancellation, and stock queries

The system MUST maintain stock quants when documents are confirmed or cancelled, MUST treat transfer confirmation as stock-out plus stock-in, MUST set moving weighted average to `NULL` when resulting quantity is zero, and MUST expose authenticated backend queries for stock lots and quants. Reversal MUST create a new linked stock document rather than rewriting the original confirmed document.

#### Scenario: Confirmation updates quants and average cost
- GIVEN a valid draft document with inventory lines
- WHEN an authorized actor confirms it
- THEN the system MUST update the affected quants and weighted average for every impacted scope

#### Scenario: Cancellation compensates confirmed stock
- GIVEN a confirmed stock document
- WHEN an authorized actor cancels it
- THEN the system MUST apply compensating quant maintenance without deleting the original stock history

## MODIFIED Requirements

### Requirement: Restricted stock locations and lot gating

The system MUST restrict document and quant scope types to `warehouse` or `point-of-sale`, MUST enforce scope-type pair checks, MUST provide `stock_lots`, and MUST enforce backend lot rules from `items.trackBatchMode`: `batch` requires a lot, `serial` requires a lot and quantity `1` per line, and `none` MUST forbid a lot. The system SHALL NOT auto-create lots during document confirmation.
(Previously: The requirement provided stock lots from day one but deferred `items.trackBatchMode` lot gating to later application logic.)

#### Scenario: Allowed stock scopes persist
- GIVEN a document or quant uses a warehouse or point-of-sale node consistently
- WHEN the row is written
- THEN PostgreSQL MUST allow it

#### Scenario: Disallowed scopes fail
- GIVEN a document or quant uses another node type or mismatched scope pair
- WHEN the row is written
- THEN PostgreSQL MUST reject it

#### Scenario: Invalid lot usage is rejected
- GIVEN an inventory line violates the configured lot tracking mode for its item
- WHEN an actor creates, edits, or confirms the document
- THEN the system MUST reject the line

### Requirement: Indexes, permission seeds, migration proof, and scope boundary

The system MUST keep indexes supporting lot uniqueness and null-safe quant uniqueness per company, item, scope, and lot, MUST keep permission catalog seeds `inventory.stock.read|write|adjust` plus additive `inventory.documents.*`, MUST keep per-migration real-PostgreSQL proof through `createMigrationTestDatabase`, and MUST allow backend API and application-layer behavior required to expose `inventory-stock` while still excluding frontend UI and schema or migration changes from this change. Backend authorization MUST enforce company access, document and stock permissions, and the extra `inventory.stock.adjust` permission when confirming adjustments. Constraint and trigger failures exposed by this capability MUST be translated into client-facing 4xx errors.
(Previously: The requirement allowed only DB assets and explicitly excluded API, UI, and application-layer behavior.)

#### Scenario: Migration tests prove inventory constraints
- GIVEN the migration test suite runs against PostgreSQL
- WHEN inventory migrations are applied
- THEN tests MUST verify type checks, scope checks, lot uniqueness, tenant integrity, and non-negative quants

#### Scenario: Scope boundary permits backend only
- GIVEN this change is implemented
- WHEN affected artifacts are reviewed
- THEN backend slice, routing, authorization, error translation, and tests MUST be allowed, while UI and schema changes MUST NOT be required

#### Scenario: Adjustment confirm needs double permission
- GIVEN a draft adjustment document is ready to confirm
- WHEN the actor lacks either document confirm or stock adjust permission
- THEN the system MUST deny confirmation
