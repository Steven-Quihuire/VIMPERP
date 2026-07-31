# Delta for dashboard-shell

## MODIFIED Requirements

### Requirement: Authenticated ERP Shell

The system MUST present an authenticated desktop dashboard shell with ERP navigation links to `/dashboard/items` and `/dashboard/categories`, plus summary cards for the first slice.
(Previously: the shell exposed ERP navigation placeholders instead of real catalog routes.)

#### Scenario: Authenticated user reaches the shell
- GIVEN an authenticated authorized user
- WHEN the user enters the dashboard
- THEN the system SHALL show the shell, summary cards, and catalog navigation links

#### Scenario: User opens a catalog module
- GIVEN an authenticated authorized user
- WHEN the user selects Items or Categories navigation
- THEN the system SHALL route to `/dashboard/items` or `/dashboard/categories`

#### Scenario: Unauthorized user cannot reach the shell
- GIVEN a user without valid access
- WHEN the dashboard is requested
- THEN the system MUST deny dashboard rendering
