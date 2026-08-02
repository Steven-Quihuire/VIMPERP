# Delta for item-catalog-web

## ADDED Requirements

### Requirement: Active Company Entry Gate

The system MUST require an active company before entering catalog routes. If multiple companies are available and none is active, the system MUST redirect to selection instead of rendering catalog data.

#### Scenario: Active company allows entry
- GIVEN an authenticated session with an active company
- WHEN `/dashboard/items` opens
- THEN the catalog SHALL load for that company

#### Scenario: Missing active company redirects
- GIVEN an authenticated session with multiple companies and no active company
- WHEN `/dashboard/items` opens
- THEN the system MUST redirect to company selection

## MODIFIED Requirements

### Requirement: RBAC enforcement

The system MUST derive catalog permissions from the session capability contract so permitted users can create or edit while delete remains available only when the delete-item capability is present for the active company.
(Previously: Permissions were derived directly from owner vs non-owner role checks.)

#### Scenario: Session with save capability can edit
- GIVEN an authenticated session with catalog save capability
- WHEN the user opens create or edit actions
- THEN save actions SHALL be available

#### Scenario: Session lacks delete capability
- GIVEN an authenticated session without delete-item capability
- WHEN delete permissions are evaluated
- THEN delete MUST remain unavailable
