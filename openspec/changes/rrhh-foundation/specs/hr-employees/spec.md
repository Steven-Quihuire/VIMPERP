# hr-employees Specification

## Purpose

Define the employee master, position hierarchy, assignment history, reporting line, and additive RRHH foundation baseline.

## Requirements

### Requirement: Employee master identity

The system MUST manage an employee record independently from any ERP user account.

#### Scenario: Employee exists without ERP access
- GIVEN a company creates an employee record
- WHEN no ERP invitation or user link exists
- THEN the system SHALL keep the employee active as a valid employee record

#### Scenario: ERP access changes do not redefine the employee
- GIVEN an employee already exists
- WHEN ERP access is revoked or missing
- THEN the system MUST preserve the employee record and history

### Requirement: Position hierarchy and staffing

The system MUST support positions with `reports_to_position_id`, MAY allow `null` for the top position, and MUST support headcount and vacancy tracking per position.

#### Scenario: Top-of-hierarchy position is allowed
- GIVEN a company defines its highest position
- WHEN the position has no parent position
- THEN the system SHALL treat it as a top-of-hierarchy position

#### Scenario: Vacancy count uses active staffing
- GIVEN a position has defined headcount and active primary assignments
- WHEN staffing is reviewed
- THEN the system SHALL expose occupied headcount and remaining vacancies

### Requirement: Assignment history and reporting line

The system MUST keep assignment history, MUST allow at most one active primary assignment per employee, and MUST auto-close the previous active primary assignment when a new primary assignment starts. Direct manager resolution SHALL derive from the active primary assignment's position lineage, not from org-node responsibility.

#### Scenario: New primary assignment closes the prior one
- GIVEN an employee has an active primary assignment
- WHEN a newer primary assignment becomes active
- THEN the system SHALL close the prior active primary assignment automatically

#### Scenario: Direct manager stays separate from node responsibility
- GIVEN an organization node has a responsible user and the employee's parent position is vacant
- WHEN the employee reporting line is resolved
- THEN the system MUST NOT treat the node responsible user as the employee's direct manager

### Requirement: Additive RRHH baseline

The system MUST establish the RRHH employee, position, assignment, and ERP-access foundation additively from the repository's real migration baseline, and PR-1 MUST NOT depend on legacy employee rows that do not exist through `0021`.

#### Scenario: RRHH foundation starts from the live baseline
- GIVEN migrations have been applied through `0021`
- WHEN RRHH foundation migration runs
- THEN the system SHALL create the new RRHH employee model directly without requiring legacy employee backfill data
