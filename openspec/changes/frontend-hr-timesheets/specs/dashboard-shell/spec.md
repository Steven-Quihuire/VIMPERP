# Delta for dashboard-shell

## ADDED Requirements

### Requirement: HR Timesheets navigation entry

The system MUST show a Timesheets entry in the HR navigation section for users with timesheet visibility, and SHALL route that entry to the company-scoped timesheets list inside the authenticated shell.

#### Scenario: Authorized user opens Timesheets from HR navigation
- GIVEN an authenticated user with timesheet read visibility
- WHEN the dashboard shell renders and the user selects Timesheets
- THEN the system SHALL show the HR navigation entry and open the timesheets list route

#### Scenario: User without timesheet visibility sees no entry
- GIVEN an authenticated user without timesheet visibility
- WHEN the dashboard shell renders
- THEN the system MUST NOT show the Timesheets navigation entry
