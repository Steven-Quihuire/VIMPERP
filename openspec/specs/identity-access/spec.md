# identity-access Specification

## Purpose

Define credential-based authentication, protected access, and minimum RBAC for the first slice.

## Requirements

### Requirement: Credential Authentication

The system MUST support email-or-username plus password sign-in and MUST NOT require or expose social login.

#### Scenario: Valid credentials create an authenticated session
- GIVEN a registered user with valid credentials
- WHEN the user signs in
- THEN the system SHALL grant authenticated access to allowed areas

#### Scenario: Invalid credentials are rejected
- GIVEN an unregistered or wrong credential pair
- WHEN sign-in is attempted
- THEN the system MUST deny access without revealing sensitive verification details

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

### Requirement: Bootstrap Admin Safety

The system MAY provide temporary `admin / admin` bootstrap credentials for non-production bootstrap only and MUST prevent that behavior from being valid in production.

#### Scenario: Bootstrap environment allows seed admin
- GIVEN a bootstrap or development environment
- WHEN the seeded admin credentials are used
- THEN the system SHALL allow platform-admin access

#### Scenario: Production disallows seed admin behavior
- GIVEN a production environment
- WHEN the seeded admin credentials are attempted
- THEN the system MUST reject them

### Requirement: Super Admin-Only Observability Access

The system MUST restrict observability APIs and observability dashboard screens to `platform-admin` users and MUST deny company-scoped roles.

#### Scenario: Platform admin requests observability resources
- GIVEN an authenticated `platform-admin`
- WHEN the user requests an observability API or screen
- THEN the system SHALL grant access

#### Scenario: Company-scoped user requests observability resources
- GIVEN an authenticated user without the `platform-admin` role
- WHEN the user requests an observability API or screen
- THEN the system MUST deny access
