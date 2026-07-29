# company-onboarding Specification

## Purpose

Define multi-step registration and company setup for a new ERP tenant.

## Requirements

### Requirement: Multi-Step Registration and Company Capture

The system MUST support a multi-screen onboarding flow that captures user account data and company data: general information, legal/tax identifier, services, address, and contact details. It MUST create business records atomically within one onboarding transaction and MUST keep correlated provisioning evidence durable outside that transaction.

#### Scenario: Required company data is completed
- GIVEN a new registrant
- WHEN the registrant completes all required onboarding steps
- THEN the system SHALL create the account and company record atomically
- AND the correlated provisioning run SHALL be marked succeeded

#### Scenario: Missing required onboarding data blocks completion
- GIVEN an onboarding flow with missing required company data
- WHEN the registrant attempts to continue or finish
- THEN the system MUST prevent completion and identify the missing step

#### Scenario: Business creation fails after onboarding submission
- GIVEN a valid onboarding submission
- WHEN atomic company creation fails
- THEN the system MUST roll back partial business records
- AND the correlated provisioning evidence MUST remain inspectable

### Requirement: Tenant Structure and Ownership

The system SHALL associate the created company with a company owner, and MAY structurally capture locales or branches without requiring detailed operational behavior in this slice.

#### Scenario: Company owner is established
- GIVEN a successful company registration
- WHEN onboarding completes
- THEN the registrant SHALL become the company owner for that tenant

#### Scenario: Locales are optional structural data
- GIVEN a company without detailed locale setup
- WHEN onboarding completes
- THEN the company MUST remain valid with locale detail deferred
