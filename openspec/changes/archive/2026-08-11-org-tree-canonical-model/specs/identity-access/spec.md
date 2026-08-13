# Delta for identity-access

## ADDED Requirements

### Requirement: Authorized Active Scope Switching

The system MUST allow active-scope switching only to authorized nodes within the user's assigned scopes. Warehouse and point-of-sale active scopes SHALL drive operational defaults.

#### Scenario: Authorized warehouse switch succeeds
- GIVEN a user authorized for a warehouse scope
- WHEN the user selects that warehouse as active scope
- THEN the system SHALL persist that warehouse as the active scope and use it for operational defaults

#### Scenario: Out-of-scope switch is rejected
- GIVEN a user is not assigned to a target node or its governing subtree
- WHEN the user requests that node as active scope
- THEN the system MUST reject the switch

## MODIFIED Requirements

### Requirement: Protected Access and Roles

The system MUST protect dashboard, company, and locale APIs behind authentication and SHALL define at least `platform-admin`, `company-owner`, and `company-user` roles. Authorization MUST evaluate centralized capabilities from role capabilities plus active scope context. Scope assignments MUST determine where a role applies; role definitions MUST NOT encode scope breadth. Subtree-inclusive assignments SHALL expose descendant scopes; exact-node mode MAY restrict access to the assigned node only.
(Previously: Authorization used centralized capabilities derived from role plus active company context only.)

#### Scenario: Authorized capability reaches a protected resource
- GIVEN an authenticated user with a permitted capability on the active scope context
- WHEN the user requests an allowed protected resource
- THEN the system SHALL return the resource

#### Scenario: Missing scope authority is blocked
- GIVEN an authenticated user without capability or scope authority for the active scope context
- WHEN the user requests a protected resource
- THEN the system MUST deny access

### Requirement: Active Company Context

The system MUST expose an explicit active scope for tenant-scoped flows. The active scope MUST reference one authorized `scope_nodes` node of type `company`, `division`, `local`, `area`, `warehouse`, or `point-of-sale`; derived active company context MAY still be exposed from that lineage. If one authorized scope exists, the system MAY auto-select it; if multiple authorized scopes exist, the system MUST require selection before scope-bound access. Backfill from saved `activeLocalId` MUST preserve current local behavior by resolving the matching local scope node.
(Previously: The session exposed only active company, with optional implicit local behavior outside the requirement.)

#### Scenario: Saved local backfills to active scope
- GIVEN a user has a persisted `activeLocalId` that still belongs to an authorized local
- WHEN the session is resolved
- THEN the system SHALL set the active scope to that local node

#### Scenario: Multiple authorized scopes require selection
- GIVEN an authenticated user has multiple authorized scopes and no resolvable saved scope
- WHEN the user enters a scope-bound flow
- THEN the system MUST block scope-bound access until one active scope is selected

## RENAMED Requirements

### Requirement: Active Company Context → Active Scope Context

(Reason: Runtime authorization now centers on one authorized scope node instead of company-only context.)
(Migration: Update contracts, tests, and docs to use `activeScope`; keep derived active company where tenant flows still require it.)
