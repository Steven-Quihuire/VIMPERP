# item-catalog-web Specification

## Purpose

Desktop catalog UI for the session company. USD only.

## Requirements

### Requirement: Item list view
The system MUST show active session-company items from `GET /items` in a table with name, sku, type, unit, USD price, and stock status.

#### Scenario: List active items
- GIVEN active and deleted items exist
- WHEN `/dashboard/items` opens
- THEN only active session-company rows appear

#### Scenario: List request fails
- GIVEN the list request fails
- WHEN the catalog loads
- THEN the user sees a recoverable error state

### Requirement: Item creation
The system MUST let owners and users open a blank form from **Add Product**, create through `POST /items`, stay on the catalog view, and confirm success.

#### Scenario: Create item in place
- GIVEN the catalog is open
- WHEN the user saves valid item data
- THEN the item is created and the table refreshes

#### Scenario: Open blank draft
- GIVEN an item is currently selected
- WHEN the user chooses **Add Product**
- THEN the right panel shows a blank create form

### Requirement: Item editing
The system MUST load the chosen row into the right-panel form, update through `PATCH /items/:id`, and keep item type immutable during edit.

#### Scenario: Edit selected item
- GIVEN an item row is selected
- WHEN the user saves valid changes
- THEN the item updates and the table refreshes

#### Scenario: Immutable type on edit
- GIVEN an existing item is open
- WHEN the edit form is shown
- THEN the type control is visible but disabled

### Requirement: Item soft-delete
The system MUST show soft-delete only to `company-owner`, require confirmation, and delete through `DELETE /items/:id`.

#### Scenario: Owner confirms delete
- GIVEN an owner is editing an item
- WHEN the owner confirms delete
- THEN the item is removed from default lists

#### Scenario: User cannot delete
- GIVEN a non-owner is editing an item
- WHEN the form actions render
- THEN no delete action is shown

### Requirement: Category management
The system MUST provide `/dashboard/categories` with a tree and create or update categories through the category API.

#### Scenario: Create or reparent category
- GIVEN the categories route is open
- WHEN the user saves valid name and parent values
- THEN the tree reflects the saved hierarchy

#### Scenario: API rejects a cycle
- GIVEN a category is moved under itself or a descendant
- WHEN the API returns `409`
- THEN the UI shows a user-friendly error

### Requirement: Form validation
The system MUST block empty name, negative price, and invalid unit input, MUST omit immutable type from edit submissions, and MUST NOT expose currency input.

#### Scenario: Valid form submits
- GIVEN the form data is valid
- WHEN the user submits
- THEN only allowed item fields are sent

#### Scenario: Invalid form is blocked
- GIVEN name, price, or unit is invalid
- WHEN the user submits
- THEN no save request is sent

### Requirement: RBAC enforcement
The system MUST derive permissions from the session so both roles can create or edit while only owners can delete.

#### Scenario: User can create and edit
- GIVEN a company user is authenticated
- WHEN the user opens create or edit actions
- THEN save actions are available

#### Scenario: Session lacks owner role
- GIVEN an authenticated non-owner session
- WHEN delete permissions are evaluated
- THEN delete remains unavailable

### Requirement: Loading and error states
The system MUST show loading feedback and MUST show an error notification when an API call fails.

#### Scenario: Initial loading
- GIVEN item data is still loading
- WHEN the catalog view renders
- THEN loading placeholders are shown

#### Scenario: Submit fails
- GIVEN the user saves a form
- WHEN the API rejects the request
- THEN the save action shows failure feedback

### Requirement: USD-only pricing
The system MUST present item prices as USD with a `$` prefix and MUST NOT offer currency selection anywhere in the catalog UI.

#### Scenario: Display USD price
- GIVEN an item has a stored price
- WHEN the item is shown in list or form
- THEN the amount is presented with `$`

#### Scenario: Currency choice is unavailable
- GIVEN a user opens create or edit
- WHEN price fields are reviewed
- THEN no currency selector or override exists
