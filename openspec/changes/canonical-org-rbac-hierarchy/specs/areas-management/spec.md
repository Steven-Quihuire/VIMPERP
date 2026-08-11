# Delta for areas-management

## MODIFIED Requirements

### Requirement: Area lifecycle

The system MUST provide CRUD lifecycle management for areas. Each area MUST belong to one company, MUST declare a `kind` of `area` or `department`, and MUST reference exactly one parent: a division or a local. Reads SHALL allow `company-owner` and `company-user`; writes SHALL allow `company-owner` only.
(Previously: An area could reference a sucursal, a division, or both.)

#### Scenario: Create an area under one parent
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create `{ name: "Cold Storage", kind: "area", localId: "local-1" }`
- THEN the area is stored for company `acme`

#### Scenario: Reject a parent outside the company
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create or update an area with a `localId` or `divisionId` from another company
- THEN the request is rejected

#### Scenario: Reject zero-parent or dual-parent area
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create or update an area with neither or both `localId` and `divisionId`
- THEN the request is rejected
