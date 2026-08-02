# Delta for item-catalog

## MODIFIED Requirements

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
