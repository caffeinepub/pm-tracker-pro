# Plant Maintenance Management System

## Current State
Dashboard has 4 sections (PM, Breakdown Analysis, Planner, Quick Actions). Two navigation bars are visible simultaneously — the new PMMS top nav and an older PM Tracker nav. Logbook entry lacks a spares-used field. Approval alerts are scattered. No monthly KPI PDF generation exists.

## Requested Changes (Diff)

### Add
- Spares used section (part name, qty, cost rows) in the Operator Logbook entry form, consistent with how it works in PM/Breakdown/Predictive forms
- Consolidated "Pending Approvals" card on dashboard (admin only) showing all pending approvals in one place: PM checklists, Breakdown slips, Kaizen submissions, Task status changes — with counts and action links
- "Generate Monthly KPI Report" button on dashboard (admin only): opens a month-picker dialog, then generates a multi-page PDF covering:
  - PM Summary (planned vs actual, completion %)
  - Breakdown Summary (BD%, MTTR, MTBF, Uptime per section)
  - Predictive Maintenance summary
  - Task/Planner summary
  - Unplanned Maintenance %
  - Kaizen count and status summary
  - Stock of Spares (critical spare list snapshot)
  - Maintenance Cost (daily cost bar chart for selected month)
  - Electricity Consumption analysis
  - Yearly trend graphs (BD%, MTTR, MTBF, Uptime)
  - All section KPI cards with targets

### Modify
- Remove the old "PM Tracker" navigation bar — only the PMMS top nav should be visible
- Spares used data from logbook entries included in material issue slip and maintenance cost calculations

### Remove
- The duplicate PM Tracker nav bar component (the older secondary navigation)

## Implementation Plan
1. Find and remove the old PM Tracker nav bar component so only the PMMS top nav renders
2. Add spares-used rows to the logbook entry form (same pattern as breakdown slip spare entry)
3. Aggregate logbook spares into the material issue slip and cost analytics
4. Create a consolidated PendingApprovalsCard on dashboard visible to admin only, aggregating PM, Breakdown, Kaizen, and Task approval counts with links
5. Add "Generate Monthly KPI" button on dashboard (admin only) with month picker dialog
6. Implement PDF generation using window.print() with a dedicated print-only KPI report layout, covering all sections listed by user
