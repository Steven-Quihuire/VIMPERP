# SDD Workflow

OpenSpec is the repository source of truth for feature planning. Engram may preserve session context, but implementation decisions and completion status belong in `openspec/`.

## Start A Feature

1. Create one short kebab-case change name under `openspec/changes/`.
2. Explore the current code and identify the smallest useful vertical slice.
3. Write `proposal.md` with intent, scope, out-of-scope work, risks, rollback, and success criteria.
4. Write delta specs using `ADDED`, `MODIFIED`, `REMOVED`, or `RENAMED` requirements and Given/When/Then scenarios.
5. Write `design.md` for boundaries, affected files, decisions, and test strategy.
6. Write `tasks.md` with numbered tasks that fit one reviewable slice.

## Apply And Close

- Every implementation task starts with a failing or missing-behavior test when strict TDD applies.
- `sdd-apply` marks completed tasks in `tasks.md`; chat notes do not count as completion evidence.
- Run `pnpm test`, `pnpm build`, and the relevant coverage command before verification.
- `sdd-verify` is blocked while any implementation task remains unchecked.
- `sdd-archive` merges delta specs into `openspec/specs/` and moves the complete change to `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.

## Rules That Prevent Drift

- Do not reuse an old active change for a new feature. Create a follow-up change and link the dependency in its proposal.
- Do not mark deferred, unimplemented, or manually unverified work as complete.
- Keep migrations, backend behavior, and web UI in separate slices when their review boundaries differ.
- Check the state before continuing with `gentle-ai sdd-status {change-name}`.
- Keep the worktree clean or explicitly document unrelated user changes before applying a feature.

## Current Repository State

Existing historical changes under `openspec/changes/` are intentionally preserved. New work must use a new change directory and must not modify archived or historical artifacts unless the task is explicitly an archive/spec synchronization operation.


$ docker exec vimcore-postgres-1 psql -U postgres -d vimcore -c "SELECT id, full_name, document_number, document_type, email, company_id, employment_status FROM employees WHERE full_name ILIKE '%Steven%' OR document_number = '2350481194';" 2>&1 | head -30

