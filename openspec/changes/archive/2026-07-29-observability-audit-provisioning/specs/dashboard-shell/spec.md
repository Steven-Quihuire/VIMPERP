# Delta for dashboard-shell

## ADDED Requirements

### Requirement: Super Admin Observability Workspace

The system MUST provide `platform-admin` users with dashboard screens for provisioning runs, sanitized application errors, and audit events.

#### Scenario: Super Admin opens observability views
- GIVEN an authenticated `platform-admin`
- WHEN the user opens the observability area
- THEN the system SHALL show the available list views and drill-down details

#### Scenario: Observability view has no matching records
- GIVEN an authenticated `platform-admin`
- WHEN applied filters return no matches
- THEN the system SHALL show an empty state
- AND the system MUST NOT offer retry or delete actions in the MVP
