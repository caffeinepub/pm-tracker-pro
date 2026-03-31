# Plant Maintenance Management System

## Current State
AnalysisPage has section-wise tabs (Powder Coating, Machine Shop, Utility) showing KPI cards (BD%, MTTR, MTBF, Uptime) and monthly trend charts per section with admin-settable targets via `bdTargets` in AppContext. BDTargets interface covers the 3 sections only. Overall plant aggregation does not exist.

## Requested Changes (Diff)

### Add
- New "Overall Plant" tab in AnalysisPage (first tab, before section tabs)
- Overall plant KPI cards: Total BD Count, Total BD Hours, BD%, MTTR, MTBF, Uptime% — aggregated from ALL sections combined
- Four yearly trend charts (one each for BD%, MTTR, MTBF, Uptime) with monthly bars + dashed target line
- Admin-only target entry form on the Overall Plant tab — 4 inputs (target BD%, target MTTR, target MTBF, target Uptime%) with a Save button
- Targets persist to localStorage via AppContext
- `BDTargets` interface in AppContext: add an `"Overall"` key with `{ bdPct, mttr, mtbf, uptime }` fields
- `DEFAULT_BD_TARGETS` updated to include Overall defaults

### Modify
- AppContext: extend `BDTargets` interface and `DEFAULT_BD_TARGETS` to include `Overall` key
- AnalysisPage: add Overall Plant tab as the first tab in the Tabs component
- AnalysisPage: add `updateBDTargets` to the destructured context (already exists)

### Remove
- Nothing removed

## Implementation Plan
1. In `AppContext.tsx`: add `Overall: { bdPct: number; mttr: number; mtbf: number; uptime: number }` to `BDTargets` interface and `DEFAULT_BD_TARGETS`
2. In `AnalysisPage.tsx`:
   - Add `"Overall"` to the Tabs component as the first tab
   - Add a `getOverallPlantMetrics()` function that aggregates BD count, BD hours, and available working hours across ALL sections
   - Compute plant-level BD%, MTTR, MTBF, Uptime from aggregated totals
   - Add `getOverallMonthlyData()` function that aggregates monthly data across all sections
   - Render Overall tab content: KPI summary cards + 4 charts (BD%, MTTR, MTBF, Uptime monthly trends with target lines)
   - Admin target form with 4 number inputs (target BD%, MTTR, MTBF, Uptime) + Save button that calls `updateBDTargets({ Overall: ... })`
