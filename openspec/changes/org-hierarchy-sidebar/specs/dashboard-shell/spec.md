# Capability: dashboard-shell (delta)

Updates the dashboard sidebar and routing to reflect working modules and hierarchy management.

## MODIFIED Requirements

### Requirement: Workspace sidebar items

- The workspaceItems array MUST contain exactly 3 items: Inicio, Items, Categorías.
- The following 5 placeholder items MUST be removed: Sales, Compras, Produccion, Finanzas, Proyectos.
- Inicio routes to /dashboard (end: true).
- Items routes to /dashboard/items.
- Categorías routes to /dashboard/categories.
- The isHashLink function MAY be removed if no hash-link items remain.

## ADDED Requirements

### Requirement: Hierarchy management routes

- Route /dashboard/divisions MUST be added for division management.
- Route /dashboard/locals MUST be added for local management.
- These routes MUST be accessible to company-owner only.

### Requirement: Active local switcher in sidebar

- An active local switcher MUST be present in the sidebar or header.
- The switcher MUST show "Company level" when no local is active.
- The switcher MUST show the local name when a local is active.
- The switcher MUST list locals from the active company.

## Scenarios

### Scenario: Sidebar shows only working modules

- **Given** the dashboard sidebar is rendered
- **When** any authenticated user views it
- **Then** the Workspace group contains exactly: Inicio, Items, Categorías
- **And** no hash-link placeholder items are present

### Scenario: Company-owner can access division management

- **Given** a company-owner is authenticated
- **When** they navigate to /dashboard/divisions
- **Then** the division management page is displayed