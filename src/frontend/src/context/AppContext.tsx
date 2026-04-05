import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ChecklistTemplate, Machine, PMPlan, PMRecord } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { getRawActor } from "../utils/rawActor";

// ─── exported app user ────────────────────────────────────────────────────────
export interface AppUser {
  name: string;
  role: "admin" | "operator";
  username: string;
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

// PMPlanExtended is compatible with PMPlan but adds optional fields
export interface PMPlanExtended {
  id?: string;
  machineId: string;
  month: bigint;
  frequency: string;
  checklistTemplateId: string;
  scheduledDate?: string;
  notes?: string;
}

export type UserRecord = {
  password: string;
  name: string;
  role: "admin" | "operator";
};

export interface MachineExtended extends Machine {
  section?: "Powder Coating" | "Machine Shop" | "Utility" | "";
  availableWorkingHours?: number;
}

export interface BreakdownRecord {
  id: string;
  machineId: string;
  machineName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  problemDescription: string;
  faultType: "Electrical" | "Mechanical" | "Pneumatic" | "Other";
  affectedPart: string;
  temporaryAction: string;
  breakdownType: "Breakdown" | "Planned Stop" | "Minor Stop";
  operatorName: string;
  operatorUsername: string;
  status:
    | "pending-approval"
    | "approved-breakdown"
    | "approved-service"
    | "rejected";
  isInCapa: boolean;
  isInHistory: boolean;
  adminRemarks?: string;
  submittedAt: number;
  photoDataUrl?: string;
  spareUsed?: Array<{
    spareName: string;
    partSpec?: string;
    qty: number;
    unit: string;
    cost: number;
  }>;
}

export interface CAPARecord {
  id: string;
  breakdownId: string;
  machineId: string;
  machineName: string;
  date: string;
  problemSummary: string;
  rootCause: string;
  temporaryAction: string;
  permanentAction: string;
  responsiblePerson: string;
  targetDate: string;
  status: "Open" | "Closed";
  createdAt: number;
  closedAt?: number;
}

export interface HistoryCardEntry {
  id: string;
  machineId: string;
  machineName?: string;
  date: string;
  eventType: "Breakdown" | "PM" | "Repair" | "Other";
  durationMinutes?: number;
  problemDescription: string;
  actionTaken: string;
  doneBy: string;
  remarks: string;
  sourceId?: string;
  createdAt: number;
}

export interface SectionHoursConfig {
  section: "Powder Coating" | "Machine Shop" | "Utility";
  availableProductionHrs: number;
  powerOff: number;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "not-started" | "in-process" | "complete" | "hold" | "canceled";
  assignedTo: string;
  assignedByUsername: string;
  createdAt: number;
  dueDate: string;
  statusHistory: Array<{
    status: string;
    changedBy: string;
    remark?: string;
    photoFilename?: string;
    timestamp: number;
    requiresApproval?: boolean;
    approved?: boolean;
  }>;
  lastUpdatedRemark?: string;
  lastUpdatedPhoto?: string;
}

export interface BDTargets {
  "Powder Coating": {
    bdPct: number;
    mttr: number;
    mtbf: number;
    uptime: number;
  };
  "Machine Shop": { bdPct: number; mttr: number; mtbf: number; uptime: number };
  Utility: { bdPct: number; mttr: number; mtbf: number; uptime: number };
  Overall: { bdPct: number; mttr: number; mtbf: number; uptime: number };
}

export interface KaizenRecord {
  id: string;
  title: string;
  category:
    | "Safety"
    | "Quality"
    | "Cost"
    | "Delivery"
    | "Environment"
    | "Other";
  machineArea: string;
  problemDescription: string;
  improvementDescription: string;
  beforePhotoDataUrl?: string;
  afterPhotoDataUrl?: string;
  submittedBy: string;
  submittedByUsername: string;
  submittedAt: number;
  status: "Pending Approval" | "Approved" | "Rejected" | "Closed";
  closedAt?: number;
  closedRemarks?: string;
  spares?: Array<{ name: string; partNo: string; qty: string; unit: string }>;
  approvedAt?: number;
  rejectedAt?: number;
  rejectionReason?: string;
  adminRemarks?: string;
}

export interface PredictivePlan {
  id: string;
  machineId: string;
  machineName: string;
  scheduledDate: string;
  frequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
  parameters: string[];
  notes: string;
  createdAt: number;
}

export interface PredictiveRecord {
  id: string;
  planId: string;
  machineId: string;
  machineName: string;
  date: string;
  readings: Record<string, string>;
  remarks: string;
  operatorName: string;
  operatorUsername: string;
  submittedAt: number;
  status: "pending-approval" | "completed" | "rejected";
}

export interface ElectricityMeter {
  id: string;
  name: string;
  unit: string;
  multiplier: number;
  location: string;
  includeInKpi: boolean;
  createdAt: number;
}

export interface MeterReading {
  time?: string;
  reading?: number;
  id: string;
  meterId: string;
  meterName: string;
  date: string;
  startReading: number;
  endReading: number;
  consumption: number;
  enteredBy: string;
  enteredByUsername: string;
  submittedAt: number;
}

export interface LogbookCheckItem {
  id: string;
  description: string;
  category: string;
  createdAt: number;
}

export interface LogbookEntry {
  id: string;
  date: string;
  operatorName: string;
  operatorUsername: string;
  items: Array<{
    checkItemId: string;
    description: string;
    status: "OK" | "Not OK" | "NA";
    remark: string;
    photoDataUrl?: string;
  }>;
  generalRemarks: string;
  submittedAt: number;
  activities?: Array<{
    description: string;
    timeSpent: string;
    status: string;
    remarks: string;
  }>;
  spareUsed?: Array<{
    spareName: string;
    qty: number;
    cost: number;
  }>;
}

export interface SpareItem {
  id: string;
  partName: string;
  partSpec: string;
  qtyInStock: number;
  minStockLevel: number;
  unit: string;
  costPerUnit: number;
  applicableMachineSection: string;
  createdAt: number;
}

export interface PMSpareUsage {
  id: string;
  machineId: string;
  machineName: string;
  date: string;
  spareUsed: Array<{
    spareName: string;
    partSpec?: string;
    qty: number;
    unit: string;
    cost: number;
  }>;
  submittedBy: string;
  submittedByUsername: string;
  workType: "PM" | "Predictive" | "Logbook";
}

// ─── constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "pm_tracker_session";

const DEFAULT_BD_TARGETS: BDTargets = {
  "Powder Coating": { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  "Machine Shop": { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  Utility: { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  Overall: { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
};

const DEFAULT_SECTION_HOURS: SectionHoursConfig[] = [
  { section: "Powder Coating", availableProductionHrs: 2000, powerOff: 0 },
  { section: "Machine Shop", availableProductionHrs: 2000, powerOff: 0 },
  { section: "Utility", availableProductionHrs: 2000, powerOff: 0 },
];

// ─── backend conversion helpers ───────────────────────────────────────────────

function bigToNum(v: bigint): number {
  return Number(v);
}
function numToBig(v: number): bigint {
  return BigInt(Math.floor(v));
}

/** Convert a backend BreakdownRecord to a frontend BreakdownRecord */
function fromBackendBreakdown(
  b: import("../declarations/backend.did").BreakdownRecord,
): BreakdownRecord {
  return {
    id: b.id,
    machineId: b.machineId,
    machineName: b.machineName,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    durationMinutes: b.durationMinutes,
    problemDescription: b.problemDescription,
    faultType: (b.faultType as BreakdownRecord["faultType"]) || "Other",
    affectedPart: b.affectedPart,
    temporaryAction: b.temporaryAction,
    breakdownType:
      (b.breakdownType as BreakdownRecord["breakdownType"]) || "Breakdown",
    operatorName: b.operatorName,
    operatorUsername: b.operatorUsername,
    status: (b.status as BreakdownRecord["status"]) || "pending-approval",
    isInCapa: b.isInCapa,
    isInHistory: b.isInHistory,
    adminRemarks: b.adminRemarks || undefined,
    submittedAt: bigToNum(b.submittedAt),
    photoDataUrl: b.photoFilename || undefined,
    spareUsed: b.spareUsed?.map((s) => ({
      spareName: s.spareName,
      partSpec: s.partSpec || undefined,
      qty: s.qty,
      unit: s.unit,
      cost: s.cost,
    })),
  };
}

function toBackendBreakdown(
  r: BreakdownRecord,
): import("../declarations/backend.did").BreakdownRecord {
  return {
    id: r.id,
    machineId: r.machineId,
    machineName: r.machineName,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    durationMinutes: r.durationMinutes,
    problemDescription: r.problemDescription,
    faultType: r.faultType,
    affectedPart: r.affectedPart,
    temporaryAction: r.temporaryAction,
    breakdownType: r.breakdownType,
    operatorName: r.operatorName,
    operatorUsername: r.operatorUsername,
    status: r.status,
    isInCapa: r.isInCapa,
    isInHistory: r.isInHistory,
    adminRemarks: r.adminRemarks ?? "",
    submittedAt: numToBig(r.submittedAt),
    photoFilename: r.photoDataUrl ?? "",
    spareUsed: (r.spareUsed ?? []).map((s) => ({
      spareName: s.spareName,
      partSpec: s.partSpec ?? "",
      qty: s.qty,
      unit: s.unit,
      cost: s.cost,
    })),
  };
}

function fromBackendCapa(
  c: import("../declarations/backend.did").CAPARecord,
): CAPARecord {
  return {
    id: c.id,
    breakdownId: c.breakdownId,
    machineId: c.machineId,
    machineName: c.machineName,
    date: c.date,
    problemSummary: c.problemSummary,
    rootCause: c.rootCause,
    temporaryAction: c.temporaryAction,
    permanentAction: c.permanentAction,
    responsiblePerson: c.responsiblePerson,
    targetDate: c.targetDate,
    status: (c.status as CAPARecord["status"]) || "Open",
    createdAt: bigToNum(c.createdAt),
    closedAt: c.closedAt === 0n ? undefined : bigToNum(c.closedAt),
  };
}

function toBackendCapa(
  c: CAPARecord,
): import("../declarations/backend.did").CAPARecord {
  return {
    id: c.id,
    breakdownId: c.breakdownId,
    machineId: c.machineId,
    machineName: c.machineName,
    date: c.date,
    problemSummary: c.problemSummary,
    rootCause: c.rootCause,
    temporaryAction: c.temporaryAction,
    permanentAction: c.permanentAction,
    responsiblePerson: c.responsiblePerson,
    targetDate: c.targetDate,
    status: c.status,
    createdAt: numToBig(c.createdAt),
    closedAt: c.closedAt ? numToBig(c.closedAt) : 0n,
  };
}

function fromBackendHistory(
  h: import("../declarations/backend.did").HistoryCardEntry,
): HistoryCardEntry {
  return {
    id: h.id,
    machineId: h.machineId,
    machineName: h.machineName || undefined,
    date: h.date,
    eventType: (h.eventType as HistoryCardEntry["eventType"]) || "Other",
    durationMinutes: h.durationMinutes,
    problemDescription: h.problemDescription,
    actionTaken: h.actionTaken,
    doneBy: h.doneBy,
    remarks: h.remarks,
    sourceId: h.sourceId || undefined,
    createdAt: bigToNum(h.createdAt),
  };
}

function toBackendHistory(
  h: HistoryCardEntry,
): import("../declarations/backend.did").HistoryCardEntry {
  return {
    id: h.id,
    machineId: h.machineId,
    machineName: h.machineName ?? "",
    date: h.date,
    eventType: h.eventType,
    durationMinutes: h.durationMinutes ?? 0,
    problemDescription: h.problemDescription,
    actionTaken: h.actionTaken,
    doneBy: h.doneBy,
    remarks: h.remarks,
    sourceId: h.sourceId ?? "",
    createdAt: numToBig(h.createdAt),
  };
}

function fromBackendTask(
  t: import("../declarations/backend.did").TaskRecord,
): TaskRecord {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: (t.priority as TaskRecord["priority"]) || "medium",
    status: (t.status as TaskRecord["status"]) || "not-started",
    assignedTo: t.assignedTo,
    assignedByUsername: t.assignedByUsername,
    createdAt: bigToNum(t.createdAt),
    dueDate: t.dueDate,
    statusHistory: (t.statusHistory ?? []).map((h) => ({
      status: h.status,
      changedBy: h.changedBy,
      remark: h.remark || undefined,
      photoFilename: h.photoFilename || undefined,
      timestamp: bigToNum(h.timestamp),
      requiresApproval: h.requiresApproval,
      approved: h.approved,
    })),
    lastUpdatedRemark: t.lastUpdatedRemark || undefined,
    lastUpdatedPhoto: t.lastUpdatedPhoto || undefined,
  };
}

function toBackendTask(
  t: TaskRecord,
): import("../declarations/backend.did").TaskRecord {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo,
    assignedByUsername: t.assignedByUsername,
    createdAt: numToBig(t.createdAt),
    dueDate: t.dueDate,
    statusHistory: (t.statusHistory ?? []).map((h) => ({
      status: h.status,
      changedBy: h.changedBy,
      remark: h.remark ?? "",
      photoFilename: h.photoFilename ?? "",
      timestamp: numToBig(h.timestamp),
      requiresApproval: h.requiresApproval ?? false,
      approved: h.approved ?? false,
    })),
    lastUpdatedRemark: t.lastUpdatedRemark ?? "",
    lastUpdatedPhoto: t.lastUpdatedPhoto ?? "",
  };
}

function fromBackendKaizen(
  k: import("../declarations/backend.did").KaizenRecord,
): KaizenRecord {
  return {
    id: k.id,
    title: k.title,
    category: (k.category as KaizenRecord["category"]) || "Other",
    machineArea: k.machineArea,
    problemDescription: k.problemDescription,
    improvementDescription: k.improvementDescription,
    beforePhotoDataUrl: k.beforePhotoFilename || undefined,
    afterPhotoDataUrl: k.afterPhotoFilename || undefined,
    submittedBy: k.submittedBy,
    submittedByUsername: k.submittedByUsername,
    submittedAt: bigToNum(k.submittedAt),
    status: (k.status as KaizenRecord["status"]) || "Pending Approval",
    closedAt: k.closedAt === 0n ? undefined : bigToNum(k.closedAt),
    closedRemarks: k.closedRemarks || undefined,
    spares: (k.spares ?? []).map((s) => ({
      name: s.name,
      partNo: s.partNo,
      qty: s.qty,
      unit: s.unit,
    })),
    approvedAt: k.approvedAt === 0n ? undefined : bigToNum(k.approvedAt),
    rejectedAt: k.rejectedAt === 0n ? undefined : bigToNum(k.rejectedAt),
    rejectionReason: k.rejectionReason || undefined,
    adminRemarks: k.adminRemarks || undefined,
  };
}

function toBackendKaizen(
  k: KaizenRecord,
): import("../declarations/backend.did").KaizenRecord {
  return {
    id: k.id,
    title: k.title,
    category: k.category,
    machineArea: k.machineArea,
    problemDescription: k.problemDescription,
    improvementDescription: k.improvementDescription,
    beforePhotoFilename: k.beforePhotoDataUrl ?? "",
    afterPhotoFilename: k.afterPhotoDataUrl ?? "",
    submittedBy: k.submittedBy,
    submittedByUsername: k.submittedByUsername,
    submittedAt: numToBig(k.submittedAt),
    status: k.status,
    closedAt: k.closedAt ? numToBig(k.closedAt) : 0n,
    closedRemarks: k.closedRemarks ?? "",
    spares: (k.spares ?? []).map((s) => ({
      name: s.name,
      partNo: s.partNo,
      qty: s.qty,
      unit: s.unit,
    })),
    approvedAt: k.approvedAt ? numToBig(k.approvedAt) : 0n,
    rejectedAt: k.rejectedAt ? numToBig(k.rejectedAt) : 0n,
    rejectionReason: k.rejectionReason ?? "",
    adminRemarks: k.adminRemarks ?? "",
  };
}

function fromBackendPredictivePlan(
  p: import("../declarations/backend.did").PredictivePlan,
): PredictivePlan {
  return {
    id: p.id,
    machineId: p.machineId,
    machineName: p.machineName,
    scheduledDate: p.scheduledDate,
    frequency: (p.frequency as PredictivePlan["frequency"]) || "Monthly",
    parameters: [...p.parameters],
    notes: p.notes,
    createdAt: bigToNum(p.createdAt),
  };
}

function toBackendPredictivePlan(
  p: PredictivePlan,
): import("../declarations/backend.did").PredictivePlan {
  return {
    id: p.id,
    machineId: p.machineId,
    machineName: p.machineName,
    scheduledDate: p.scheduledDate,
    frequency: p.frequency,
    parameters: [...p.parameters],
    notes: p.notes,
    createdAt: numToBig(p.createdAt),
  };
}

function fromBackendPredictiveRecord(
  r: import("../declarations/backend.did").PredictiveRecord,
): PredictiveRecord {
  const readings: Record<string, string> = {};
  for (const reading of r.readings) {
    readings[reading.paramName] = reading.value;
  }
  return {
    id: r.id,
    planId: r.planId,
    machineId: r.machineId,
    machineName: r.machineName,
    date: r.date,
    readings,
    remarks: r.remarks,
    operatorName: r.operatorName,
    operatorUsername: r.operatorUsername,
    submittedAt: bigToNum(r.submittedAt),
    status: (r.status as PredictiveRecord["status"]) || "pending-approval",
  };
}

function toBackendPredictiveRecord(
  r: PredictiveRecord,
): import("../declarations/backend.did").PredictiveRecord {
  return {
    id: r.id,
    planId: r.planId,
    machineId: r.machineId,
    machineName: r.machineName,
    date: r.date,
    readings: Object.entries(r.readings).map(([paramName, value]) => ({
      paramName,
      value,
    })),
    remarks: r.remarks,
    operatorName: r.operatorName,
    operatorUsername: r.operatorUsername,
    submittedAt: numToBig(r.submittedAt),
    status: r.status,
  };
}

function fromBackendElectricityMeter(
  m: import("../declarations/backend.did").ElectricityMeter,
): ElectricityMeter {
  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    multiplier: m.multiplier,
    location: m.location,
    includeInKpi: m.includeInKpi,
    createdAt: bigToNum(m.createdAt),
  };
}

function toBackendElectricityMeter(
  m: ElectricityMeter,
): import("../declarations/backend.did").ElectricityMeter {
  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    multiplier: m.multiplier,
    location: m.location,
    includeInKpi: m.includeInKpi,
    createdAt: numToBig(m.createdAt),
  };
}

function fromBackendMeterReading(
  r: import("../declarations/backend.did").MeterReading,
): MeterReading {
  return {
    id: r.id,
    meterId: r.meterId,
    meterName: r.meterName,
    date: r.date,
    time: r.time,
    reading: r.reading,
    startReading: r.reading, // map 'reading' to startReading for compat
    endReading: r.reading,
    consumption: r.consumption,
    enteredBy: r.enteredBy,
    enteredByUsername: r.enteredByUsername,
    submittedAt: bigToNum(r.submittedAt),
  };
}

function toBackendMeterReading(
  r: MeterReading,
): import("../declarations/backend.did").MeterReading {
  return {
    id: r.id,
    meterId: r.meterId,
    meterName: r.meterName,
    date: r.date,
    time: r.time ?? "",
    reading: r.reading ?? r.startReading,
    consumption: r.consumption,
    enteredBy: r.enteredBy,
    enteredByUsername: r.enteredByUsername,
    submittedAt: numToBig(r.submittedAt),
  };
}

function fromBackendLogbookCheckItem(
  i: import("../declarations/backend.did").LogbookCheckItem,
): LogbookCheckItem {
  return {
    id: i.id,
    description: i.description,
    category: i.category,
    createdAt: bigToNum(i.createdAt),
  };
}

function toBackendLogbookCheckItem(
  i: LogbookCheckItem,
): import("../declarations/backend.did").LogbookCheckItem {
  return {
    id: i.id,
    description: i.description,
    category: i.category,
    createdAt: numToBig(i.createdAt),
  };
}

function fromBackendLogbookEntry(
  e: import("../declarations/backend.did").LogbookEntry,
): LogbookEntry {
  return {
    id: e.id,
    date: e.date,
    operatorName: e.operatorName,
    operatorUsername: e.operatorUsername,
    items: (e.items ?? []).map((item) => ({
      checkItemId: item.checkItemId,
      description: item.description,
      status: (item.status as LogbookEntry["items"][number]["status"]) || "OK",
      remark: item.remark,
      photoDataUrl: item.photoFilename || undefined,
    })),
    generalRemarks: e.generalRemarks,
    submittedAt: bigToNum(e.submittedAt),
    activities: (e.activities ?? []).map((a) => ({
      description: a.description,
      timeSpent: a.timeSpent,
      status: a.status,
      remarks: a.remarks,
    })),
    spareUsed: (e.spareUsed ?? []).map((s) => ({
      spareName: s.spareName,
      qty: s.qty,
      cost: s.cost,
    })),
  };
}

function toBackendLogbookEntry(
  e: LogbookEntry,
): import("../declarations/backend.did").LogbookEntry {
  return {
    id: e.id,
    date: e.date,
    operatorName: e.operatorName,
    operatorUsername: e.operatorUsername,
    items: (e.items ?? []).map((item) => ({
      checkItemId: item.checkItemId,
      description: item.description,
      status: item.status,
      remark: item.remark,
      photoFilename: item.photoDataUrl ?? "",
    })),
    generalRemarks: e.generalRemarks,
    submittedAt: numToBig(e.submittedAt),
    activities: (e.activities ?? []).map((a) => ({
      description: a.description,
      timeSpent: a.timeSpent,
      status: a.status,
      remarks: a.remarks,
      photoFilename: "",
    })),
    spareUsed: (e.spareUsed ?? []).map((s) => ({
      spareName: s.spareName,
      qty: s.qty,
      cost: s.cost,
    })),
  };
}

function fromBackendSpareItem(
  s: import("../declarations/backend.did").SpareItem,
): SpareItem {
  return {
    id: s.id,
    partName: s.partName,
    partSpec: s.partSpec,
    qtyInStock: s.qtyInStock,
    minStockLevel: s.minStockLevel,
    unit: s.unit,
    costPerUnit: s.costPerUnit,
    applicableMachineSection: s.applicableMachineSection,
    createdAt: bigToNum(s.createdAt),
  };
}

function toBackendSpareItem(
  s: SpareItem,
): import("../declarations/backend.did").SpareItem {
  return {
    id: s.id,
    partName: s.partName,
    partSpec: s.partSpec,
    qtyInStock: s.qtyInStock,
    minStockLevel: s.minStockLevel,
    unit: s.unit,
    costPerUnit: s.costPerUnit,
    applicableMachineSection: s.applicableMachineSection,
    createdAt: numToBig(s.createdAt),
  };
}

function fromBackendPMSpareUsage(
  u: import("../declarations/backend.did").PMSpareUsage,
): PMSpareUsage {
  return {
    id: u.id,
    machineId: u.machineId,
    machineName: u.machineName,
    date: u.date,
    spareUsed: (u.spareUsed ?? []).map((s) => ({
      spareName: s.spareName,
      partSpec: s.partSpec || undefined,
      qty: s.qty,
      unit: s.unit,
      cost: s.cost,
    })),
    submittedBy: u.submittedBy,
    submittedByUsername: u.submittedByUsername,
    workType: (u.workType as PMSpareUsage["workType"]) || "PM",
  };
}

function toBackendPMSpareUsage(
  u: PMSpareUsage,
): import("../declarations/backend.did").PMSpareUsage {
  return {
    id: u.id,
    machineId: u.machineId,
    machineName: u.machineName,
    date: u.date,
    spareUsed: (u.spareUsed ?? []).map((s) => ({
      spareName: s.spareName,
      partSpec: s.partSpec ?? "",
      qty: s.qty,
      unit: s.unit,
      cost: s.cost,
    })),
    submittedBy: u.submittedBy,
    submittedByUsername: u.submittedByUsername,
    workType: u.workType,
    submittedAt: numToBig(Date.now()),
  };
}

function fromBackendMachine(
  m: import("../declarations/backend.did").Machine,
): MachineExtended {
  return {
    id: m.id,
    name: m.name,
    department: m.department,
    machineType: m.machineType,
    location: m.location,
    section: (m.section as MachineExtended["section"]) || "",
    availableWorkingHours: m.availableWorkingHours,
  };
}

function toBackendMachine(
  m: MachineExtended,
): import("../declarations/backend.did").Machine {
  return {
    id: m.id,
    name: m.name,
    department: m.department ?? "",
    machineType: m.machineType ?? "",
    location: m.location ?? "",
    section: m.section ?? "",
    availableWorkingHours: m.availableWorkingHours ?? 0,
  };
}

function fromBackendPMPlan(
  p: import("../declarations/backend.did").PMPlan,
): PMPlanExtended {
  return {
    id: p.id,
    machineId: p.machineId,
    month: p.month,
    frequency: p.frequency,
    checklistTemplateId: p.checklistTemplateId,
    scheduledDate: p.scheduledDate,
    notes: p.notes,
  };
}

function toBackendPMPlan(
  p: PMPlanExtended,
): import("../declarations/backend.did").PMPlan {
  return {
    id: p.id ?? `plan-${p.machineId}-${p.month}`,
    machineId: p.machineId,
    month: p.month,
    frequency: p.frequency ?? "",
    checklistTemplateId: p.checklistTemplateId ?? "",
    scheduledDate: p.scheduledDate ?? "",
    notes: p.notes ?? "",
  };
}

function fromBackendPMRecord(
  r: import("../declarations/backend.did").PMRecord,
): PMRecord {
  const rec: any = {
    id: r.id,
    machineId: r.machineId,
    operatorId: r.operatorId,
    operatorName: r.operatorName,
    completedDate: r.completedDate,
    checklistResults: r.checklistResults,
    status: r.status,
    spareUsed: r.spareUsed,
    submittedAt: r.submittedAt,
  };
  return rec as PMRecord;
}

function toBackendPMRecord(
  r: PMRecord,
): import("../declarations/backend.did").PMRecord {
  const rr = r as any;
  return {
    id: rr.id,
    machineId: rr.machineId,
    operatorId: rr.operatorId ?? "",
    operatorName: rr.operatorName,
    completedDate: rr.completedDate,
    checklistResults: (rr.checklistResults ?? []).map((c: any) => ({
      itemId: c.itemId ?? "",
      value: c.value ?? "",
      remark: c.remark ?? "",
      photoFilename: c.photoFilename ?? "",
    })),
    status: rr.status ?? "",
    spareUsed: (rr.spareUsed ?? []).map((s: any) => ({
      spareName: s.spareName ?? "",
      partSpec: s.partSpec ?? "",
      qty: s.qty ?? 0,
      unit: s.unit ?? "",
      cost: s.cost ?? 0,
    })),
    submittedAt: rr.submittedAt ?? numToBig(Date.now()),
  };
}

// ─── context type ─────────────────────────────────────────────────────────────

type AppContextType = {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  machines: MachineExtended[];
  pmPlans: PMPlanExtended[];
  checklistTemplates: ChecklistTemplate[];
  pmRecords: PMRecord[];
  addMachine: (m: MachineExtended) => void;
  updateMachine: (id: string, updates: Partial<MachineExtended>) => void;
  deleteMachine: (id: string) => void;
  addPMPlan: (p: PMPlan) => void;
  updatePMPlan: (
    machineId: string,
    month: bigint,
    updates: Partial<PMPlanExtended>,
  ) => void;
  deletePMPlan: (machineId: string, month: bigint) => void;
  addChecklistTemplate: (t: ChecklistTemplate) => void;
  updateChecklistTemplates: (templates: ChecklistTemplate[]) => void;
  submitRecord: (r: PMRecord) => void;
  approveRecord: (
    id: string,
    addToHistory?: boolean,
    historyRemarks?: string,
  ) => void;
  rejectRecord: (id: string) => void;
  getTemplateForMachine: (
    machine: MachineExtended,
  ) => ChecklistTemplate | undefined;
  isMachineCompleted: (machineId: string) => boolean;
  currentPage: PageName;
  navigate: (page: PageName, params?: NavParams) => void;
  navParams: NavParams;
  notifications: AppNotification[];
  addNotification: (message: string) => void;
  markAllNotificationsRead: () => void;
  getUsers: () => Record<string, UserRecord>;
  createUser: (
    username: string,
    password: string,
    name: string,
    role: "admin" | "operator",
  ) => boolean;
  updateUser: (
    username: string,
    updates: { password?: string; name?: string; role?: "admin" | "operator" },
  ) => void;
  deleteUser: (username: string) => void;
  breakdownRecords: BreakdownRecord[];
  capaRecords: CAPARecord[];
  historyCards: HistoryCardEntry[];
  submitBreakdown: (r: BreakdownRecord) => void;
  approveBreakdown: (
    id: string,
    classification: "Breakdown" | "Service",
    addToCapa: boolean,
    adminRemarks?: string,
    addToHistory?: boolean,
  ) => void;
  rejectBreakdown: (id: string) => void;
  updateBreakdown: (id: string, updates: Partial<BreakdownRecord>) => void;
  updateCapa: (id: string, updates: Partial<CAPARecord>) => void;
  addHistoryEntry: (entry: HistoryCardEntry) => void;
  updateHistoryEntry: (id: string, updates: Partial<HistoryCardEntry>) => void;
  deleteHistoryEntry: (id: string) => void;
  importBreakdownRecords: (records: BreakdownRecord[]) => void;
  importCapaRecords: (records: CAPARecord[]) => void;
  importHistoryEntries: (entries: HistoryCardEntry[]) => void;
  sectionHoursConfigs: SectionHoursConfig[];
  updateSectionHoursConfig: (
    section: string,
    updates: Partial<Omit<SectionHoursConfig, "section">>,
  ) => void;
  prioritizedMachineIds: string[];
  setPrioritizedMachines: (ids: string[]) => void;
  taskRecords: TaskRecord[];
  addTask: (task: TaskRecord) => void;
  updateTask: (id: string, updates: Partial<TaskRecord>) => void;
  deleteTask: (id: string) => void;
  importTasks: (records: TaskRecord[]) => void;
  bdTargets: BDTargets;
  updateBDTargets: (targets: Partial<BDTargets>) => void;
  // Kaizen
  kaizenRecords: KaizenRecord[];
  addKaizen: (k: KaizenRecord) => void;
  updateKaizen: (id: string, updates: Partial<KaizenRecord>) => void;
  // Predictive
  predictivePlans: PredictivePlan[];
  predictiveRecords: PredictiveRecord[];
  addPredictivePlan: (p: PredictivePlan) => void;
  updatePredictivePlan: (id: string, updates: Partial<PredictivePlan>) => void;
  deletePredictivePlan: (id: string) => void;
  submitPredictiveRecord: (r: PredictiveRecord) => void;
  approvePredictiveRecord: (id: string) => void;
  // Electricity
  electricityMeters: ElectricityMeter[];
  meterReadings: MeterReading[];
  addElectricityMeter: (m: ElectricityMeter) => void;
  updateElectricityMeter: (
    id: string,
    updates: Partial<ElectricityMeter>,
  ) => void;
  deleteElectricityMeter: (id: string) => void;
  addMeterReading: (r: MeterReading) => void;
  deleteMeterReading: (id: string) => void;
  // Logbook
  logbookCheckItems: LogbookCheckItem[];
  logbookEntries: LogbookEntry[];
  addLogbookCheckItem: (item: LogbookCheckItem) => void;
  updateLogbookCheckItem: (
    id: string,
    updates: Partial<LogbookCheckItem>,
  ) => void;
  deleteLogbookCheckItem: (id: string) => void;
  submitLogbookEntry: (entry: LogbookEntry) => void;
  // Spares
  spareItems: SpareItem[];
  addSpareItem: (item: SpareItem) => void;
  updateSpareItem: (id: string, updates: Partial<SpareItem>) => void;
  deleteSpareItem: (id: string) => void;
  importSpareItems: (items: SpareItem[]) => void;
  pmSpareUsage: PMSpareUsage[];
  addPMSpareUsage: (usage: PMSpareUsage) => void;
};

export type PageName =
  | "login"
  | "dashboard"
  | "checklist"
  | "admin"
  | "preventive"
  | "breakdown-panel"
  | "analysis"
  | "breakdown"
  | "capa"
  | "history"
  | "task-list"
  | "kaizen"
  | "predictive"
  | "electricity"
  | "logbook"
  | "spares";

export interface NavParams {
  machineId?: string;
  tab?: string;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── helper: fire-and-forget backend write with error swallow ─────────────────
async function callBackend<T>(
  fn: (actor: _SERVICE) => Promise<T>,
): Promise<T | undefined> {
  try {
    const actor = await getRawActor();
    return await fn(actor);
  } catch (err) {
    console.warn("[PMMS] backend call failed:", err);
    return undefined;
  }
}

// ─── AppProvider ──────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  // ── session ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as AppUser;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── data state ────────────────────────────────────────────────────────────
  const [machines, setMachines] = useState<MachineExtended[]>([]);
  const [pmPlans, setPmPlans] = useState<PMPlanExtended[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<
    ChecklistTemplate[]
  >([]);
  const [pmRecords, setPmRecords] = useState<PMRecord[]>([]);
  const [currentPage, setCurrentPage] = useState<PageName>(
    user ? "dashboard" : "login",
  );
  const [navParams, setNavParams] = useState<NavParams>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [breakdownRecords, setBreakdownRecords] = useState<BreakdownRecord[]>(
    [],
  );
  const [capaRecords, setCapaRecords] = useState<CAPARecord[]>([]);
  const [historyCards, setHistoryCards] = useState<HistoryCardEntry[]>([]);
  const [sectionHoursConfigs, setSectionHoursConfigs] = useState<
    SectionHoursConfig[]
  >(DEFAULT_SECTION_HOURS);
  const [prioritizedMachineIds, setPrioritizedMachineIds] = useState<string[]>(
    [],
  );
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [bdTargets, setBdTargets] = useState<BDTargets>(DEFAULT_BD_TARGETS);
  const [kaizenRecords, setKaizenRecords] = useState<KaizenRecord[]>([]);
  const [predictivePlans, setPredictivePlans] = useState<PredictivePlan[]>([]);
  const [predictiveRecords, setPredictiveRecords] = useState<
    PredictiveRecord[]
  >([]);
  const [electricityMeters, setElectricityMeters] = useState<
    ElectricityMeter[]
  >([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [logbookCheckItems, setLogbookCheckItems] = useState<
    LogbookCheckItem[]
  >([]);
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [spareItems, setSpareItems] = useState<SpareItem[]>([]);
  const [pmSpareUsage, setPmSpareUsage] = useState<PMSpareUsage[]>([]);
  // users cache - loaded from backend, kept in sync
  const [usersCache, setUsersCache] = useState<Record<string, UserRecord>>({});

  // ── initial data load from backend ───────────────────────────────────────
  useEffect(() => {
    if (dataLoaded) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const actor = await getRawActor();
        const [
          allMachines,
          allPmPlans,
          allTemplates,
          allPmRecords,
          allBreakdowns,
          allCapas,
          allHistory,
          allTasks,
          allKaizen,
          allPredPlans,
          allPredRecords,
          allMeters,
          allReadings,
          allLogbookItems,
          allLogbookEntries,
          allSpares,
          allSpareUsage,
          allSectionHours,
          allBdTargets,
          allPrioritized,
          allUsers,
        ] = await Promise.all([
          actor.getAllMachines().catch(() => [] as any[]),
          actor.getAllPMPlans().catch(() => [] as any[]),
          actor.getAllChecklistTemplates().catch(() => [] as any[]),
          actor.getAllPMRecords().catch(() => [] as any[]),
          actor.getAllBreakdownRecords().catch(() => [] as any[]),
          actor.getAllCAPARecords().catch(() => [] as any[]),
          actor.getAllHistoryEntries().catch(() => [] as any[]),
          actor.getAllTaskRecords().catch(() => [] as any[]),
          actor.getAllKaizenRecords().catch(() => [] as any[]),
          actor.getAllPredictivePlans().catch(() => [] as any[]),
          actor.getAllPredictiveRecords().catch(() => [] as any[]),
          actor.getAllElectricityMeters().catch(() => [] as any[]),
          actor.getAllMeterReadings().catch(() => [] as any[]),
          actor.getAllLogbookCheckItems().catch(() => [] as any[]),
          actor.getAllLogbookEntries().catch(() => [] as any[]),
          actor.getAllSpareItems().catch(() => [] as any[]),
          actor.getAllPMSpareUsage().catch(() => [] as any[]),
          actor.getAllSectionHoursConfigs().catch(() => [] as any[]),
          actor.getAllBDTargets().catch(() => [] as [string, any][]),
          actor.getPrioritizedMachines().catch(() => [] as string[]),
          actor.getAllUserRecords().catch(() => [] as any[]),
        ]);

        if (cancelled) return;

        setMachines(allMachines.map(fromBackendMachine));
        setPmPlans(allPmPlans.map(fromBackendPMPlan));
        setChecklistTemplates(allTemplates as ChecklistTemplate[]);
        setPmRecords(allPmRecords.map(fromBackendPMRecord));
        setBreakdownRecords(allBreakdowns.map(fromBackendBreakdown));
        setCapaRecords(allCapas.map(fromBackendCapa));
        setHistoryCards(allHistory.map(fromBackendHistory));
        setTaskRecords(allTasks.map(fromBackendTask));
        setKaizenRecords(allKaizen.map(fromBackendKaizen));
        setPredictivePlans(allPredPlans.map(fromBackendPredictivePlan));
        setPredictiveRecords(allPredRecords.map(fromBackendPredictiveRecord));
        setElectricityMeters(allMeters.map(fromBackendElectricityMeter));
        setMeterReadings(allReadings.map(fromBackendMeterReading));
        setLogbookCheckItems(allLogbookItems.map(fromBackendLogbookCheckItem));
        setLogbookEntries(allLogbookEntries.map(fromBackendLogbookEntry));
        setSpareItems(allSpares.map(fromBackendSpareItem));
        setPmSpareUsage(allSpareUsage.map(fromBackendPMSpareUsage));
        setPrioritizedMachineIds(allPrioritized);

        // Section hours
        if (allSectionHours.length > 0) {
          setSectionHoursConfigs(allSectionHours as SectionHoursConfig[]);
        }

        // Users cache
        if (allUsers.length > 0) {
          const map: Record<string, UserRecord> = {};
          for (const r of allUsers) {
            map[r.username.toLowerCase()] = {
              password: r.passwordHash,
              name: r.name,
              role: (r.role as "admin" | "operator") || "operator",
            };
          }
          setUsersCache(map);
        }

        // BD Targets: convert array of tuples to object
        if (allBdTargets.length > 0) {
          const obj: Partial<BDTargets> = {};
          for (const [section, targets] of allBdTargets) {
            (obj as any)[section] = targets;
          }
          setBdTargets({ ...DEFAULT_BD_TARGETS, ...obj });
        }
      } catch (err) {
        console.warn("[PMMS] initial data load failed:", err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setDataLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataLoaded]);

  // ── CAPA notification on login ────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only run on login
  useEffect(() => {
    if (!user) return;
    const openCapas = capaRecords.filter((c) => c.status === "Open");
    for (const capa of openCapas) {
      setNotifications((prev) => [
        {
          id: `capa-notif-${capa.id}-${Date.now()}`,
          message: `⚠️ CAPA Open — Machine ${capa.machineName}: fill permanent corrective action`,
          timestamp: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── session persistence ───────────────────────────────────────────────────
  useEffect(() => {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [user]);

  // ── login/logout ─────────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const actor = await getRawActor();
        const result = await actor.loginUser(username, btoa(password));
        const record = result.length > 0 ? result[0] : undefined;
        if (record) {
          const role: "admin" | "operator" =
            record.role === "admin" ? "admin" : "operator";
          setUser({ name: record.name, role, username: record.username });
          return true;
        }
        return false;
      } catch (err) {
        console.warn("[PMMS] login error:", err);
        return false;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setCurrentPage("login");
    setNavParams({});
  }, []);

  const navigate = useCallback((page: PageName, params: NavParams = {}) => {
    setCurrentPage(page);
    setNavParams(params);
  }, []);

  // ── user management (sync cache + async backend sync) ───────────────────
  const getUsers = useCallback((): Record<string, UserRecord> => {
    return usersCache;
  }, [usersCache]);

  const createUser = useCallback(
    (
      username: string,
      password: string,
      name: string,
      role: "admin" | "operator",
    ): boolean => {
      const key = username.toLowerCase();
      if (usersCache[key]) return false;
      const newUser: UserRecord = { password, name, role };
      setUsersCache((prev) => ({ ...prev, [key]: newUser }));
      callBackend((a) => a.createUser(username, btoa(password), name, role));
      return true;
    },
    [usersCache],
  );

  const updateUser = useCallback(
    (
      username: string,
      updates: {
        password?: string;
        name?: string;
        role?: "admin" | "operator";
      },
    ): void => {
      const key = username.toLowerCase();
      setUsersCache((prev) => {
        const cur = prev[key];
        if (!cur) return prev;
        const updated = { ...cur, ...updates };
        callBackend((a) =>
          a.updateUser(
            username,
            updates.password ? btoa(updates.password) : btoa(cur.password),
            updates.name ?? cur.name,
            updates.role ?? cur.role,
          ),
        );
        return { ...prev, [key]: updated };
      });
    },
    [],
  );

  const deleteUser = useCallback((username: string): void => {
    const key = username.toLowerCase();
    setUsersCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    callBackend((a) => a.deleteUser(username));
  }, []);

  // ── machines ──────────────────────────────────────────────────────────────
  const addMachine = useCallback((m: MachineExtended) => {
    setMachines((prev) => {
      const exists = prev.findIndex((x) => x.id === m.id);
      const next =
        exists >= 0 ? prev.map((x, i) => (i === exists ? m : x)) : [...prev, m];
      callBackend((a) => a.saveMachine(toBackendMachine(m)));
      return next;
    });
  }, []);

  const updateMachine = useCallback(
    (id: string, updates: Partial<MachineExtended>) => {
      setMachines((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
        const updated = next.find((m) => m.id === id);
        if (updated)
          callBackend((a) => a.saveMachine(toBackendMachine(updated)));
        return next;
      });
    },
    [],
  );

  const deleteMachine = useCallback((id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    callBackend((a) => a.deleteMachine(id));
  }, []);

  // ── PM plans ──────────────────────────────────────────────────────────────
  const addPMPlan = useCallback((p: PMPlan) => {
    const extended: PMPlanExtended = p;
    setPmPlans((prev) => {
      const exists = prev.findIndex(
        (x) => x.machineId === p.machineId && x.month === p.month,
      );
      const next =
        exists >= 0
          ? prev.map((x, i) => (i === exists ? extended : x))
          : [...prev, extended];
      callBackend((a) => a.savePMPlan(toBackendPMPlan(extended)));
      return next;
    });
  }, []);

  const updatePMPlan = useCallback(
    (machineId: string, month: bigint, updates: Partial<PMPlanExtended>) => {
      setPmPlans((prev) => {
        const next = prev.map((p) =>
          p.machineId === machineId && p.month === month
            ? { ...p, ...updates }
            : p,
        );
        const updated = next.find(
          (p) => p.machineId === machineId && p.month === month,
        );
        if (updated) callBackend((a) => a.savePMPlan(toBackendPMPlan(updated)));
        return next;
      });
    },
    [],
  );

  const deletePMPlan = useCallback((machineId: string, month: bigint) => {
    setPmPlans((prev) => {
      const toDelete = prev.find(
        (p) => p.machineId === machineId && p.month === month,
      );
      if (toDelete)
        callBackend((a) =>
          a.deletePMPlan(toDelete.id ?? `plan-${machineId}-${month}`),
        );
      return prev.filter(
        (p) => !(p.machineId === machineId && p.month === month),
      );
    });
  }, []);

  // ── checklist templates ───────────────────────────────────────────────────
  const addChecklistTemplate = useCallback((t: ChecklistTemplate) => {
    setChecklistTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      const next =
        idx >= 0 ? prev.map((x, i) => (i === idx ? t : x)) : [...prev, t];
      callBackend((a) => a.saveChecklistTemplate(t));
      return next;
    });
  }, []);

  const updateChecklistTemplates = useCallback(
    (templates: ChecklistTemplate[]) => {
      setChecklistTemplates(templates);
      for (const t of templates) {
        callBackend((a) => a.saveChecklistTemplate(t));
      }
    },
    [],
  );

  // ── PM records ────────────────────────────────────────────────────────────
  const submitRecord = useCallback((r: PMRecord) => {
    const pendingRecord: PMRecord = { ...r, status: "pending-approval" };
    setPmRecords((prev) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const rejectedIdx = prev.findIndex(
        (rec) =>
          rec.machineId === r.machineId &&
          rec.status === "rejected" &&
          Number(rec.completedDate) >= todayStart.getTime(),
      );
      const next =
        rejectedIdx >= 0
          ? prev.map((rec, i) => (i === rejectedIdx ? pendingRecord : rec))
          : [...prev, pendingRecord];
      callBackend((a) => a.savePMRecord(toBackendPMRecord(pendingRecord)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        message: `🔔 New Submission — ${r.machineId} checklist submitted by ${r.operatorName}. Awaiting approval.`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const approveRecord = useCallback(
    (id: string, addToHistory = false, historyRemarks = "") => {
      setPmRecords((prev) => {
        const record = prev.find((r) => r.id === id);
        if (addToHistory && record) {
          const entry: HistoryCardEntry = {
            id: `hist-pm-${Date.now()}`,
            machineId: record.machineId,
            date: new Date(Number(record.completedDate))
              .toISOString()
              .split("T")[0],
            eventType: "PM",
            problemDescription: "Preventive Maintenance performed",
            actionTaken: historyRemarks || "PM checklist completed",
            doneBy: record.operatorName,
            remarks: historyRemarks,
            sourceId: record.id,
            createdAt: Date.now(),
          };
          setHistoryCards((h) => {
            const next = [...h, entry];
            callBackend((a) => a.saveHistoryEntry(toBackendHistory(entry)));
            return next;
          });
        }
        const next = prev.map((r) =>
          r.id === id ? { ...r, status: "completed" } : r,
        );
        const updated = next.find((r) => r.id === id);
        if (updated)
          callBackend((a) => a.savePMRecord(toBackendPMRecord(updated)));
        return next;
      });
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          message: `✅ PM Approved — record ${id} has been approved by Admin.`,
          timestamp: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    },
    [],
  );

  const rejectRecord = useCallback((id: string) => {
    setPmRecords((prev) => {
      const next = prev.map((r) =>
        r.id === id ? { ...r, status: "rejected" } : r,
      );
      const updated = next.find((r) => r.id === id);
      if (updated)
        callBackend((a) => a.savePMRecord(toBackendPMRecord(updated)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        message: "❌ PM Rejected. Operator can now resubmit for approval.",
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const addNotification = useCallback((message: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random()}`,
        message,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getTemplateForMachine = useCallback(
    (machine: MachineExtended): ChecklistTemplate | undefined => {
      const byId = checklistTemplates.find(
        (t) => t.id === `tmpl-${machine.id.toLowerCase().replace(/\s+/g, "-")}`,
      );
      if (byId) return byId;
      const currentMonth = BigInt(new Date().getMonth() + 1);
      const plan = pmPlans.find(
        (p) => p.machineId === machine.id && p.month === currentMonth,
      );
      if (plan) {
        const byPlan = checklistTemplates.find(
          (t) => t.id === plan.checklistTemplateId,
        );
        if (byPlan) return byPlan;
      }
      const byName = checklistTemplates.find(
        (t) => t.machineType === machine.name,
      );
      if (byName) return byName;
      return (
        checklistTemplates.find((t) => t.machineType === machine.machineType) ??
        checklistTemplates.find((t) => t.machineType === "General")
      );
    },
    [pmPlans, checklistTemplates],
  );

  const isMachineCompleted = useCallback(
    (machineId: string): boolean => {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime();
      return pmRecords.some(
        (r) =>
          r.machineId === machineId &&
          r.status === "completed" &&
          Number(r.completedDate) >= todayStart,
      );
    },
    [pmRecords],
  );

  // ── breakdown ─────────────────────────────────────────────────────────────
  const submitBreakdown = useCallback((r: BreakdownRecord) => {
    setBreakdownRecords((prev) => {
      const next = [...prev, r];
      callBackend((a) => a.saveBreakdownRecord(toBackendBreakdown(r)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-bd-${Date.now()}`,
        message: `🔧 Breakdown Slip — ${r.machineName} breakdown submitted by ${r.operatorName}. Awaiting approval.`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const approveBreakdown = useCallback(
    (
      id: string,
      classification: "Breakdown" | "Service",
      addToCapa: boolean,
      adminRemarks = "",
      addToHistory = false,
    ) => {
      setBreakdownRecords((prev) => {
        const record = prev.find((r) => r.id === id);
        if (!record) return prev;
        const isBreakdown = classification === "Breakdown";
        const autoHistory = isBreakdown && record.durationMinutes > 60;
        const shouldAddHistory = autoHistory || (isBreakdown && addToHistory);
        const createCapa =
          isBreakdown && (record.durationMinutes > 60 || addToCapa);

        if (createCapa) {
          const capa: CAPARecord = {
            id: `capa-${Date.now()}`,
            breakdownId: id,
            machineId: record.machineId,
            machineName: record.machineName,
            date: record.date,
            problemSummary: record.problemDescription,
            rootCause: "",
            temporaryAction: record.temporaryAction,
            permanentAction: "",
            responsiblePerson: "",
            targetDate: "",
            status: "Open",
            createdAt: Date.now(),
          };
          setCapaRecords((c) => {
            const next = [...c, capa];
            callBackend((a) => a.saveCAPARecord(toBackendCapa(capa)));
            return next;
          });
          setNotifications((n) => [
            {
              id: `notif-capa-${Date.now()}`,
              message: `⚠️ CAPA Created — Machine ${record.machineName}: fill permanent corrective action`,
              timestamp: Date.now(),
              read: false,
            },
            ...n,
          ]);
        }

        if (shouldAddHistory) {
          const entry: HistoryCardEntry = {
            id: `hist-bd-${Date.now()}`,
            machineId: record.machineId,
            machineName: record.machineName,
            date: record.date,
            eventType: "Breakdown",
            durationMinutes: record.durationMinutes,
            problemDescription: record.problemDescription,
            actionTaken: record.temporaryAction,
            doneBy: record.operatorName,
            remarks: adminRemarks,
            sourceId: id,
            createdAt: Date.now(),
          };
          setHistoryCards((h) => {
            const next = [...h, entry];
            callBackend((a) => a.saveHistoryEntry(toBackendHistory(entry)));
            return next;
          });
        }

        const newStatus = isBreakdown
          ? "approved-breakdown"
          : "approved-service";
        const next: BreakdownRecord[] = prev.map(
          (r): BreakdownRecord =>
            r.id === id
              ? {
                  ...r,
                  status: newStatus as BreakdownRecord["status"],
                  isInCapa: createCapa,
                  isInHistory: shouldAddHistory,
                  adminRemarks,
                }
              : r,
        );
        const updated = next.find((r) => r.id === id);
        if (updated)
          callBackend((a) =>
            a.saveBreakdownRecord(toBackendBreakdown(updated)),
          );
        return next;
      });
      setNotifications((prev) => [
        {
          id: `notif-bd-appr-${Date.now()}`,
          message: `✅ Breakdown Approved — classified as ${classification}.`,
          timestamp: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    },
    [],
  );

  const rejectBreakdown = useCallback((id: string) => {
    setBreakdownRecords((prev) => {
      const next = prev.map(
        (r): BreakdownRecord =>
          r.id === id ? { ...r, status: "rejected" as const } : r,
      );
      const updated = next.find((r) => r.id === id);
      if (updated)
        callBackend((a) => a.saveBreakdownRecord(toBackendBreakdown(updated)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-bd-rej-${Date.now()}`,
        message: "❌ Breakdown Rejected — operator can resubmit.",
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const updateBreakdown = useCallback(
    (id: string, updates: Partial<BreakdownRecord>) => {
      setBreakdownRecords((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        const updated = next.find((r) => r.id === id);
        if (updated)
          callBackend((a) =>
            a.saveBreakdownRecord(
              toBackendBreakdown(updated as BreakdownRecord),
            ),
          );
        return next;
      });
    },
    [],
  );

  // ── CAPA ──────────────────────────────────────────────────────────────────
  const updateCapa = useCallback((id: string, updates: Partial<CAPARecord>) => {
    setCapaRecords((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        if (updates.status === "Closed" && !c.closedAt) {
          updated.closedAt = Date.now();
          setNotifications((n) => [
            {
              id: `notif-capa-closed-${Date.now()}`,
              message: `✅ CAPA Closed — Machine ${c.machineName}: permanent action filled and closed.`,
              timestamp: Date.now(),
              read: false,
            },
            ...n,
          ]);
        }
        callBackend((a) => a.saveCAPARecord(toBackendCapa(updated)));
        return updated;
      }),
    );
  }, []);

  // ── history cards ─────────────────────────────────────────────────────────
  const addHistoryEntry = useCallback((entry: HistoryCardEntry) => {
    setHistoryCards((prev) => {
      const next = [...prev, entry];
      callBackend((a) => a.saveHistoryEntry(toBackendHistory(entry)));
      return next;
    });
  }, []);

  const updateHistoryEntry = useCallback(
    (id: string, updates: Partial<HistoryCardEntry>) => {
      setHistoryCards((prev) => {
        const next = prev.map((h) => (h.id === id ? { ...h, ...updates } : h));
        const updated = next.find((h) => h.id === id);
        if (updated)
          callBackend((a) => a.saveHistoryEntry(toBackendHistory(updated)));
        return next;
      });
    },
    [],
  );

  const deleteHistoryEntry = useCallback((id: string) => {
    setHistoryCards((prev) => prev.filter((h) => h.id !== id));
    callBackend((a) => a.deleteHistoryEntry(id));
  }, []);

  const importBreakdownRecords = useCallback((records: BreakdownRecord[]) => {
    setBreakdownRecords((prev) => {
      const next = [...prev, ...records];
      for (const r of records)
        callBackend((a) => a.saveBreakdownRecord(toBackendBreakdown(r)));
      return next;
    });
  }, []);

  const importCapaRecords = useCallback((records: CAPARecord[]) => {
    setCapaRecords((prev) => {
      const next = [...prev, ...records];
      for (const r of records)
        callBackend((a) => a.saveCAPARecord(toBackendCapa(r)));
      return next;
    });
  }, []);

  const importHistoryEntries = useCallback((entries: HistoryCardEntry[]) => {
    setHistoryCards((prev) => {
      const next = [...prev, ...entries];
      for (const e of entries)
        callBackend((a) => a.saveHistoryEntry(toBackendHistory(e)));
      return next;
    });
  }, []);

  // ── section hours ─────────────────────────────────────────────────────────
  const updateSectionHoursConfig = useCallback(
    (
      section: string,
      updates: Partial<Omit<SectionHoursConfig, "section">>,
    ) => {
      setSectionHoursConfigs((prev) => {
        const next = prev.map((c) =>
          c.section === section ? { ...c, ...updates } : c,
        );
        const updated = next.find((c) => c.section === section);
        if (updated) callBackend((a) => a.saveSectionHoursConfig(updated));
        return next;
      });
    },
    [],
  );

  // ── prioritized machines ──────────────────────────────────────────────────
  const setPrioritizedMachines = useCallback((ids: string[]) => {
    setPrioritizedMachineIds(ids);
    callBackend((a) => a.setPrioritizedMachines(ids));
  }, []);

  // ── tasks ─────────────────────────────────────────────────────────────────
  const addTask = useCallback((task: TaskRecord) => {
    setTaskRecords((prev) => {
      const next = [...prev, task];
      callBackend((a) => a.saveTaskRecord(toBackendTask(task)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-task-${Date.now()}`,
        message: `📋 New task assigned to ${task.assignedTo}: "${task.title}"`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<TaskRecord>) => {
    setTaskRecords((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const updated = next.find((t) => t.id === id);
      if (updated) callBackend((a) => a.saveTaskRecord(toBackendTask(updated)));
      return next;
    });
    if (updates.status) {
      setNotifications((prev) => [
        {
          id: `notif-task-upd-${Date.now()}`,
          message: `🔄 Task status updated to "${updates.status}"`,
          timestamp: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    }
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTaskRecords((prev) => prev.filter((t) => t.id !== id));
    callBackend((a) => a.deleteTaskRecord(id));
  }, []);

  const importTasks = useCallback((records: TaskRecord[]) => {
    setTaskRecords((prev) => {
      const next = [...prev, ...records];
      for (const r of records)
        callBackend((a) => a.saveTaskRecord(toBackendTask(r)));
      return next;
    });
  }, []);

  // ── BD targets ────────────────────────────────────────────────────────────
  const updateBDTargets = useCallback((targets: Partial<BDTargets>) => {
    setBdTargets((prev) => {
      const next = { ...prev, ...targets };
      for (const [section, vals] of Object.entries(targets)) {
        callBackend((a) => a.saveBDTarget(section, vals as any));
      }
      return next;
    });
  }, []);

  // ── kaizen ────────────────────────────────────────────────────────────────
  const addKaizen = useCallback((k: KaizenRecord) => {
    setKaizenRecords((prev) => {
      const next = [...prev, k];
      callBackend((a) => a.saveKaizenRecord(toBackendKaizen(k)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-kaizen-${Date.now()}`,
        message: `💡 New Kaizen submitted by ${k.submittedBy}: "${k.title}" — awaiting approval.`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const updateKaizen = useCallback(
    (id: string, updates: Partial<KaizenRecord>) => {
      setKaizenRecords((prev) => {
        const next = prev.map((k) => (k.id === id ? { ...k, ...updates } : k));
        const updated = next.find((k) => k.id === id);
        if (updated)
          callBackend((a) => a.saveKaizenRecord(toBackendKaizen(updated)));
        return next;
      });
    },
    [],
  );

  // ── predictive ────────────────────────────────────────────────────────────
  const addPredictivePlan = useCallback((p: PredictivePlan) => {
    setPredictivePlans((prev) => {
      const next = [...prev, p];
      callBackend((a) => a.savePredictivePlan(toBackendPredictivePlan(p)));
      return next;
    });
  }, []);

  const updatePredictivePlan = useCallback(
    (id: string, updates: Partial<PredictivePlan>) => {
      setPredictivePlans((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        const updated = next.find((p) => p.id === id);
        if (updated)
          callBackend((a) =>
            a.savePredictivePlan(toBackendPredictivePlan(updated)),
          );
        return next;
      });
    },
    [],
  );

  const deletePredictivePlan = useCallback((id: string) => {
    setPredictivePlans((prev) => prev.filter((p) => p.id !== id));
    callBackend((a) => a.deletePredictivePlan(id));
  }, []);

  const submitPredictiveRecord = useCallback((r: PredictiveRecord) => {
    setPredictiveRecords((prev) => {
      const next = [...prev, r];
      callBackend((a) => a.savePredictiveRecord(toBackendPredictiveRecord(r)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-pdm-${Date.now()}`,
        message: `📊 Predictive reading submitted for ${r.machineName}`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const approvePredictiveRecord = useCallback((id: string) => {
    setPredictiveRecords((prev) => {
      const next = prev.map(
        (r): PredictiveRecord =>
          r.id === id ? { ...r, status: "completed" as const } : r,
      );
      const updated = next.find((r) => r.id === id);
      if (updated)
        callBackend((a) =>
          a.savePredictiveRecord(toBackendPredictiveRecord(updated)),
        );
      return next;
    });
  }, []);

  // ── electricity ───────────────────────────────────────────────────────────
  const addElectricityMeter = useCallback((m: ElectricityMeter) => {
    setElectricityMeters((prev) => {
      const next = [...prev, m];
      callBackend((a) => a.saveElectricityMeter(toBackendElectricityMeter(m)));
      return next;
    });
  }, []);

  const updateElectricityMeter = useCallback(
    (id: string, updates: Partial<ElectricityMeter>) => {
      setElectricityMeters((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
        const updated = next.find((m) => m.id === id);
        if (updated)
          callBackend((a) =>
            a.saveElectricityMeter(toBackendElectricityMeter(updated)),
          );
        return next;
      });
    },
    [],
  );

  const deleteElectricityMeter = useCallback((id: string) => {
    setElectricityMeters((prev) => prev.filter((m) => m.id !== id));
    callBackend((a) => a.deleteElectricityMeter(id));
  }, []);

  const addMeterReading = useCallback((r: MeterReading) => {
    setMeterReadings((prev) => {
      const next = [...prev, r];
      callBackend((a) => a.saveMeterReading(toBackendMeterReading(r)));
      return next;
    });
  }, []);

  const deleteMeterReading = useCallback((id: string) => {
    setMeterReadings((prev) => prev.filter((r) => r.id !== id));
    callBackend((a) => a.deleteMeterReading(id));
  }, []);

  // ── logbook ───────────────────────────────────────────────────────────────
  const addLogbookCheckItem = useCallback((item: LogbookCheckItem) => {
    setLogbookCheckItems((prev) => {
      const next = [...prev, item];
      callBackend((a) =>
        a.saveLogbookCheckItem(toBackendLogbookCheckItem(item)),
      );
      return next;
    });
  }, []);

  const updateLogbookCheckItem = useCallback(
    (id: string, updates: Partial<LogbookCheckItem>) => {
      setLogbookCheckItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...updates } : i));
        const updated = next.find((i) => i.id === id);
        if (updated)
          callBackend((a) =>
            a.saveLogbookCheckItem(toBackendLogbookCheckItem(updated)),
          );
        return next;
      });
    },
    [],
  );

  const deleteLogbookCheckItem = useCallback((id: string) => {
    setLogbookCheckItems((prev) => prev.filter((i) => i.id !== id));
    callBackend((a) => a.deleteLogbookCheckItem(id));
  }, []);

  const submitLogbookEntry = useCallback((entry: LogbookEntry) => {
    setLogbookEntries((prev) => {
      const next = [...prev, entry];
      callBackend((a) => a.saveLogbookEntry(toBackendLogbookEntry(entry)));
      return next;
    });
    setNotifications((prev) => [
      {
        id: `notif-logbook-${Date.now()}`,
        message: `📓 Logbook entry submitted by ${entry.operatorName} for ${entry.date}`,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  // ── spares ────────────────────────────────────────────────────────────────
  const addSpareItem = useCallback((item: SpareItem) => {
    setSpareItems((prev) => {
      const next = [...prev, item];
      callBackend((a) => a.saveSpareItem(toBackendSpareItem(item)));
      return next;
    });
  }, []);

  const updateSpareItem = useCallback(
    (id: string, updates: Partial<SpareItem>) => {
      setSpareItems((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        const updated = next.find((s) => s.id === id);
        if (updated)
          callBackend((a) => a.saveSpareItem(toBackendSpareItem(updated)));
        return next;
      });
    },
    [],
  );

  const deleteSpareItem = useCallback((id: string) => {
    setSpareItems((prev) => prev.filter((s) => s.id !== id));
    callBackend((a) => a.deleteSpareItem(id));
  }, []);

  const importSpareItems = useCallback((items: SpareItem[]) => {
    setSpareItems((prev) => {
      const next = [...prev, ...items];
      for (const item of items)
        callBackend((a) => a.saveSpareItem(toBackendSpareItem(item)));
      return next;
    });
  }, []);

  const addPMSpareUsage = useCallback((usage: PMSpareUsage) => {
    setPmSpareUsage((prev) => {
      const next = [...prev, usage];
      callBackend((a) => a.savePMSpareUsage(toBackendPMSpareUsage(usage)));
      return next;
    });
  }, []);

  // ── loading screen ────────────────────────────────────────────────────────
  if (isLoading && !dataLoaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "oklch(0.165 0.022 252)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          color: "oklch(0.88 0.010 260)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "3px solid oklch(0.70 0.188 55 / 0.3)",
            borderTopColor: "oklch(0.70 0.188 55)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Plant Maintenance Management System
          </div>
          <div style={{ color: "oklch(0.65 0.010 260)", fontSize: "0.875rem" }}>
            Loading data from server...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        machines,
        pmPlans,
        checklistTemplates,
        pmRecords,
        addMachine,
        updateMachine,
        deleteMachine,
        addPMPlan,
        updatePMPlan,
        deletePMPlan,
        addChecklistTemplate,
        updateChecklistTemplates,
        submitRecord,
        approveRecord,
        rejectRecord,
        getTemplateForMachine,
        isMachineCompleted,
        currentPage,
        navigate,
        navParams,
        notifications,
        addNotification,
        markAllNotificationsRead,
        getUsers,
        createUser,
        updateUser,
        deleteUser,
        breakdownRecords,
        capaRecords,
        historyCards,
        submitBreakdown,
        approveBreakdown,
        rejectBreakdown,
        updateBreakdown,
        updateCapa,
        addHistoryEntry,
        updateHistoryEntry,
        deleteHistoryEntry,
        importBreakdownRecords,
        importCapaRecords,
        importHistoryEntries,
        sectionHoursConfigs,
        updateSectionHoursConfig,
        prioritizedMachineIds,
        setPrioritizedMachines,
        taskRecords,
        addTask,
        updateTask,
        deleteTask,
        importTasks,
        bdTargets,
        updateBDTargets,
        kaizenRecords,
        addKaizen,
        updateKaizen,
        predictivePlans,
        predictiveRecords,
        addPredictivePlan,
        updatePredictivePlan,
        deletePredictivePlan,
        submitPredictiveRecord,
        approvePredictiveRecord,
        electricityMeters,
        meterReadings,
        addElectricityMeter,
        updateElectricityMeter,
        deleteElectricityMeter,
        addMeterReading,
        deleteMeterReading,
        logbookCheckItems,
        logbookEntries,
        addLogbookCheckItem,
        updateLogbookCheckItem,
        deleteLogbookCheckItem,
        submitLogbookEntry,
        spareItems,
        addSpareItem,
        updateSpareItem,
        deleteSpareItem,
        importSpareItems,
        pmSpareUsage,
        addPMSpareUsage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
