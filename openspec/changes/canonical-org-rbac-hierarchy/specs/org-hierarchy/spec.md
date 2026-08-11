# Delta for org-hierarchy

## ADDED Requirements

### Requirement: Canonical scope node lineage

The system MUST define one canonical scope node for every company, division, local, area, warehouse, and point of sale. Canonical lineage SHALL resolve ancestor scope consistently for authorization and hierarchy reads.

#### Scenario: Canonical node exists for an addressable org record
- GIVEN an org record is active
- WHEN hierarchy or authorization reads target that record
- THEN exactly one canonical scope node represents it

#### Scenario: Authorization uses canonical lineage
- GIVEN a user has an assignment on an ancestor scope node
- WHEN permissions are computed for a descendant active scope
- THEN the ancestor assignment is included

### Requirement: Role assignment scope integrity

The system MUST store role assignments against canonical scope nodes only. Migration-time dangling assignments MUST be quarantined and audited, and live deletion of a scope node with active assignments SHALL be rejected.

#### Scenario: Migration quarantines dangling assignments
- GIVEN a legacy assignment points to a missing scope target
- WHEN canonical scope migration runs
- THEN the assignment is moved to quarantine and an audit event is recorded

#### Scenario: Live delete is blocked by active assignments
- GIVEN a scope node has active role assignments
- WHEN deletion is requested
- THEN the delete is rejected

## MODIFIED Requirements

### Requirement: Sucursal label presentation

The web UI MUST present the business label `Sucursales` in hierarchy-related UI. The system SHALL rename existing branch/local storage and contract identifiers to canonical `local`/`locals` naming as part of this change while preserving the `Sucursales` user-facing label.
(Previously: The UI renamed labels only and explicitly kept `branches` storage plus active-local contracts unchanged.)

#### Scenario: User sees sucursal labels
- GIVEN a company user opens hierarchy-related UI
- WHEN sidebar items, titles, switcher text, or badges render
- THEN the visible label is `Sucursales`

#### Scenario: Canonical local naming replaces branch storage contracts
- GIVEN backend or frontend hierarchy code uses branch or local identifiers
- WHEN this change is deployed
- THEN persisted and API contracts use canonical local naming instead of `branches`
