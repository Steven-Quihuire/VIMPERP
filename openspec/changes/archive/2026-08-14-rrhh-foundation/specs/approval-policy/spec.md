# approval-policy Specification

## Purpose

Define the base ApprovalPolicy model and scope boundaries for future approval-driven HR processes.

## Requirements

### Requirement: Approval policy scope boundary

The system MUST support ApprovalPolicy records at company level and organization-node level. ApprovalPolicy scope MUST NOT use employee, direct-report, or self reporting-line scopes.

#### Scenario: Company-level policy is stored
- GIVEN a company defines a company-wide approval policy
- WHEN the policy is created
- THEN the system SHALL persist it at company scope

#### Scenario: Node-level policy is stored without reporting-line scope
- GIVEN a company defines a policy for one organization node
- WHEN the policy is created
- THEN the system MUST persist it at that node scope and not as `direct_reports` or `self`

### Requirement: Foundation-only lifecycle

The system MUST support base ApprovalPolicy creation, reading, updating, and deactivation as groundwork only, and MUST NOT require approval request execution workflows in this slice.

#### Scenario: Base policy CRUD succeeds
- GIVEN an authorized actor manages approval policy setup
- WHEN the actor creates or updates a policy definition
- THEN the system SHALL persist the policy definition

#### Scenario: Workflow execution is out of scope
- GIVEN an approval policy exists
- WHEN no approval request workflow has been implemented yet
- THEN the system MUST still treat the policy as configuration groundwork only
