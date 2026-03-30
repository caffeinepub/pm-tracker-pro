# Plant Maintenance Management System

## Current State
The app has a DashboardPage with KPI cards, plan vs actual graph, breakdown analytics, quick actions buttons, pending approvals panel, and recent activity. AppContext stores machines, pmPlans, pmRecords, breakdownRecords, capaRecords, historyCards, sectionHoursConfigs, prioritizedMachineIds. Navigation pages: login, dashboard, checklist, admin, preventive, breakdown-panel, analysis, breakdown, capa, history.

No Task/Planner module exists yet.

## Requested Changes (Diff)

### Add
- **TaskRecord interface** in AppContext: id, title, description, priority (high/medium/low), status (not-started/in-process/complete/hold/canceled), assignedTo (username), assignedBy (username), createdAt, dueDate, remarks, photoFilenames, statusHistory (array of {status, changedBy, remark, photo, timestamp}), requiresApproval flag
- **Task List page** (`TaskListPage.tsx`) — a new standalone page (like Admin Panel), navigated to from dashboard or nav. Admin-only for creating/editing tasks. Features:
  - Task table with columns: Title, Priority, AssignedTo, Status, DueDate, Actions
  - Add/Edit task dialog (admin only): title, description, priority selector, assign to user dropdown (lists all users including admin), due date
  - Status options: Not Started, In Process, Complete, Hold, Canceled
  - Import tasks from Excel (.xlsx), export tasks to Excel
  - Each task row has Assign button to change assignee
  - Status badges colored by status
- **Operator task view** — operators see their own assigned tasks. Can update status + add remark + attach photo. Status change (except by admin) triggers notification to admin for approval.
- **Task notifications** — when task assigned, a pop-up/notification appears for the assigned person on next login. Admin receives notification when operator changes task status.
- **"task-list" page** added to PageName and AppRouter
- **AppContext task state**: taskRecords array, addTask, updateTask, deleteTask, importTasks functions, persisted to localStorage under key `pm_tracker_tasks`
- **Target values for BD analytics** — admin can set target values per section for BD%, MTTR, MTBF, Uptime (stored in localStorage as `pm_tracker_bd_targets`). A small "Set Targets" button in the Breakdown Analysis dashboard section opens a dialog.

### Modify
- **DashboardPage** — complete restructure into 4 clear sections:

  **Section 1: Preventive Maintenance**
  - KPI cards: Total Planned Machines (month), Today's PM Plan count (prioritized by admin), PM Completion (nos), PM Completion (%)
  - PM Plan vs Actual bar/line chart (monthly)
  - Preventive Approvals Pending count/badge with quick link

  **Section 2: Breakdown Analysis**
  - Section-wise cards (Powder Coating, Machine Shop, Utility): MTTR, MTBF, Uptime%, BD% per section
  - Section-wise graphs: BD% plan vs actual (with trending line), MTTR plan vs actual, MTBF plan vs actual, Uptime% plan vs actual — plotted as bar (actual) + line (target/trend). Admin sets target values.
  - Breakdown Approvals Pending count/badge

  **Section 3: Planner / Task Summary**
  - KPI cards: Tasks Pending, Tasks Completed, High Priority tasks count
  - Quick link to Task List page

  **Section 4: Quick Actions**
  - 7 buttons: Breakdown Slip, Assign Today's Priority Machines, Upload Data, Breakdown Record, CAPA, History Card, Task List
  - Assign Today's Priority Machines navigates to admin panel PM plans tab

- **AppContext**: add PageName "task-list", add task-related state and functions
- **App.tsx**: add TaskListPage import and route for "task-list"
- **BottomNav**: add Task List nav item
- **Navigation bar** (desktop): add Task List link

### Remove
- Old unstructured dashboard layout (scattered KPI cards, old quick actions placement)

## Implementation Plan
1. Add TaskRecord interface and task state/functions to AppContext (including localStorage persistence, notifications on assign)
2. Create TaskListPage.tsx — admin creates/edits/deletes/imports/exports tasks, assigns to users, full status management
3. Operator task view — show assigned tasks panel on a tab or section, status update with remark/photo, triggers admin notification
4. Add BD targets localStorage state and admin set-targets dialog
5. Restructure DashboardPage into 4 labeled sections with all specified KPIs and graphs
6. Wire task quick action and navigation in App.tsx, BottomNav, desktop nav
