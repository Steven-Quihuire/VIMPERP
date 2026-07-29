# Delta for company-onboarding

## MODIFIED Requirements

### Requirement: Multi-Step Registration and Company Capture

The system MUST support a multi-screen onboarding flow that captures user account data and company data: general information, legal/tax identifier, services, address, and contact details. It MUST create business records atomically within one onboarding transaction and MUST keep correlated provisioning evidence durable outside that transaction.

(Previously: onboarding required complete company capture and account/company creation, but did not require durable provisioning evidence alongside atomic business creation.)

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
