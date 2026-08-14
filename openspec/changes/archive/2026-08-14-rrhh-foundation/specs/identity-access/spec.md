# Delta for identity-access

## MODIFIED Requirements

### Requirement: Protected Access and Roles

The system MUST protect dashboard, company, and locale APIs behind authentication and SHALL define at least `platform-admin`, `company-owner`, and `company-user` roles. Authorization MUST evaluate centralized capabilities from role capabilities plus active scope context. Scope assignments MUST determine where a role applies; role definitions MUST NOT encode scope breadth. Subtree-inclusive assignments SHALL expose descendant scopes; exact-node mode MAY restrict access to the assigned node only. HR authorization SHALL support permission scopes `company`, `node+descendants`, `direct_reports`, and `self`. `direct_reports` SHALL include only direct reports from the active employee reporting line, and `self` SHALL include only the actor's own employee record. `direct_reports` and `self` MUST NOT be represented as canonical scope node types.
(Previously: Authorization used centralized capabilities derived from role plus active company context only.)

#### Scenario: Authorized capability reaches protected resources
- GIVEN an authenticated user with a permitted capability in the active scope lineage
- WHEN the user requests an allowed protected resource
- THEN the system SHALL return the resource

#### Scenario: Unauthorized or scope-missing access is blocked
- GIVEN an unauthenticated user, insufficient capability, or missing required active scope
- WHEN a protected resource is requested
- THEN the system MUST deny access

#### Scenario: Direct-reports scope excludes indirect reports
- GIVEN an actor manages one employee whose own subordinate manages others
- WHEN authorization is evaluated with `direct_reports`
- THEN the system MUST include only the actor's direct reports

### Requirement: Active Company Context

The system MUST expose an explicit active canonical scope for tenant-scoped flows. If one valid scope is implied, the system MAY auto-select it; if multiple valid scopes exist, the system MUST require selection before scope-bound access. Legacy sessions carrying only `activeLocalId` SHALL backfill to the equivalent active local scope on first read. The active scope MUST remain one authorized canonical org node; reporting-line scopes such as `direct_reports` and `self` MUST NOT become active scope values.
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

#### Scenario: Reporting-line scope cannot become active scope
- GIVEN an authenticated user has HR permissions using `self` or `direct_reports`
- WHEN active scope is resolved or switched
- THEN the system MUST reject those values as active canonical scopes
