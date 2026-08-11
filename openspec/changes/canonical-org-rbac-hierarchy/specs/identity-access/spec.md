# Delta for identity-access

## MODIFIED Requirements

### Requirement: Protected Access and Roles

The system MUST protect dashboard, company, and local-scoped APIs behind authentication and SHALL define at least `platform-admin`, `company-owner`, and `company-user` roles. Authorization MUST evaluate centralized capabilities derived from role plus active canonical scope context instead of route-local role checks.
(Previously: Authorization evaluated capabilities only against the active company context.)

#### Scenario: Authorized capability reaches protected resources
- GIVEN an authenticated user with a permitted capability in the active scope lineage
- WHEN the user requests an allowed protected resource
- THEN the system SHALL return the resource

#### Scenario: Unauthorized or scope-missing access is blocked
- GIVEN an unauthenticated user, insufficient capability, or missing required active scope
- WHEN a protected resource is requested
- THEN the system MUST deny access

### Requirement: Active Company Context

The system MUST expose an explicit active canonical scope for tenant-scoped flows. If one valid scope is implied, the system MAY auto-select it; if multiple valid scopes exist, the system MUST require selection before scope-bound access. Legacy sessions carrying only `activeLocalId` SHALL backfill to the equivalent active local scope on first read.
(Previously: The session exposed only an active company and optional auto-selection by company membership.)

#### Scenario: Single implied scope auto-selects
- GIVEN an authenticated user has one valid active scope
- WHEN the user enters a scope-bound flow
- THEN the system SHALL use that scope

#### Scenario: Multiple valid scopes require selection
- GIVEN an authenticated user has multiple valid scopes
- WHEN the user enters a scope-bound flow without selecting one
- THEN the system MUST block access until selection

#### Scenario: Legacy local session backfills on first read
- GIVEN a valid session still carries only `activeLocalId`
- WHEN the session is read after migration
- THEN the system SHALL map it to the equivalent active local scope
