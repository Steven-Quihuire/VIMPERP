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

The system SHALL associate each created company with a company owner, MAY allow an authenticated user to create an additional company, and MUST bind the newly created company as the active company for the resulting session. The system MAY structurally capture locales or branches without requiring detailed operational behavior in this slice.
(Previously: Onboarding only established one owner-company association and deferred locale detail.)

#### Scenario: Company owner is established
- GIVEN a successful company registration
- WHEN onboarding completes
- THEN the registrant SHALL become the company owner for that tenant

#### Scenario: Additional company becomes active
- GIVEN an authenticated user allowed to create another company
- WHEN the new company creation completes
- THEN the new company MUST become the active company context

#### Scenario: Locales are optional structural data
- GIVEN a company without detailed locale setup
- WHEN onboarding completes
- THEN the company MUST remain valid with locale detail deferred

### Requirement: Idempotent Company Creation

The system MUST accept a client idempotency key for company creation, SHALL replay the original terminal outcome for the same key and equivalent payload, and MUST reject the same key with a different payload.

#### Scenario: Equivalent retry replays result
- GIVEN a completed create-company request with an idempotency key
- WHEN the same caller retries with the same key and payload
- THEN the system SHALL return the original outcome

#### Scenario: Key reuse with different payload conflicts
- GIVEN a prior create-company request with an idempotency key
- WHEN the same key is sent with different company data
- THEN the system MUST reject the request as a conflict
