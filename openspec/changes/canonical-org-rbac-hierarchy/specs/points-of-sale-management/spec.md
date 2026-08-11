# Delta for points-of-sale-management

## MODIFIED Requirements

### Requirement: Point of sale lifecycle

The system MUST provide CRUD lifecycle management for points of sale. Each point of sale MUST belong to one company and MUST reference exactly one parent: an area or a local. Reads SHALL allow `company-owner` and `company-user`; writes SHALL allow `company-owner` only.
(Previously: A point of sale could reference an area, a sucursal, or both.)

#### Scenario: Create a point of sale under one parent
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create `{ name: "Front Register", localId: "local-1" }`
- THEN the point of sale is stored for company `acme`

#### Scenario: Reject write access for company-user
- GIVEN a `company-user` belongs to company `acme`
- WHEN they try to create, update, or delete a point of sale
- THEN the request is forbidden

#### Scenario: Reject zero-parent or dual-parent point of sale
- GIVEN a `company-owner` belongs to company `acme`
- WHEN they create or update a point of sale with neither or both `localId` and `areaId`
- THEN the request is rejected
