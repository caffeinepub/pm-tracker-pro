// eslint-disable-next-line
const XLSX = (window as any).XLSX;
import type { ChecklistTemplate, Machine, PMPlan, PMRecord } from "../backend";

export function exportAllDataToExcel(
  machines: Machine[],
  pmPlans: PMPlan[],
  pmRecords: PMRecord[],
  checklistTemplates: ChecklistTemplate[],
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Machines
  const machineRows = [
    ["ID", "Name", "Department", "Location", "Machine Type"],
    ...machines.map((m) => [
      m.id,
      m.name,
      m.department,
      m.location,
      m.machineType,
    ]),
  ];
  const wsMachines = XLSX.utils.aoa_to_sheet(machineRows);
  wsMachines["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMachines, "Machines");

  // Sheet 2: PM Plans
  const planRows = [
    ["Machine ID", "Machine Name", "Month", "Frequency", "Template ID"],
    ...pmPlans.map((p) => {
      const machine = machines.find((m) => m.id === p.machineId);
      return [
        p.machineId,
        machine?.name ?? "",
        Number(p.month),
        p.frequency,
        p.checklistTemplateId,
      ];
    }),
  ];
  const wsPlans = XLSX.utils.aoa_to_sheet(planRows);
  wsPlans["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPlans, "PM Plans");

  // Sheet 3: PM Records (flattened — one row per checklist item)
  const recordRows: (string | number)[][] = [
    [
      "Record ID",
      "Machine ID",
      "Machine Name",
      "Operator Name",
      "Operator ID",
      "Status",
      "Completed Date",
      "Item ID",
      "Item Description",
      "Value",
      "Remark",
      "Photo Filename",
    ],
  ];

  for (const record of pmRecords) {
    const machine = machines.find((m) => m.id === record.machineId);
    const machineName = machine?.name ?? record.machineId;
    const completedDate = new Date(Number(record.completedDate)).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    if (record.checklistResults.length === 0) {
      recordRows.push([
        record.id,
        record.machineId,
        machineName,
        record.operatorName,
        record.operatorId,
        record.status,
        completedDate,
        "",
        "",
        "",
        "",
        "",
      ]);
    } else {
      for (const item of record.checklistResults) {
        recordRows.push([
          record.id,
          record.machineId,
          machineName,
          record.operatorName,
          record.operatorId,
          record.status,
          completedDate,
          item.itemId,
          "", // description not stored in result, only itemId
          item.value,
          item.remark,
          item.photoFilename,
        ]);
      }
    }
  }

  const wsRecords = XLSX.utils.aoa_to_sheet(recordRows);
  wsRecords["!cols"] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 12 },
    { wch: 28 },
    { wch: 10 },
    { wch: 24 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRecords, "PM Records");

  // Sheet 4: Checklist Templates
  const templateRows: (string | number)[][] = [
    ["Template ID", "Machine Type", "Item ID", "Item Description", "Item Type"],
  ];
  for (const tmpl of checklistTemplates) {
    if (tmpl.items.length === 0) {
      templateRows.push([tmpl.id, tmpl.machineType, "", "", ""]);
    } else {
      for (const item of tmpl.items) {
        templateRows.push([
          tmpl.id,
          tmpl.machineType,
          item.id,
          item.description,
          item.itemType,
        ]);
      }
    }
  }
  const wsTemplates = XLSX.utils.aoa_to_sheet(templateRows);
  wsTemplates["!cols"] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 36 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplates, "Checklist Templates");

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `PM_Report_${dateStr}.xlsx`);
}
