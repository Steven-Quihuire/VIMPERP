# company-lifecycle Specification

## Purpose

Define minimal company lifecycle states and support-safe blocked access behavior.

## Requirements

### Requirement: Lifecycle State Contract

The system MUST represent at least `active`, `suspended`, and `provisioning_failed` company lifecycle states and SHALL treat only `active` companies as normally operable.

#### Scenario: Active company stays operable
- GIVEN a company in `active`
- WHEN an authorized member enters tenant-scoped work
- THEN the system SHALL allow normal access

#### Scenario: Non-active company is blocked
- GIVEN a company in `suspended` or `provisioning_failed`
- WHEN an authorized member enters tenant-scoped work
- THEN the system MUST block normal tenant operations

### Requirement: Support-Safe Blocked Experience

The system MUST show a generic support/contact experience for blocked lifecycle states and MUST NOT expose internal failure details to regular company users.

#### Scenario: Suspended company sees support-safe message
- GIVEN a member of a suspended company
- WHEN the member opens a blocked tenant-scoped screen
- THEN the system SHALL show generic support guidance

#### Scenario: Provisioning failure hides internal details
- GIVEN a member of a provisioning-failed company
- WHEN the member opens a blocked tenant-scoped screen
- THEN the system MUST hide internal diagnostics from that member
