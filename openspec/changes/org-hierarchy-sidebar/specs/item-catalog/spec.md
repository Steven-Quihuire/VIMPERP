# Capability: item-catalog (delta)

Extends item and category management to support local-scoped catalog.

## ADDED Requirements

### Requirement: Local-scoped items table

- itemsTable MUST gain a nullable `localId` column.
- A localId of NULL means the item is company-wide (backward compatible).
- A localId of NOT NULL means the item is local-specific.

### Requirement: Local-scoped categories table

- itemCategoriesTable MUST gain a nullable `localId` column.
- A localId of NULL means the category is company-wide.
- A localId of NOT NULL means the category is local-specific.

### Requirement: SKU uniqueness per local

- Item SKU uniqueness MUST be per (companyId, localId).
- Two locals in the same company MAY have items with the same SKU.
- A company-wide item (localId NULL) and a local-specific item MAY have the same SKU.
- The unique index on items MUST change from (companyId, sku) to (companyId, localId, sku) via migration.

### Requirement: Category name uniqueness per local

- Category name uniqueness MUST be per (companyId, localId, parentId).
- The unique index on item_categories MUST change from (companyId, parentId, name) to (companyId, localId, parentId, name).

### Requirement: Gateway filtering with localId

- The item gateway MUST filter by both companyId AND localId.
- The filter MUST be NULL-safe: `localId IS NOT DISTINCT FROM ?` (null localId matches null, not 'not null').
- The defensive double-filter pattern (SQL WHERE + TS normalizeItemRows) MUST include localId on both gates.
- SQL gate: `WHERE companyId = ? AND localId IS NOT DISTINCT FROM ?`
- TS gate: `normalizeItemRows` must verify localId matches the expected value for every row.

### Requirement: Query scoping by active local

- When activeLocalId is null: queries MUST return items where localId IS NULL (company-wide only).
- When activeLocalId is set: queries MUST return items where localId = activeLocalId (that local's items only).
- A local-scoped query SHALL NOT return company-wide items, and vice versa.

### Requirement: Item creation with localId

- Creating an item: localId MUST come from the active session's activeLocalId (or null if at company level).
- The API SHALL NOT accept localId in the request body; it derives from the session.

### Requirement: Backward compatibility

- Existing companies without locals: existing items keep localId NULL and MUST behave identically to today.
- The migration to add localId MUST be additive (nullable column, no default, no NOT NULL).

## Scenarios

### Scenario: List items at company level (no active local)

- **Given** a company "Acme" with items {SKU: "A1", localId: null} and {SKU: "A2", localId: "local-1"}
- **And** activeLocalId is null
- **When** the user lists items
- **Then** only {SKU: "A1", localId: null} is returned

### Scenario: List items at a specific local

- **Given** a company "Acme" with items {SKU: "A1", localId: null} and {SKU: "A2", localId: "local-1"}
- **And** activeLocalId is "local-1"
- **When** the user lists items
- **Then** only {SKU: "A2", localId: "local-1"} is returned

### Scenario: Create an item at a local

- **Given** a company-owner is at local "local-1" (activeLocalId: "local-1")
- **When** they create an item with body {name: "Widget", sku: "W1"}
- **Then** the created item has localId: "local-1"

### Scenario: Create an item at company level

- **Given** a company-owner is at company level (activeLocalId: null)
- **When** they create an item with body {name: "Widget", sku: "W1"}
- **Then** the created item has localId: null

### Scenario: SKU collision between two locals (succeeds)

- **Given** a company "Acme" has local "local-1" and local "local-2"
- **And** local-1 has an item with SKU "W1"
- **When** the company-owner at local-2 creates an item with body {name: "Widget", sku: "W1"}
- **Then** the creation succeeds (SKU is unique per local)

### Scenario: Company without locals sees same items as before

- **Given** a company "Legacy" has no locals and items with localId NULL
- **When** the user lists items (activeLocalId is null)
- **Then** the items returned are identical to the pre-hierarchy behavior