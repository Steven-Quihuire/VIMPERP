# Capability: audit-event-management (delta)

Extends audit events to optionally record the organizational hierarchy context.

## ADDED Requirements

### Requirement: Optional hierarchy context on audit events

- auditEventsTable MUST gain nullable `divisionId` and `localId` columns.
- companyId MUST remain mandatory on audit events (cross-cutting queries depend on it).
- divisionId and localId are OPTIONAL context fields, populated when an audit event occurs within a division or local scope.

### Requirement: Audit event filtering by hierarchy

- Audit event list filters MAY optionally filter by divisionId or localId.
- Filtering by companyId MUST continue to work as the primary cross-cutting query.
- When divisionId or localId filter is null, events with any (including null) value SHALL be returned.

## Scenarios

### Scenario: Audit event with hierarchy context

- **Given** a company-owner performs an item update at local "local-1" in division "retail-1"
- **When** the audit event is recorded
- **Then** the audit event contains companyId, divisionId: "retail-1", localId: "local-1"

### Scenario: Audit event at company level

- **Given** a company-owner performs an action at company level (no active local)
- **When** the audit event is recorded
- **Then** the audit event contains companyId and divisionId: null, localId: null

### Scenario: Filter audit events by local

- **Given** audit events exist for multiple locals
- **When** the admin lists events filtered by localId: "local-1"
- **Then** only events with localId: "local-1" are returned