# Delta for identity-access

## ADDED Requirements

### Requirement: Active Company Context

The system MUST expose an explicit active company for tenant-scoped flows. If one active company membership exists, the system MAY auto-select it; if multiple exist, the system MUST require selection before tenant-scoped access.

#### Scenario: Single membership auto-selects
- GIVEN an authenticated user with one active company membership
- WHEN the user enters a tenant-scoped flow
- THEN the system SHALL use that company as the active company

#### Scenario: Multiple memberships require selection
- GIVEN an authenticated user with multiple active company memberships
- WHEN the user enters a tenant-scoped flow without selecting one
- THEN the system MUST block tenant-scoped access until selection

## MODIFIED Requirements

### Requirement: Protected Access and Roles

The system MUST protect dashboard, company, and locale APIs behind authentication and SHALL define at least `platform-admin`, `company-owner`, and `company-user` roles. Authorization MUST evaluate centralized capabilities derived from role plus active company context instead of route-local role checks.
(Previously: Protected resources required authentication and direct role checks only.)

#### Scenario: Authorized capability reaches protected resources
- GIVEN an authenticated user with a permitted capability in the active company context
- WHEN the user requests an allowed dashboard or company resource
- THEN the system SHALL return the resource

#### Scenario: Unauthorized or context-missing access is blocked
- GIVEN an unauthenticated user, insufficient capability, or missing required active company
- WHEN a protected resource is requested
- THEN the system MUST deny access
