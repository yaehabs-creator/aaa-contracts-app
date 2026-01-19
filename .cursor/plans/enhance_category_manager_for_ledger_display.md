# Enhance Category Manager for Clause Ledger Display

## Overview
Enhance the Category Manager to allow users to create custom categories with selected clauses, and display these categories in the Clause Ledger sidebar with grouped organization.

## Requirements

### User Needs
1. **Custom Category Names**: User can type any category name they want
2. **Multi-Select Clauses**: User can select multiple clauses to add to a category at once
3. **Category Grouping in Ledger**: Clauses appear grouped by category in the Clause Ledger sidebar
4. **Visual Organization**: Categories are clearly separated and labeled in the ledger

## Implementation Plan

### 1. Enhance Category Manager UI
- **Multi-Select Modal**: Create a modal that allows:
  - Entering custom category name
  - Selecting multiple clauses via checkboxes
  - Adding all selected clauses to the category at once
- **Quick Add**: Allow adding multiple clauses to existing categories

### 2. Modify Clause Ledger Display
- **Grouped View**: Display clauses grouped by category in the Clause Ledger
- **Category Headers**: Show category names as section headers
- **Unassigned Section**: Show clauses without categories in a separate section
- **Toggle Option**: Add toggle to switch between grouped view and flat list view

### 3. Visual Enhancements
- **Category Headers**: Styled headers for each category section
- **Indentation**: Indent clauses under their category headers
- **Collapsible Sections**: Option to collapse/expand category sections
- **Category Badge**: Show category name badge on clauses

## Files to Modify

1. **components/CategoryManager.tsx**
   - Add multi-select modal for creating categories with multiple clauses
   - Add "Add Multiple Clauses" button
   - Enhance UI for bulk operations

2. **components/Sidebar.tsx**
   - Modify Clause Ledger section to group by category
   - Add toggle for grouped/flat view
   - Add category headers and styling
   - Handle unassigned clauses section

3. **services/categoryManagerService.ts** (if needed)
   - Add method to add multiple clauses to category at once

## Key Features

- **Custom Category Creation**: User types category name, selects clauses, creates category
- **Bulk Assignment**: Select multiple clauses and assign to category in one action
- **Grouped Ledger Display**: Clauses organized under category headers
- **Easy Organization**: Visual grouping makes it easy to see which clauses belong to which category
- **Flexible**: Can still use existing single-clause assignment method

## User Flow

1. User clicks "Create Category" or "Add Clauses to Category"
2. Modal opens with:
   - Text input for category name
   - List of all clauses with checkboxes
   - "Add Selected" button
3. User selects clauses and creates/updates category
4. Clause Ledger automatically updates to show grouped view
5. Clauses appear under their category headers in the ledger
