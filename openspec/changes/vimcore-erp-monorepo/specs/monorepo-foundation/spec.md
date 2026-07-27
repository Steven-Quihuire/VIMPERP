# monorepo-foundation Specification

## Purpose

Define the baseline monorepo, quality gates, and security controls for the first `vimcore/erp` slice.

## Requirements

### Requirement: Workspace Delivery Baseline

The system MUST provide a single monorepo baseline for the web app, API, shared packages, PostgreSQL runtime, and repeatable build/test commands.

#### Scenario: Baseline workspace is verifiable
- GIVEN a fresh contributor environment
- WHEN the documented install, lint, typecheck, test, and build flows are run
- THEN the workspace SHALL validate both apps and shared packages together

#### Scenario: Missing package conformance blocks delivery
- GIVEN a package outside the workspace conventions
- WHEN quality gates execute
- THEN delivery MUST fail before feature release

### Requirement: Quality and Security Gates

The system MUST gate delivery with automated backend tests, frontend Playwright E2E for critical desktop flows, and backend-focused security checks. Backend critical-path coverage SHALL be at least 80% for auth, onboarding, and dashboard APIs.

#### Scenario: Healthy change passes gates
- GIVEN a compliant change
- WHEN CI runs
- THEN tests, coverage, and security checks SHALL pass before delivery

#### Scenario: Security or coverage regression is detected
- GIVEN a backend vulnerability or coverage below threshold
- WHEN CI runs
- THEN delivery MUST be rejected
