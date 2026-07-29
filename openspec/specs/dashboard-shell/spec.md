# dashboard-shell Specification

## Purpose

Define the initial authenticated ERP shell and operational visibility for platform administrators.

## Requirements

### Requirement: Authenticated ERP Shell

The system MUST present an authenticated desktop dashboard shell with ERP navigation placeholders and summary cards for the first slice.

#### Scenario: Authenticated user reaches the shell
- GIVEN an authenticated authorized user
- WHEN the user enters the dashboard
- THEN the system SHALL show the shell and first-slice summary cards

#### Scenario: Unauthorized user cannot reach the shell
- GIVEN a user without valid access
- WHEN the dashboard is requested
- THEN the system MUST deny dashboard rendering

### Requirement: Admin Operational Signals

The system MUST provide platform-admin visibility into new company registrations, operational notifications, and system error or metric signals relevant to this slice.

#### Scenario: New company registration is surfaced to admin
- GIVEN a company has completed onboarding
- WHEN a platform admin opens the dashboard
- THEN the system SHALL show a new-company notification or summary signal

#### Scenario: Operational fault is observable
- GIVEN an admin-relevant failure occurs in auth, onboarding, or dashboard operations
- WHEN the event is recorded
- THEN the system MUST expose an operational signal for administrators

### Requirement: Super Admin Observability Workspace

The system MUST provide `platform-admin` users with dashboard screens for provisioning runs, sanitized application errors, and audit events.

#### Scenario: Super Admin opens observability views
- GIVEN an authenticated `platform-admin`
- WHEN the user opens the observability area
- THEN the system SHALL show the available list views and drill-down details

#### Scenario: Observability view has no matching records
- GIVEN an authenticated `platform-admin`
- WHEN applied filters return no matches
- THEN the system SHALL show an empty state
- AND the system MUST NOT offer retry or delete actions in the MVP
