# Plant Maintenance Management System

## Current State
All modules (Predictive, PM, Breakdown, Kaizen, Task, Electricity, Logbook, Spares, CAPA) are functional. Data is stored in localStorage via AppContext. Demo data exists only for PM module (machines, plans, checklist templates, 1 PM record).

## Requested Changes (Diff)

### Add
- Block operator re-submission on predictive maintenance records once a reading is submitted for a given schedule+period. Show 'Already Submitted' indicator and disable the submit button for operators.
- Admin can edit predictive records after submission (edit mode in the records table).
- 5 sample entries in EVERY module: machines, PM plans, PM records, breakdown records, CAPA records, history cards, predictive plans, predictive records, kaizen records, task records, electricity meters + readings, logbook entries, spare items. Sample data must be loaded into localStorage as initial state if no data already exists.
- The same 'submitted = lock for operator, editable for admin' pattern must be applied consistently across ALL modules where submissions exist: PM checklists, breakdown slips, kaizen, predictive readings, logbook entries, task status updates.

### Modify
- PredictivePage: When an operator tries to submit a reading for a schedule that already has a submitted/pending/completed record for the same period, block submission and display 'Already Submitted' badge. Admin sees an Edit button instead of re-submission.
- AppContext initial state: Expand demoData.ts and AppContext initial states to include 5 realistic sample entries for each module. These only load if no existing data is in localStorage (first-time load or fresh install).
- All modules: 'Submitted' records show as read-only to operators. Admin always has an Edit button.

### Remove
- Nothing removed.

## Implementation Plan
1. Expand `demoData.ts` with 5 sample entries per module (breakdowns, CAPA, history cards, predictive plans+records, kaizen, tasks, electricity meters+readings, logbook check items+entries, spare items).
2. Update AppContext initial state loaders to use the new demo data as fallback when localStorage is empty.
3. In PredictivePage: add logic to check if a record already exists for the selected schedule plan + current period (month/week). If so, show 'Already Submitted' for operators and 'Edit' for admin.
4. Ensure the same read-only-for-operator / editable-for-admin pattern is consistent in all other modules.
