# Archive Report: node-management-invitations

Change: `node-management-invitations`
Archived: 2026-08-13
Status: **Archived — PASS with follow-ups**

## Goal

Add end-to-end node responsibility management for the organizational hierarchy: invite a responsible by email for a scoped node, activate access through a secure invitation flow, materialize one active responsible per node, and make scoped permissions effective in runtime auth while keeping the existing company-owner and company-user behavior intact.

## What Was Implemented

### 1. Backend foundation
- Added `node-management` backend slice under `apps/api/src/features/node-management/`.
- Added `node_responsibilities` schema support and the invitation persistence flow.
- Added migration `0021_node_management_invitations.sql` with targeted migration coverage.

### 2. Invitation and activation flow
- Added admin endpoint to create invitations by `companyId + scopeType + scopeId + inviteeEmail`.
- Added public endpoint to inspect invitation metadata by token.
- Added public endpoint to accept invitations.
- Acceptance flow now:
  - validates token existence, status, and expiry,
  - creates a user when needed,
  - collects a password only for new accounts,
  - ensures base membership `company-user`,
  - creates a session cookie on success.

### 3. Active responsibility model
- Accepting an invitation now materializes the node responsibility.
- V1 rule enforced: one active responsible per node.
- Replacing the responsible deactivates the previous active record and removes the equivalent scoped assignment for that same node scope.
- Added backend read endpoints for:
  - listing company responsibilities,
  - getting one node's responsibility state,
  - listing pending invitations.

### 4. Scoped runtime authorization
- `resolve-auth-session` now merges:
  - membership-derived capabilities,
  - scoped effective permissions for `activeCompany + activeScope`.
- This made scoped `node-manager` assignments effective without changing the public `AuthSession` shape.
- `org-tree` now authorizes through effective scoped capability checks instead of raw membership-role checks.
- Existing `company-owner` and `company-user` semantics were preserved.

### 5. Frontend read surfaces
- Added `apps/web/src/features/node-management/` with domain, API, queries, and presentation helpers.
- `organization-page.tsx` now shows read-only node responsibility state per node:
  - no responsible,
  - pending invitation,
  - active responsible.

### 6. Frontend write flow and acceptance UI
- Added an admin invite panel inside the organization screen.
- Added public route `/accept-invitation/:token`.
- The accept page shows:
  - company and node context,
  - whether password setup is required,
  - successful login + redirect into the app.

## Test Results

- Focused backend tests passed for:
  - invitation creation,
  - invitation acceptance,
  - responsibility state,
  - auth session resolution,
  - org-tree scoped access,
  - item route scoped capability behavior.
- Focused frontend tests passed for:
  - node-management API/query layer,
  - responsibility badge helper,
  - organization page read/write integration,
  - acceptance page,
  - app public routing for invitation acceptance.

## Follow-ups

### Follow-up 1: Delivery UX
- Current V1 admin flow shows the generated invitation link in-app.
- This is robust for testing and manual delivery, but a follow-up should integrate first-class delivery UX (copy/share/email-sent confirmation path).

### Follow-up 2: Role assignment provenance
- Replacing a responsible currently removes the equivalent scoped assignment for the prior responsible in the same scope.
- If future versions allow multiple assignment sources per user/scope, assignment provenance should be modeled explicitly before expanding this behavior.

### Follow-up 3: Broader scoped authorization audit
- `org-tree` and capability resolution now honor scoped access.
- Additional backend routes should be audited later to confirm they rely on effective scoped permissions where appropriate, not only classic membership checks.

## Final State

- End-to-end V1 exists for node responsibility invitations and activation.
- One active responsible per node is enforced.
- Scoped `node-manager` access is effective in runtime session capability resolution.
- Frontend admin and public acceptance flows are in place.
- The change is ready to close formally with follow-up UX and authorization audit work tracked separately.
