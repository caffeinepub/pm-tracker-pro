# Plant Maintenance Management System

## Current State

- KaizenPage.tsx: Kaizen submission form with title, category, machine/area, before/after photos, problem/improvement description. Status is 'Open' or 'Closed'. No spares used field. No admin approval workflow — only admin can 'Close'. PDF slip shows data but no embedded photos. Print uses window.print().
- BDTargets interface already has section keys (Powder Coating, Machine Shop, Utility, Overall). AnalysisPage already reads `bdTargets[section]` for graph dashed lines, but there is NO UI in the section tabs for admin to enter/save section-level targets. Only 'Overall Plant' has a target entry form.
- OperatorLogbookPage.tsx: Has checksheet with admin-defined items + general remarks field. No separate free-form activity log section where operator can write what other work they did that day.

## Requested Changes (Diff)

### Add
- **Kaizen: Spares Used section** in the submission form. A dynamic table where operator can add rows: Spare Name, Part No., Quantity, Unit. Add/remove row buttons.
- **Kaizen: Approval workflow** — on submission, status becomes 'Pending Approval'. Admin sees kaizen records in full, can approve (status → 'Approved'), reject (status → 'Rejected'), or close (status → 'Closed'). Add approval action buttons in admin view. Operator can see their own submissions with status badges.
- **Kaizen: Proper PDF slip** — printable slip with all fields: ID, title, category, machine/area, date, submitted by, status, problem description, improvement description, spares used table, before photo (embedded as image), after photo (embedded as image). Use a print-specific CSS class or hidden print div that formats nicely like a formal document.
- **Analysis: Section KPI Targets** — in each section tab (Powder Coating, Machine Shop, Utility), add an admin-only 'KPI Targets' input card identical to the Overall Plant targets card: 4 inputs (BD%, MTTR, MTBF, Uptime%) with Save button. Uses `updateBDTargets` with the section key. The `bdTargets[section]` is already wired to the graphs, just needs the entry UI.
- **Operator Logbook: Free-form Activity Log section** — below the checksheet items in the daily entry form, add a new 'Other Work Activities' section where operator can add multiple free-form rows: Activity Description (text), Time Spent (number, hrs), Status (dropdown: Completed/In Progress/Pending), Remarks (text). These are saved as part of the LogbookEntry. Show them in the view-entry dialog and Excel export.

### Modify
- **KaizenRecord interface** in AppContext.tsx: Add `status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed'` (replace old 'Open'|'Closed'). Add `spares?: Array<{name: string; partNo: string; qty: string; unit: string}>`. Add `approvedAt?: number`, `rejectedAt?: number`, `rejectionReason?: string`.
- **LogbookEntry interface** in AppContext.tsx: Add `activities?: Array<{description: string; timeSpent: string; status: string; remarks: string}>`.
- **KaizenPage.tsx**: Rework submission status from 'Open' to 'Pending Approval'. Add spares table UI in the form. Add admin approval/reject/close actions in the records table. Fix PDF slip to include photos as `<img>` in a print-styled hidden div. Add admin edit capability (open the form dialog pre-filled with a record's data, allow saving edits).
- **OperatorLogbookPage.tsx**: Add activities state in entry form, save to LogbookEntry, show in view dialog, include in export.

### Remove
- Nothing removed.

## Implementation Plan

1. **AppContext.tsx**:
   - Update `KaizenRecord.status` type to `'Pending Approval' | 'Approved' | 'Rejected' | 'Closed'`.
   - Add `spares?: Array<{name: string; partNo: string; qty: string; unit: string}>` to KaizenRecord.
   - Add `approvedAt?: number; rejectedAt?: number; rejectionReason?: string` to KaizenRecord.
   - Add `activities?: Array<{description: string; timeSpent: string; status: string; remarks: string}>` to LogbookEntry.
   - Update DEFAULT_BD_TARGETS to include reasonable defaults for all sections if not already.

2. **KaizenPage.tsx**:
   - Add spares state array (rows) in form state. UI: a table with Add Row / Remove Row buttons.
   - Change initial status on submit to 'Pending Approval'.
   - Admin sees all records. Add Approve button (status → 'Approved'), Reject button (status → 'Rejected', prompt for reason), Close button (status → 'Closed').
   - Admin edit: clicking a record row (or an Edit button) opens the form pre-filled, saving updates the record.
   - PDF slip: add a hidden `#kaizen-print-slip` div styled for print. Include all form data, spares table, and both photos embedded as `<img>` tags. On Print Slip click, populate this div with selected kaizen data and call `window.print()`. Add `@media print { body { display: none } #kaizen-print-slip { display: block } }` via inline style tag or existing CSS.

3. **AnalysisPage.tsx**:
   - In the SECTIONS.map loop for each section tab, add a 'KPI Targets' card immediately after the 'Working Hours' card. Admin-only. 4 inputs: BD%, MTTR, MTBF, Uptime%. Save button calls `updateBDTargets({ [section]: { bdPct, mttr, mtbf, uptime } })`. Pre-populated from `bdTargets[section]`. Identical structure to the Overall Plant targets card.

4. **OperatorLogbookPage.tsx**:
   - Add `activities` state array `Array<{description: string; timeSpent: string; status: string; remarks: string}>` to the entry form.
   - UI section below checksheet: 'Other Work Activities' with Add Row / Remove Row buttons and inline inputs per row.
   - On submit, save `activities` to the LogbookEntry.
   - In view-entry dialog, show activities table.
   - In export, add activities as separate rows or columns.
