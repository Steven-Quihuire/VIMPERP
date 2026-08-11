# Delta for warehouses-management

## MODIFIED Requirements

### Requirement: Warehouse lifecycle

The system MUST provide CRUD lifecycle management for warehouses. Each warehouse MUST belong to one company and MUST reference exactly one parent: an area or a local. Reads SHALL allow `company-owner` and `company-user`; writes SHALL allow `company-owner` only.
(Previously: A warehouse could reference an area, a sucursal, or both.)

#### Scenario: Create a warehouse linked to one parent
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create `{ name: "Main Warehouse", areaId: "area-1" }`
- THEN the warehouse is stored for company `acme`

#### Scenario: Reject an unknown or foreign area
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create or update a warehouse with an `areaId` that is missing or outside company `acme`
- THEN the request is rejected

#### Scenario: Reject zero-parent or dual-parent warehouse
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create or update a warehouse with neither or both `areaId` and `localId`
- THEN the request is rejected
