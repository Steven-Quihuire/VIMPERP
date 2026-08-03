# Item Catalog Specification

## Purpose

Company-scoped item/category catalog. Constraint: USD only.

## Requirements

### Requirement: Item creation

The system MUST create items with immutable `type`, enum `unit`, optional tenant-unique `sku`, default `unitPrice` 0, default `trackBatchMode` `none`, and service `tracksStock=false`.

#### Scenario: Create
- GIVEN owner/user in company A
- WHEN they create a valid product without sku
- THEN company A stores it and omitted price becomes 0

#### Scenario: Reject
- GIVEN owner/user in company A
- WHEN they send duplicate sku, invalid unit, or service `tracksStock=true`
- THEN the request is rejected

### Requirement: Item listing

The system MUST return only session-company items and exclude soft-deleted rows by default.

#### Scenario: List
- GIVEN active and deleted items across companies
- WHEN company A lists items
- THEN only active company A items are returned

#### Scenario: Exclude
- GIVEN company A item with `deletedAt`
- WHEN company A lists items
- THEN that row is not returned

### Requirement: Item detail

The system MUST resolve item detail only inside the session company. Soft-deleted items MAY resolve by id for audit/history.

#### Scenario: Read
- GIVEN active item in company A
- WHEN company A requests its id
- THEN the item detail is returned

#### Scenario: Foreign
- GIVEN item in company B
- WHEN company A requests that id
- THEN the result is not-found

### Requirement: Item update

The system MUST allow owners/users to update mutable fields, keep `type` immutable, and preserve tenant-unique sku rules.

#### Scenario: Update
- GIVEN owner/user in company A
- WHEN they change name, price, unit, category, or sku
- THEN the item is updated if valid

#### Scenario: Reject
- GIVEN item in company A
- WHEN a caller changes `type` or reuses another item sku
- THEN the request is rejected

### Requirement: Item soft delete

The system MUST allow soft-delete only when the caller has the centralized delete-item capability in the active company context, MUST set `deletedAt`, and MUST NOT expose hard delete.
(Previously: Only the `company-owner` role could soft-delete items.)

#### Scenario: Capability allows delete
- GIVEN a caller with delete-item capability for the active company and an active item
- WHEN the caller deletes the item
- THEN default lists SHALL exclude it afterward

#### Scenario: Missing capability forbids delete
- GIVEN a caller without delete-item capability for the active company
- WHEN that caller deletes an active item
- THEN the request MUST be forbidden

### Requirement: Category management

The system MUST support company-scoped category CRUD with nullable parent. A category MUST NOT reference itself or a descendant.

#### Scenario: Create
- GIVEN owner/user in company A
- WHEN they create a category under a company A parent
- THEN the child category is stored

#### Scenario: Cycle
- GIVEN category tree in company A
- WHEN a caller sets parent to self or descendant
- THEN the request is rejected

### Requirement: Multi-tenant isolation

The system MUST scope every item/category read/write by explicit active company context and MUST NOT trust body companyId or infer tenant context from the first membership.
(Previously: Requests were scoped by session companyId and only ignored body companyId.)

#### Scenario: Body company is ignored
- GIVEN a caller whose active company is company A
- WHEN create data names company B
- THEN the new record SHALL belong to company A only

#### Scenario: Missing active company blocks access
- GIVEN a caller without a resolved active company for a tenant-scoped route
- WHEN the caller reads or updates catalog data
- THEN the request MUST be denied before data access

### Requirement: Audit emission

The system MUST append audit events for item create, update, and soft-delete.

#### Scenario: Create
- GIVEN valid item creation
- WHEN the item is stored
- THEN `item.created` is appended

#### Scenario: Delete
- GIVEN valid owner soft-delete
- WHEN `deletedAt` is set
- THEN `item.deleted` is appended

### Requirement: Currency constraint

The system MUST interpret all item amounts as USD, MUST NOT expose currency selection, and MAY defer multi-currency.

#### Scenario: USD
- GIVEN valid item price
- WHEN the item is created
- THEN the amount is interpreted as USD

#### Scenario: Reject
- GIVEN request adding item or company currency
- WHEN the catalog processes it
- THEN the request is rejected or unsupported
