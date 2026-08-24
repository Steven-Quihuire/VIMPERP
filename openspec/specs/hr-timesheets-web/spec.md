# hr-timesheets-web Specification

## Purpose

Define the desktop HR timesheets experience for employees and managers inside the company dashboard.

## Requirements

### Requirement: Period list and visibility scope

The system MUST show a company-scoped timesheet periods list with a status filter, and MUST limit visible periods to the authenticated employee scope allowed by session capabilities.

#### Scenario: Employee views own periods
- GIVEN an authenticated employee with timesheet read access
- WHEN the employee opens the Timesheets list and selects a status filter
- THEN the system SHALL show only that employee's matching periods

#### Scenario: Manager scope excludes unrelated employees
- GIVEN an authenticated manager with team review access
- WHEN the manager opens the Timesheets list
- THEN the system MUST show only the manager and direct-report periods within scope

### Requirement: Weekly detail, scoped entry loading, and draft editing

The system MUST compose period detail from the period resource plus the scoped `GET /companies/:companyId/timesheets/:periodId/entries` resource, and MUST allow entry create, update, and delete actions only while the period is editable for the current user.

#### Scenario: Detail view loads scoped entries
- GIVEN the current user can view a period
- WHEN the user opens the weekly detail view
- THEN the system SHALL show that period's entries from the dedicated entries resource in the weekly grid

#### Scenario: Non-editable or out-of-scope period blocks entry changes
- GIVEN a submitted, approved, or out-of-scope period
- WHEN the user opens its detail view
- THEN the system MUST NOT offer draft entry editing controls

### Requirement: Workflow actions by role and status

The system MUST expose submit, approve, reject, and reopen actions only when the current role and period status allow them, and MUST require a rejection reason before a reject action completes.

#### Scenario: Employee submits own draft period
- GIVEN the current user can submit a draft period
- WHEN the user triggers Submit
- THEN the system SHALL transition the period out of draft editing mode

#### Scenario: Rejection requires a reason
- GIVEN an authorized reviewer is rejecting a submitted period
- WHEN the reviewer attempts Reject without a reason
- THEN the system MUST block completion and request a reason

### Requirement: Actionable timesheet error feedback

The system MUST translate typed timesheet API failures into actionable UI feedback and MUST preserve the current screen context while the user resolves the problem.

#### Scenario: Entry conflict returns a friendly message
- GIVEN the server rejects an entry save with a typed conflict error
- WHEN the UI receives the failure
- THEN the system SHALL show an actionable message near the editing flow

#### Scenario: Invalid workflow action preserves context
- GIVEN the server rejects submit, approve, reject, or reopen with a typed state error
- WHEN the action fails
- THEN the system MUST keep the current period view available for correction or refresh

#### Scenario: Entry list load failure preserves detail context
- GIVEN the period detail is visible but the entries request fails with a typed access or state error
- WHEN the weekly detail view resolves
- THEN the system SHALL keep the period context visible and show actionable feedback for the entries section
