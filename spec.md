# Plant Maintenance Management System — ICP Backend Migration

## Current State

The app is a fully-featured industrial maintenance management system (PMMS) hosted on ICP. All application data is currently stored in **browser localStorage** under keys prefixed with `pm_tracker_*`. This means:
- Data is device-specific, not shared across users or devices
- No true multi-user support (each browser has its own isolated data)
- Storage is limited to ~5-10MB per browser
- Data is lost if browser storage is cleared

The backend canister currently only handles: machine master, checklist templates, PM plans, PM records, and authorization/blob-storage mixins.

All other data modules (Breakdown, CAPA, History Cards, Predictive, Tasks, Kaizen, Electricity, Logbook, Spares, Users, Analysis targets) live entirely in localStorage via `AppContext.tsx`.

## Requested Changes (Diff)

### Add
- Backend storage for ALL data modules currently in localStorage:
  - Users (UserRecord map keyed by username)
  - Breakdown records (BreakdownRecord[])
  - CAPA records (CAPARecord[])
  - History card entries (HistoryCardEntry[])
  - Section hours config (SectionHoursConfig[])
  - BD targets (BDTargets — per-section KPI targets)
  - Task records (TaskRecord[])
  - Kaizen records (KaizenRecord[])
  - Predictive plans (PredictivePlan[])
  - Predictive records (PredictiveRecord[])
  - Electricity meters (ElectricityMeter[])
  - Meter readings (MeterReading[])
  - Logbook check items (LogbookCheckItem[])
  - Logbook entries (LogbookEntry[])
  - Spare items (SpareItem[])
  - PM spare usage (PMSpareUsage[])
  - Prioritized machine IDs list
  - Notifications (AppNotification[])
- Full CRUD backend functions for each module
- Admin-only mutations (enforced via AccessControl)
- User-level reads where appropriate

### Modify
- Frontend `AppContext.tsx`: replace ALL localStorage read/write with backend canister calls
- Remove all sample data injection code (no longer needed)
- Authentication: replace username/password localStorage login with ICP backend user management
- All page components that consume AppContext will work unchanged (context API stays the same)

### Remove
- All localStorage read/write calls in AppContext.tsx
- All sample data injection blocks (the 5-entries-per-module demo data seeding)
- Direct localStorage access from any component

## Implementation Plan

1. **Backend (Motoko)**: Generate comprehensive backend with all 16+ data module types, full CRUD, admin/user access control
2. **Select components**: authorization + blob-storage (already in use)
3. **Frontend AppContext migration**: Replace all `localStorage.getItem/setItem` calls with async backend actor calls; convert synchronous state to async-loaded state; keep the context shape identical so all page components work unchanged
4. **Authentication**: Replace localStorage-based login with ICP principal-based auth using authorization component; admin creates users, users log in with ICP identity or username/password stored in backend
5. **Remove sample data**: Delete all `if (module.length === 0) { inject 5 samples }` blocks
6. **Test**: Verify all panels load data from backend, CRUD operations persist across page reloads and different browsers
