# Delta for hr-timesheets

## ADDED Requirements

### Requirement: Tenant-safe timesheet storage

The system MUST store `timesheet_periods` and `time_entries` with uuid primary keys, `companyId`, and composite tenant foreign keys so each row resolves only within its owning company.

#### Scenario: Period and entry tenant references are valid
- GIVEN a migration creates timesheet tables
- WHEN a period references an employee assignment and an entry references a period
- THEN each relation MUST enforce `(id, company_id)` tenant integrity

#### Scenario: Cross-company references are rejected
- GIVEN a row targets a parent from another company
- WHEN the insert or update executes
- THEN PostgreSQL MUST reject the write

### Requirement: Timesheet period state and approval snapshot

The system MUST store period status as `draft|submitted|approved|rejected`, keep nullable `approvalPolicyId` as a snapshot reference, and enforce submit/approve timestamp-user pair checks with approvers stored as `users.id`.

#### Scenario: Submitted or approved periods carry actor pairs
- GIVEN a period enters `submitted` or `approved`
- WHEN persistence occurs
- THEN the matching timestamp and `users.id` actor fields MUST be present together

#### Scenario: Incomplete state metadata is rejected
- GIVEN a submitted or approved period misses one side of a pair
- WHEN the row is written
- THEN PostgreSQL MUST reject the write

### Requirement: Period overlap prevention

The system MUST allow custom company date ranges and MUST prevent overlapping periods for the same employee assignment by using `btree_gist` and an exclusion constraint, while allowing adjacent non-overlapping ranges.

#### Scenario: Overlapping periods fail
- GIVEN an assignment already has one stored period
- WHEN another period overlaps its date range
- THEN PostgreSQL MUST reject the second row

#### Scenario: Adjacent periods succeed
- GIVEN an assignment has a stored period ending on one day
- WHEN the next period starts on the following day
- THEN PostgreSQL MUST allow the second row

### Requirement: Time entry bounds and task shape

The system MUST store entry hours as `numeric(5,2)` with `0 < hours <= 24`, keep `projectId` nullable without a foreign key, keep `taskLabel`, and index or uniquely constrain period/day/task access patterns needed by the DB foundation.

#### Scenario: Valid bounded hours persist
- GIVEN an entry has hours within the allowed range
- WHEN the row is inserted
- THEN PostgreSQL MUST accept it

#### Scenario: Invalid hours are rejected
- GIVEN an entry has hours less than or equal to zero or greater than twenty-four
- WHEN the row is inserted or updated
- THEN PostgreSQL MUST reject it

### Requirement: Permission seeds, migration proof, and scope boundary

The system MUST add permission catalog seeds `hr.timesheets.read|write|submit|approve`, MUST ship per-migration tests on real PostgreSQL through `createMigrationTestDatabase`, and MUST NOT introduce API, UI, or application-layer behavior in this change.

#### Scenario: Migration test proves DB contract
- GIVEN the migration test suite runs against PostgreSQL
- WHEN the timesheets migration is applied
- THEN tests MUST verify enum values, pair checks, hour bounds, and overlap behavior

#### Scenario: Spec boundary stays DB-only
- GIVEN this change is implemented
- WHEN affected artifacts are reviewed
- THEN only schema, migration, permission seed, index, constraint, and migration-test assets MUST be required
