# Plant Maintenance Management System

## Current State

Full-featured industrial maintenance app with:
- Dashboard (4 sections: Preventive, Breakdown Analysis, Planner, Quick Actions)
- PreventivePage (PM plans, checklists, approvals)
- BreakdownPage + BreakdownPanelPage (slips, approvals, CAPA, history)
- AnalysisPage (section-wise BD%, MTTR, MTBF, Uptime + Overall Plant tab)
- TaskListPage (planner)
- AppContext with state for machines, breakdowns, CAPA, history, tasks, bdTargets, sectionHoursConfigs
- Routing via `currentPage` in AppContext; pages: login, dashboard, checklist, admin, preventive, breakdown-panel, analysis, breakdown, capa, history, task-list

## Requested Changes (Diff)

### Add
- **Item 1**: Overall plant available hours = `Math.max` of all sections' available working hours (not sum)
- **Item 2**: Future months in all graphs render blank (null value, not 0) — only months <= current month have data
- **Item 3**: Per-section KPI target editing UI in each section tab (like existing Overall target form) — uses same `bdTargets` state keys (Powder Coating, Machine Shop, Utility already exist)
- **Item 4**: Dashboard Breakdown Analysis section — replace section-wise cards + 4 section charts with overall plant KPI cards (BD%, MTTR, MTBF, Uptime%, BD Count, BD Hours) and a single BD% monthly trend chart
- **Item 5**: Breakdown slip form — add photo upload input (file input accept="image/*"), read as base64, store `photoDataUrl` on `BreakdownRecord`
- **Item 6+7+8**: New `KaizenPage.tsx` — operators and admin post kaizens with before/after photos; list view; Excel export of all records; per-kaizen printable slip (window.print); Kaizen quick action button on dashboard
- **Item 9**: Rename "PM" label to "Preventive Maintenance" everywhere (nav labels, page titles, bottom nav) — routing key stays "preventive"
- **Item 10**: New `PredictivePage.tsx` — predictive maintenance panel similar to PM; admin creates predictive schedules per machine with checklists that include reading fields (vibration, temperature, oil level, pressure); operators complete and submit; admin approves; export to Excel
- **Item 11**: Unplanned maintenance ratio in Overall Plant analysis — formula: breakdown count in month / (preventive PM planned in month + predictive planned in month); shown as new KPI card and graph
- **Item 12**: New `ElectricityPage.tsx` — admin defines meters (name, location, multiplier, unit); operators/admin enter readings (date, meter, start reading, end reading); consumption = (end-start) × multiplier; monthly trend chart; Excel export
- **Item 13**: New `OperatorLogbookPage.tsx` — admin defines logbook checksheet items (description, category); operators fill daily logbook (select date, for each checksheet item: status, remark, photo); admin views all operators' logbooks; Excel export of logbook records

### Modify
- `AppContext.tsx`: Add interfaces + state for KaizenRecord, PredictiveRecord, PredictivePlan, ElectricityMeter, MeterReading, LogbookCheckItem, LogbookEntry; add page names; add CRUD methods; add `photoDataUrl?: string` to BreakdownRecord
- `App.tsx`: Add routes for kaizen, predictive, electricity, logbook
- `BottomNav.tsx`: Add navigation for new panels (kaizen, predictive, electricity, logbook)
- `DashboardPage.tsx`: Replace BD Analysis section content with overall plant data; add Kaizen quick action button
- `AnalysisPage.tsx`: Fix available hours for overall (use max), blank future months, add section target UIs, add unplanned maintenance ratio
- `BreakdownPage.tsx`: Add photo upload to breakdown form
- All nav bars across all pages: Update "PM" to "Preventive Maintenance"

### Remove
- Section-wise KPI cards and 4 section-wise charts from Dashboard Breakdown Analysis section

## Implementation Plan

1. **AppContext.tsx** — add all new types (KaizenRecord, PredictivePlan, PredictiveRecord, ElectricityMeter, MeterReading, LogbookCheckItem, LogbookEntry), add `photoDataUrl` to BreakdownRecord, add state + localStorage persistence, add page names, add CRUD methods to context value

2. **App.tsx** — add imports and routes for KaizenPage, PredictivePage, ElectricityPage, OperatorLogbookPage

3. **BottomNav.tsx** — add Kaizen, Predictive, Electricity, Logbook nav items (keep it readable — can group or use a compact layout)

4. **AnalysisPage.tsx** — (a) fix `getOverallPlantMetrics` and `getOverallMonthlyData` to use max available hours; (b) add null for future months in monthly data functions; (c) add target editing form in each section tab; (d) add unplanned maintenance KPI and chart to Overall tab

5. **DashboardPage.tsx** — (a) replace BD Analysis section with overall plant KPI cards + monthly BD% trend chart; (b) add Kaizen button to quick actions

6. **BreakdownPage.tsx** — add photo file input to form, store base64 data URL in form state and record

7. **KaizenPage.tsx** (new) — form: title, category, machine/area, problem description, improvement description, before photo, after photo, submitter; list with status/filter; Excel export; per-kaizen print slip

8. **PredictivePage.tsx** (new) — admin creates predictive schedules (machine, frequency, schedule date, reading parameters); operator fills readings and submits; admin approves; export to Excel

9. **ElectricityPage.tsx** (new) — meter management (admin), readings entry (operator/admin), consumption calculation, monthly chart, Excel export

10. **OperatorLogbookPage.tsx** (new) — admin defines checksheet items; operator fills daily logbook; admin views all; Excel export
