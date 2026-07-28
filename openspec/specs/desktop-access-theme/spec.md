# desktop-access-theme Specification

## Purpose

Define device access policy and palette-based theming for the first slice.

## Requirements

### Requirement: Desktop-Only Access Enforcement

The system MUST allow the product only on desktop-class browsers and MUST show a blocking guidance page to mobile or tablet users.

#### Scenario: Desktop user can continue
- GIVEN a desktop-class browser
- WHEN the product is accessed
- THEN the system SHALL allow normal product entry

#### Scenario: Mobile or tablet user is blocked
- GIVEN a mobile or tablet browser
- WHEN the product is accessed
- THEN the system MUST show a blocking page instructing desktop browser usage

### Requirement: Palette Selection

The system MUST offer one default palette plus four selectable palettes during registration or after dashboard entry, and MUST NOT expose a dark/light toggle unless required by the chosen palette.

#### Scenario: User selects a supported palette
- GIVEN a user in onboarding or dashboard preferences
- WHEN the user selects an available palette
- THEN the system SHALL apply and persist that palette choice

#### Scenario: Unsupported theme controls remain unavailable
- GIVEN a palette that does not require dark/light mode
- WHEN the user reviews theme controls
- THEN the system MUST NOT show a dark/light toggle
