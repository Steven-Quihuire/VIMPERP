# Delta for identity-access

## ADDED Requirements

### Requirement: Super Admin-Only Observability Access

The system MUST restrict observability APIs and observability dashboard screens to `platform-admin` users and MUST deny company-scoped roles.

#### Scenario: Platform admin requests observability resources
- GIVEN an authenticated `platform-admin`
- WHEN the user requests an observability API or screen
- THEN the system SHALL grant access

#### Scenario: Company-scoped user requests observability resources
- GIVEN an authenticated user without the `platform-admin` role
- WHEN the user requests an observability API or screen
- THEN the system MUST deny access
