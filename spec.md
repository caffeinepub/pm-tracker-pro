# Plant Maintenance Management System

## Current State
- ElectricityPage: operator enters startReading + endReading manually per day. No import option, no template download, no time recording.
- PredictivePage: plans and readings work but no import for past data/checksheets, no template download.
- KaizenPage: print slip uses window.print() with a hidden div. Photos are embedded in the print area. Formatting issues with slip layout. Print area exists but needs proper A4 layout.

## Requested Changes (Diff)

### Add
1. **Electricity - Single reading entry**: Operator enters ONE reading value (today's meter reading) plus a time field (HH:MM). System auto-calculates consumption = today's reading - yesterday's reading for the same meter. Show "yesterday's reading" as read-only reference when a meter is selected and date is set.
2. **Electricity - Import past readings**: Excel import button to bulk-import past readings. Template download button with columns: Date, Time, MeterName, Reading.
3. **Predictive - Import button**: Import past records and checksheet plans from Excel. Template download with two sheets: "Plans" (MachineID, MachineName, ScheduledDate, Frequency, Parameters, Notes) and "Records" (Date, MachineName, then parameter columns matching plan).
4. **Kaizen slip - proper A4 print format**: Redesign the print area to be a proper A4 page with clear sections: company header, kaizen details table, problem description box, Before Photo (full width or side-by-side with after), improvement description box, After Photo, spares used table, approval section at bottom. All submitted data included. Photos embedded as img tags.

### Modify
- ElectricityPage: Replace startReading/endReading dual entry with single "Today's Reading" + "Time" fields. Add auto-computed "Yesterday's Reading" display. Consumption = todayReading - yesterdayReading. Update MeterReading type usage to store single reading value and time. Export should include reading time.
- KaizenPage print: Improve CSS for @media print - use proper A4 sizing, page-break handling, better typography, bordered sections, side-by-side photos.

### Remove
- ElectricityPage: Remove manual endReading input from the reading entry form (it becomes auto-derived).

## Implementation Plan
1. Update ElectricityPage reading form: single `reading` field + `time` (HH:MM) field. Look up yesterday's reading for same meter from meterReadings state. Show it as reference. On submit, store reading + time; consumption = reading - yesterdayReading (or 0 if no prior reading).
2. Add Import button to Electricity header: parse Excel rows (Date, Time, MeterName, Reading), match meter by name, compute consumption from previous day's reading.
3. Add Template download to Electricity: generate Excel with sample row.
4. Add Import + Template download buttons to Predictive Plans tab (admin only): parse two-sheet Excel. Plans sheet creates predictive plans; Records sheet creates predictive records.
5. Fix Kaizen print slip: redesign #kaizen-print-area with A4 dimensions (210mm width), proper print CSS, clear sections with borders, embedded photos side by side, full data table, spares table, and signature/approval section.
