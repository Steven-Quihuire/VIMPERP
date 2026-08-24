# Delta for hr-timesheets

## ADDED Requirements

### Requirement: Scoped period entry listing

The system MUST expose a read-only `GET /companies/:companyId/timesheets/:periodId/entries` endpoint that returns only entries belonging to the requested period when the caller has company access and period visibility, and MUST reject access outside that scope.

#### Scenario: Authorized caller lists entries for one visible period
- GIVEN an authenticated caller can view a period within the requested company
- WHEN the caller requests that period's entries
- THEN the system SHALL return only entries that belong to that period

#### Scenario: Visible period with no entries returns an empty list
- GIVEN an authenticated caller can view a period that has no stored entries
- WHEN the caller requests that period's entries
- THEN the system MUST return an empty collection without changing period state

#### Scenario: Out-of-scope caller cannot read period entries
- GIVEN an authenticated caller lacks access to the requested company or period
- WHEN the caller requests that period's entries
- THEN the system MUST deny the request and MUST NOT disclose another period's entries
