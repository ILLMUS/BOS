# Advanced two-level Business OS sidebar

## Goal
Replace the current single navigation panel with the requested connected two-sidebar system, ordered from customer acquisition through delivery, finance, client success, management, and administration.

## What will change
- Reorganize the existing `NAV_SECTIONS` into clear Business OS stages while preserving every current destination and permission rule.
- Rebuild `AppSidebar` as one responsive navigation system:
  - Sidebar 1 reserves 72px on desktop and visually expands to 256px on hover.
  - Sidebar 2 reserves 270px only while a primary section is selected.
  - Sidebar 1’s expanded portion overlays Sidebar 2 and never changes the reserved width.
  - Below `xl`, both panels become a 342px overlay drawer with a dismissible backdrop.
- Add section icons, descriptions, active markers, accessible controls, profile details, and existing live counts.
- Update `AppLayout` so the sidebar’s outer container alone controls desktop space beside the page; no page-specific margins or padding will be added.
- Keep Home outside the authenticated shell and unchanged.

## Navigation behavior
- The current route selects its matching primary section initially.
- Clicking a primary section toggles Sidebar 2 without navigating.
- Clicking a secondary item navigates normally; on mobile/tablet it also closes the drawer.
- Exact and nested route matching will honor each item’s existing `end` setting.
- Empty or unauthorized sections remain hidden through `isAdmin`, `authority`, and `canAccessPath`.

## Technical details
- Keep `NAV_SECTIONS`, existing router paths, existing auth context, and the current backend client.
- Load jobs, approvals, assignments, and overdue counts once in a guarded effect; failures fall back to zero.
- Use existing semantic sidebar tokens and Lucide icons; add only minimal token styling if required.
- Remove the obsolete manual collapse control because desktop Sidebar 1 is always 72px reserved and hover-expanded by design.
- Verify type safety, preview build health, keyboard states, desktop overlay geometry, and mobile drawer behavior.
