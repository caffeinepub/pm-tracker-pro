import type { ChecklistTemplate, Machine, PMPlan, PMRecord } from "../backend";

export const DEMO_MACHINES: Machine[] = [
  {
    id: "CNC-001",
    name: "CNC Machining Center",
    department: "Production",
    location: "Shop Floor A",
    machineType: "CNC",
  },
  {
    id: "Lathe-002",
    name: "Precision Lathe",
    department: "Production",
    location: "Shop Floor B",
    machineType: "Lathe",
  },
  {
    id: "Press-003",
    name: "Hydraulic Press",
    department: "Fabrication",
    location: "Press Room",
    machineType: "Hydraulic",
  },
  {
    id: "Comp-004",
    name: "Air Compressor",
    department: "Utilities",
    location: "Utility Room",
    machineType: "Compressor",
  },
  {
    id: "Conv-005",
    name: "Belt Conveyor",
    department: "Material Handling",
    location: "Warehouse",
    machineType: "Conveyor",
  },
];

export const DEMO_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "tmpl-cnc",
    machineType: "CNC",
    items: [
      {
        id: "ci-001",
        description: "Spindle Oil Level Check",
        itemType: "visual",
      },
      {
        id: "ci-002",
        description: "Coolant Level & Concentration",
        itemType: "measurement",
      },
      {
        id: "ci-003",
        description: "Tool Holder Inspection",
        itemType: "visual",
      },
      {
        id: "ci-004",
        description: "Safety Guards & Covers",
        itemType: "safety",
      },
      {
        id: "ci-005",
        description: "Chip Conveyor Cleaning",
        itemType: "cleaning",
      },
    ],
  },
  {
    id: "tmpl-lathe",
    machineType: "Lathe",
    items: [
      { id: "ci-006", description: "Headstock Oil Level", itemType: "visual" },
      {
        id: "ci-007",
        description: "Belt Tension Check",
        itemType: "measurement",
      },
      {
        id: "ci-008",
        description: "Chuck Jaw Lubrication",
        itemType: "lubrication",
      },
      { id: "ci-009", description: "Way Lubrication", itemType: "lubrication" },
      {
        id: "ci-010",
        description: "Safety Guard Inspection",
        itemType: "safety",
      },
    ],
  },
  {
    id: "tmpl-hydraulic",
    machineType: "Hydraulic",
    items: [
      { id: "ci-011", description: "Hydraulic Oil Level", itemType: "visual" },
      {
        id: "ci-012",
        description: "System Pressure Check",
        itemType: "measurement",
      },
      {
        id: "ci-013",
        description: "Seal & Hose Inspection",
        itemType: "visual",
      },
      {
        id: "ci-014",
        description: "Filter Element Check",
        itemType: "maintenance",
      },
      {
        id: "ci-015",
        description: "Safety Relief Valve Test",
        itemType: "safety",
      },
    ],
  },
  {
    id: "tmpl-general",
    machineType: "General",
    items: [
      { id: "ci-016", description: "Oil Level Check", itemType: "visual" },
      {
        id: "ci-017",
        description: "Belt & Drive Tension",
        itemType: "measurement",
      },
      {
        id: "ci-018",
        description: "Lubrication of Moving Parts",
        itemType: "lubrication",
      },
      {
        id: "ci-019",
        description: "Filter Cleaning / Replacement",
        itemType: "cleaning",
      },
      {
        id: "ci-020",
        description: "Safety Guard Inspection",
        itemType: "safety",
      },
    ],
  },
];

const currentMonth = BigInt(new Date().getMonth() + 1);

export const DEMO_PM_PLANS: PMPlan[] = [
  {
    machineId: "CNC-001",
    month: currentMonth,
    frequency: "Monthly",
    checklistTemplateId: "tmpl-cnc",
  },
  {
    machineId: "Lathe-002",
    month: currentMonth,
    frequency: "Monthly",
    checklistTemplateId: "tmpl-lathe",
  },
  {
    machineId: "Press-003",
    month: currentMonth,
    frequency: "Monthly",
    checklistTemplateId: "tmpl-hydraulic",
  },
  {
    machineId: "Comp-004",
    month: currentMonth,
    frequency: "Monthly",
    checklistTemplateId: "tmpl-general",
  },
  {
    machineId: "Conv-005",
    month: currentMonth,
    frequency: "Monthly",
    checklistTemplateId: "tmpl-general",
  },
];

export const DEMO_PM_RECORDS: PMRecord[] = [
  {
    id: "rec-001",
    machineId: "CNC-001",
    operatorName: "Rajesh Kumar",
    operatorId: "op-001",
    status: "completed",
    completedDate: BigInt(Date.now()),
    checklistResults: [
      {
        itemId: "ci-001",
        value: "ok",
        remark: "Level normal",
        photoFilename: "",
      },
      {
        itemId: "ci-002",
        value: "ok",
        remark: "Coolant refilled",
        photoFilename: "coolant_check.jpg",
      },
    ],
  },
];

export type MonthData = {
  month: string;
  planned: number;
  actual: number;
};

export const DEMO_CHART_DATA: MonthData[] = [
  { month: "Jan", planned: 5, actual: 4 },
  { month: "Feb", planned: 5, actual: 5 },
  { month: "Mar", planned: 5, actual: 3 },
  { month: "Apr", planned: 5, actual: 5 },
  { month: "May", planned: 5, actual: 4 },
  { month: "Jun", planned: 5, actual: 5 },
  { month: "Jul", planned: 5, actual: 2 },
  { month: "Aug", planned: 5, actual: 4 },
  { month: "Sep", planned: 5, actual: 5 },
  { month: "Oct", planned: 5, actual: 3 },
  { month: "Nov", planned: 5, actual: 4 },
  { month: "Dec", planned: 5, actual: 1 },
];
