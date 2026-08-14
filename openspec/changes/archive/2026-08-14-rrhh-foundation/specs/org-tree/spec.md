# Delta for org-tree

## ADDED Requirements

### Requirement: Employee-linked deletion preflight

The system MUST reject organizational node deletion when the delete would orphan active employee assignments or reporting-line resolution.

#### Scenario: Active employee assignment blocks deletion
- GIVEN an organization node is referenced by an active employee assignment
- WHEN deletion of that node is requested
- THEN the system MUST reject the deletion

#### Scenario: Node without employee references can be deleted
- GIVEN an organization node has no active employee assignment or reporting-line dependency
- WHEN deletion of that node is requested
- THEN the system MAY continue with the normal deletion flow

## MODIFIED Requirements

### Requirement: Canonical Scope Tree

The system MUST expose one official tree with node types `company`, `division`, `local`, `area`, `warehouse`, and `point-of-sale`. Each node SHALL resolve to exactly one parent in the same company, except the company root. The canonical tree MUST remain limited to organizational addressability; employees, positions, `direct_reports`, and `self` MUST NOT become canonical tree node types. Reporting-line hierarchy and organization-node responsibility SHALL remain separate from tree semantics.
(Previously: The tree requirement defined the official six node types and single-parent lineage without explicitly excluding employee/reporting-line semantics.)

#### Scenario: Resolve lineage for a descendant node
- GIVEN a warehouse or point-of-sale stored in the canonical tree
- WHEN the lineage is requested
- THEN the system SHALL return the node and its ordered ancestors up to the company root

#### Scenario: Company root has no parent
- GIVEN a company root node
- WHEN its lineage is requested
- THEN the system MUST return the company node without a parent node
