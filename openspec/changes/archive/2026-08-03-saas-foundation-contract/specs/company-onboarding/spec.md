# Delta for company-onboarding

## ADDED Requirements

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

## MODIFIED Requirements

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
