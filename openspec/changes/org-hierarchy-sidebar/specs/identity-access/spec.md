# Capability: identity-access (delta)

Extends identity and session management to support the organizational hierarchy.

## ADDED Requirements

### Requirement: Membership scope fields

- AuthMembership MUST include nullable `divisionId` (string | null).
- AuthMembership MUST include nullable `localId` (string | null).
- A membership with localId set means the user operates at that local.
- A membership with divisionId set and localId null means the user operates at that division level.
- A membership with both null means the user operates at company level.

### Requirement: Active local in session

- AuthSession MUST include nullable `activeLocalId` (alongside existing activeCompany).
- On login, activeLocalId MUST default to null (user starts at company level).
- Users SHALL NOT be auto-scoped to their membership's local on login.

### Requirement: Session shape lockstep

- The Zod `authSessionSchema` and the web `AuthSession` type MUST have identical field shapes.
- A shape-equality test SHALL exist to verify the Zod schema and web type stay synchronized.
- Adding a field to one without the other SHALL fail the shape-equality test.

### Requirement: Switch active local

- POST /auth/me/active-local SHALL set the active local for the current session.
- The endpoint MUST accept body {localId: string | null}.
- Setting localId to null SHALL clear the active local (return to company level).
- The active local MUST belong to the active company; otherwise the request SHALL fail with 400.

### Requirement: Capability derivation unchanged

- deriveAuthCapabilities MUST remain unchanged (role-based at company level).
- No per-level roles (division-manager, local-manager) SHALL be introduced.
- requireTenantCapability MUST still return companyId as the tenant root.
- localId is a finer scope on top of the tenant root, not a replacement.

### Requirement: Tenant scoping with local

- When activeLocalId is null, tenant scope is companyId only.
- When activeLocalId is set, tenant scope is companyId AND localId.

## Scenarios

### Scenario: Login with local-level membership starts at company level

- **Given** a user has a membership with localId "local-1" in company "Acme"
- **When** they log in
- **Then** the AuthSession contains activeLocalId: null
- **And** the user starts at company level, not at local-1

### Scenario: Switch active local

- **Given** a company-owner is authenticated with active company "Acme" and activeLocalId null
- **And** a local "Store A" with id "local-1" exists in company "Acme"
- **When** they POST /auth/me/active-local with body {localId: "local-1"}
- **Then** the response status is 204
- **And** subsequent /auth/me responses contain activeLocalId: "local-1"

### Scenario: Clear active local

- **Given** a company-owner has activeLocalId "local-1"
- **When** they POST /auth/me/active-local with body {localId: null}
- **Then** the response status is 204
- **And** subsequent /auth/me responses contain activeLocalId: null

### Scenario: Switch to a local from another company (error)

- **Given** a company-owner is authenticated with active company "Acme"
- **And** a local "Other" with id "local-x" exists in company "Beta" (not Acme)
- **When** they POST /auth/me/active-local with body {localId: "local-x"}
- **Then** the response status is 400

### Scenario: Session shape lockstep test

- **Given** the Zod authSessionSchema and the web AuthSession type exist
- **When** the shape-equality test runs
- **Then** all fields in the Zod schema MUST have a corresponding field in the web type
- **And** all fields in the web type MUST have a corresponding field in the Zod schema