# Delta for audit-event-management

## ADDED Requirements

### Requirement: Quarantined scope assignment audit

The system MUST record an audit event whenever role-assignment migration quarantines a dangling scope reference. The event SHALL identify the affected assignment, company, original scope type, and quarantine action.

#### Scenario: Quarantine event is recorded
- GIVEN a legacy role assignment references a missing scope target
- WHEN migration quarantines that assignment
- THEN an audit event is appended with assignment and scope metadata

#### Scenario: Healthy assignments do not emit quarantine events
- GIVEN a legacy role assignment resolves to a canonical scope node
- WHEN migration backfills the assignment
- THEN no quarantine audit event is recorded
