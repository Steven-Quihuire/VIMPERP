# Capability: org-hierarchy

Multi-level organizational hierarchy (Company → Division → Local) with CRUD management.

## ADDED Requirements

### Requirement: Division entity

The system SHALL model a division as an organizational unit belonging to a company.

- A division MUST belong to exactly one company (companyId required).
- A division MUST have a name unique within its company.
- A division MUST have a createdAt timestamp.
- A company MAY have zero or more divisions.

### Requirement: Local entity

The system SHALL model a local as an operational organizational unit belonging to a company, optionally nested under a division.

- A local MUST belong to exactly one company (companyId required).
- A local MAY belong to a division (divisionId nullable; NULL = company-level local).
- A local MUST have a name unique within its company.
- A company MAY have zero or more locals.
- A local MAY exist without a division (company-level local).

### Requirement: Hierarchy optionality

The hierarchy is optional per company.

- A company with zero divisions and zero local SHALL behave identically to the pre-hierarchy flat model.
- A company MAY have locals without any divisions (all locals at company level).
- A company MAY have divisions without locals.
- A division MAY have zero locals.

### Requirement: Division management authorization

- company-owner SHALL have full CRUD access to divisions and locals.
- company-user MAY read (list, get) divisions and locals.
- company-user SHALL NOT create, update, or delete divisions or locals.
- platform-admin MAY read divisions and locals across all companies.

### Requirement: Division deletion constraints

- Deleting a division that has locals SHALL fail with a conflict error.
- Deleting a division with no locals SHALL succeed.
- Deleting a division SHALL NOT cascade-delete its locals.

### Requirement: Local deletion constraints

- Deleting a local that has items SHALL fail with a conflict error.
- Deleting a local that has memberships SHALL fail with a conflict error.
- Deleting a local with no items and no memberships SHALL succeed.

### Requirement: Division CRUD API

The system SHALL expose endpoints for division management.

- POST /companies/:companyId/divisions — create a division (body: {name})
- GET /companies/:companyId/divisions — list divisions for a company
- PATCH /divisions/:divisionId — update a division (body: {name})
- DELETE /divisions/:divisionId — delete a division (conflict if has locals)

### Requirement: Local CRUD API

The system SHALL expose endpoints for local management.

- POST /companies/:companyId/locals — create a local (body: {name, divisionId?})
- GET /companies/:companyId/locals — list locals for a company (optionally filtered by divisionId)
- PATCH /locals/:localId — update a local (body: {name, divisionId})
- DELETE /locals/:localId — delete a local (conflict if has items or memberships)

### Requirement: Local re-parenting

- A local MAY be moved between divisions via PATCH (update divisionId).
- A local MAY be moved to company level by setting divisionId to null.
- A local MAY be moved from company level to a division by setting divisionId.

## Scenarios

### Scenario: Create a division

- **Given** a company-owner is authenticated with active company "Acme"
- **When** they POST /companies/acme/divisions with body {name: "Retail"}
- **Then** the response status is 201
- **And** the response body contains {id, companyId: "acme", name: "Retail", createdAt}

### Scenario: Create a local at company level

- **Given** a company-owner is authenticated with active company "Acme"
- **When** they POST /companies/acme/locals with body {name: "Main Store"}
- **Then** the response status is 201
- **And** the response body contains {id, companyId: "acme", divisionId: null, name: "Main Store"}

### Scenario: Create a local under a division

- **Given** a company-owner is authenticated with active company "Acme"
- **And** a division "Retail" exists with id "retail-1"
- **When** they POST /companies/acme/locals with body {name: "Store A", divisionId: "retail-1"}
- **Then** the response status is 201
- **And** the response body contains {id, companyId: "acme", divisionId: "retail-1", name: "Store A"}

### Scenario: Delete a division with locals (conflict)

- **Given** a division "Retail" with id "retail-1" has one local
- **When** the company-owner DELETE /divisions/retail-1
- **Then** the response status is 409
- **And** the response body contains a conflict error

### Scenario: Delete a local with items (conflict)

- **Given** a local "Store A" with id "local-1" has one item
- **When** the company-owner DELETE /locals/local-1
- **Then** the response status is 409
- **And** the response body contains a conflict error

### Scenario: Delete a local with memberships (conflict)

- **Given** a local "Store A" with id "local-1" has one membership
- **When** the company-owner DELETE /locals/local-1
- **Then** the response status is 409
- **And** the response body contains a conflict error

### Scenario: Unauthorized local creation by company-user

- **Given** a company-user is authenticated with active company "Acme"
- **When** they POST /companies/acme/locals with body {name: "Store A"}
- **Then** the response status is 403

### Scenario: Re-parent a local between divisions

- **Given** a local "Store A" with divisionId "retail-1"
- **And** a division "Wholesale" with id "wholesale-1"
- **When** the company-owner PATCH /locals/local-a with body {divisionId: "wholesale-1"}
- **Then** the response status is 200
- **And** the response body contains divisionId: "wholesale-1"

### Scenario: Move a local to company level

- **Given** a local "Store A" with divisionId "retail-1"
- **When** the company-owner PATCH /locals/local-a with body {divisionId: null}
- **Then** the response status is 200
- **And** the response body contains divisionId: null

### Scenario: Company with no hierarchy (backward compat)

- **Given** a company "Legacy" with zero divisions and zero locals
- **When** any user lists divisions or locals
- **Then** the response is an empty array
- **And** the company behaves identically to the pre-hierarchy flat model