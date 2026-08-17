# Delta for hr-timesheets

## ADDED Requirements

### Requirement: Timesheet lifecycle and draft-only mutation

The system MUST expose backend behavior for period creation, retrieval, draft PATCH, entry add/update/remove, and `submit|approve|reject|reopen`. Periods MUST transition `draft -> submitted -> approved|rejected`, and `rejected -> draft` via reopen. Entries and period PATCH MUST be allowed only in `draft`. Empty-period submit MAY succeed. The system SHALL NOT expose a period delete operation.

#### Scenario: Rejected period is reopened for correction
- GIVEN a period is `rejected`
- WHEN an authorized actor reopens it
- THEN the period MUST return to `draft`

#### Scenario: Locked period rejects mutation
- GIVEN a period is `submitted` or `approved`
- WHEN an actor patches the period or changes an entry
- THEN the system MUST reject the mutation

### Requirement: Submit snapshot and approval guards

The system MUST auto-resolve the active approval policy at submit time and MUST snapshot its `approvalPolicyId` on the period. The submit request body MUST NOT choose `approvalPolicyId`; `NULL` is allowed only when no active policy matches. The system MUST reject self-approval and MUST require a rejection reason when rejecting a submitted period.

#### Scenario: Submit resolves policy automatically
- GIVEN a draft period is submitted
- WHEN exactly one active policy matches or none matches
- THEN the period MUST persist the matched policy id or `NULL` without body override

#### Scenario: Self-approval is denied
- GIVEN the submitter is also the approver
- WHEN that user approves the submitted period
- THEN the system MUST reject the approval

### Requirement: Entry validation and in-period enforcement

The system MUST validate each entry with `0 < hours <= 24` and `entryDate` inside the period range. Per-day aggregate caps and overtime rules MAY be deferred and SHALL NOT block this change.

#### Scenario: Entry inside the period is accepted
- GIVEN a draft period and an entry date within its start and end dates
- WHEN the entry hours are greater than zero and at most twenty-four
- THEN the system MUST accept the entry

#### Scenario: Entry outside the period is rejected
- GIVEN a draft period
- WHEN an entry date falls before the start or after the end
- THEN the system MUST reject the entry

### Requirement: Auth-scoped timesheet visibility

The system MUST scope list and read access to the authenticated actor's allowed HR scope, defaulting to self and direct reports rather than company-wide visibility. Assigned-approver visibility MAY remain unsupported while approval definition JSON stays uninterpreted.

#### Scenario: Direct-report period is visible
- GIVEN an authorized manager requests timesheets
- WHEN the target employee is within that manager's allowed HR scope
- THEN the system MUST return the matching periods

#### Scenario: Out-of-scope period is hidden
- GIVEN an authenticated actor requests another employee's timesheets
- WHEN that employee is outside the actor's allowed HR scope
- THEN the system MUST deny access

## MODIFIED Requirements

### Requirement: Permission seeds, migration proof, and scope boundary

The system MUST add permission catalog seeds `hr.timesheets.read|write|submit|approve`, MUST ship per-migration tests on real PostgreSQL through `createMigrationTestDatabase`, and MUST allow backend API and application-layer behavior required to expose the DB contract for `hr-timesheets` while still excluding frontend UI and schema or migration changes from this change.
(Previously: The requirement allowed only DB assets and explicitly excluded any API or application-layer behavior.)

#### Scenario: Migration test proves DB contract
- GIVEN the migration test suite runs against PostgreSQL
- WHEN the timesheets migration is applied
- THEN tests MUST verify enum values, pair checks, hour bounds, and overlap behavior

#### Scenario: Scope boundary permits backend only
- GIVEN this change is implemented
- WHEN affected artifacts are reviewed
- THEN backend slice, routing, wiring, and tests MUST be allowed, while UI and schema changes MUST NOT be required
