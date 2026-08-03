# Capability: item-catalog-web (delta)

Extends the web catalog UI to respect local-scoped catalog.

## ADDED Requirements

### Requirement: Web auth domain mirroring

- The web AuthMembership type MUST include nullable divisionId and localId.
- The web AuthSession type MUST include nullable activeLocalId.
- These fields MUST mirror the API authSessionSchema field shapes.

### Requirement: Items page filters by active local

- The items page MUST filter items by the active local from the session.
- When activeLocalId is null, the items page MUST show company-wide items only.
- When activeLocalId is set, the items page MUST show that local's items only.

### Requirement: Categories page filters by active local

- The categories page MUST filter categories by the active local from the session.
- When activeLocalId is null, the categories page MUST show company-wide categories only.
- When activeLocalId is set, the categories page MUST show that local's categories only.

### Requirement: Local scope indicator

- Items with localId null MUST display a "Company-wide" indicator.
- Items with localId set MUST display the local name.
- Categories with localId null MUST display a "Company-wide" indicator.
- Categories with localId set MUST display the local name.

### Requirement: Active local switcher UI

- An active local switcher MUST be available in the sidebar or dashboard header.
- The switcher MUST show "Company level" when no local is active.
- The switcher MUST show the local name when a local is active.
- The switcher MUST call POST /auth/me/active-local on selection.