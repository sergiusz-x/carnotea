---
id: T-076
status: in_progress
owner: antigravity
created: 2026-07-21T17:41:00Z
updated_at: 2026-07-21
---

# T-076: EV vs ICE Conditional Display Fixes

## Context

The application currently exhibits bugs where fields meant for internal combustion engine (ICE) vehicles (like fuel consumption) are shown for electric vehicles (EV), and vice-versa (EV charging states shown for ICE cars).

## Acceptance Criteria

- [ ] UI components displaying vehicle stats (e.g., Dashboard, Vehicle Panel, Quick Add) conditionally render based on the vehicle's powertrain type (EV vs ICE).
- [ ] Average fuel consumption is hidden for EVs.
- [ ] Battery charge/charging sessions are hidden for ICE vehicles.
- [ ] All forms accurately reflect the correct fields based on vehicle type.

## Implementation details

- Audit all features in `apps/web/src/features/` and `apps/web/src/components/`.
- Rely on the vehicle's `type` or `powertrain` field from the API.
- Use conditional rendering in React components to omit irrelevant data.
