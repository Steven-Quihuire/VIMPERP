# org-tree Specification

## Purpose

Define the official organizational tree as the six-type canonical read model over `scope_nodes`.

## Requirements

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

### Requirement: Authorized Tree Visibility

The system MUST allow a user to stand on any authorized node. A subtree-inclusive assignment SHALL expose that node and its descendant subtree; nodes outside assigned scopes MUST NOT be visible.

#### Scenario: Parent assignment reveals descendants
- GIVEN a user assigned to a division with subtree-inclusive access
- WHEN the org tree is listed
- THEN the system SHALL include descendant locals, areas, warehouses, and points of sale under that division

#### Scenario: Unauthorized sibling stays hidden
- GIVEN a user without access to a sibling branch
- WHEN the org tree is listed
- THEN the system MUST exclude that sibling branch

### Requirement: Active Scope Governs Operations

The system MUST execute scoped operations on the active scope only and MUST NOT implicitly apply them to all visible descendants. Warehouse and point-of-sale active scopes SHALL drive operational defaults.

#### Scenario: Visible descendants do not widen an operation
- GIVEN a user can see a local and its warehouses
- WHEN the active scope is the local and an operation is executed
- THEN the system SHALL target only that active local unless the user explicitly selects another scope

#### Scenario: Warehouse active scope drives defaults
- GIVEN a user switches the active scope to a warehouse
- WHEN an operational flow opens
- THEN the system MUST default the flow to that warehouse scope

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
