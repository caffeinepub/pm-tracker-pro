import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ChecklistTemplate, Machine, PMPlan, PMRecord } from "../backend";
import {
  DEMO_CHECKLIST_TEMPLATES,
  DEMO_MACHINES,
  DEMO_PM_PLANS,
  DEMO_PM_RECORDS,
} from "../data/demoData";

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

export interface PMPlanExtended extends PMPlan {
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

const DEFAULT_BD_TARGETS: BDTargets = {
  "Powder Coating": { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  "Machine Shop": { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  Utility: { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
  Overall: { bdPct: 5, mttr: 60, mtbf: 500, uptime: 95 },
};

const MACHINES_KEY = "pm_tracker_machines";
const PRIORITIZED_KEY = "pm_tracker_prioritized_machines";
const USERS_STORAGE_KEY = "pm_tracker_users";
const SESSION_KEY = "pm_tracker_session";
const HISTORY_KEY = "pm_tracker_history";
const BREAKDOWN_KEY = "pm_tracker_breakdowns";
const CAPA_KEY = "pm_tracker_capa";
const SECTION_HOURS_KEY = "pm_tracker_section_hours";
const TASKS_KEY = "pm_tracker_tasks";
const BD_TARGETS_KEY = "pm_tracker_bd_targets";
const KAIZEN_KEY = "pm_tracker_kaizen";
const PREDICTIVE_PLANS_KEY = "pm_tracker_predictive_plans";
const PREDICTIVE_RECORDS_KEY = "pm_tracker_predictive_records";
const ELECTRICITY_METERS_KEY = "pm_tracker_electricity_meters";
const METER_READINGS_KEY = "pm_tracker_meter_readings";
const LOGBOOK_ITEMS_KEY = "pm_tracker_logbook_items";
const LOGBOOK_ENTRIES_KEY = "pm_tracker_logbook_entries";
const SPARES_KEY = "pm_tracker_spares";
const PM_SPARE_USAGE_KEY = "pm_tracker_pm_spare_usage";

const DEFAULT_SECTION_HOURS: SectionHoursConfig[] = [
  { section: "Powder Coating", availableProductionHrs: 2000, powerOff: 0 },
  { section: "Machine Shop", availableProductionHrs: 2000, powerOff: 0 },
  { section: "Utility", availableProductionHrs: 2000, powerOff: 0 },
];
const DEFAULT_USERS: Record<string, UserRecord> = {
  admin: { password: "admin123", name: "Admin User", role: "admin" },
};

function loadUsers(): Record<string, UserRecord> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, UserRecord>;
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_USERS };
}

function saveUsers(users: Record<string, UserRecord>) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

type AppContextType = {
  user: AppUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as AppUser;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [machines, setMachines] = useState<MachineExtended[]>(() => {
    try {
      const r = localStorage.getItem(MACHINES_KEY);
      if (r) return JSON.parse(r) as MachineExtended[];
    } catch {}
    return DEMO_MACHINES as MachineExtended[];
  });
  const [pmPlans, setPmPlans] = useState<PMPlanExtended[]>(
    DEMO_PM_PLANS as PMPlanExtended[],
  );
  const [checklistTemplates, setChecklistTemplates] = useState<
    ChecklistTemplate[]
  >(DEMO_CHECKLIST_TEMPLATES);
  const [pmRecords, setPmRecords] = useState<PMRecord[]>(DEMO_PM_RECORDS);
  const [currentPage, setCurrentPage] = useState<PageName>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return "dashboard";
    } catch {}
    return "login";
  });
  const [navParams, setNavParams] = useState<NavParams>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [breakdownRecords, setBreakdownRecords] = useState<BreakdownRecord[]>(
    () => {
      try {
        const r = localStorage.getItem(BREAKDOWN_KEY);
        if (r) {
          const parsed = JSON.parse(r);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    },
  );
  const [capaRecords, setCapaRecords] = useState<CAPARecord[]>(() => {
    try {
      const r = localStorage.getItem(CAPA_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [historyCards, setHistoryCards] = useState<HistoryCardEntry[]>(() => {
    try {
      const r = localStorage.getItem(HISTORY_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [sectionHoursConfigs, setSectionHoursConfigs] = useState<
    SectionHoursConfig[]
  >(() => {
    try {
      const r = localStorage.getItem(SECTION_HOURS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return DEFAULT_SECTION_HOURS;
  });
  const [prioritizedMachineIds, setPrioritizedMachineIds] = useState<string[]>(
    () => {
      try {
        const r = localStorage.getItem(PRIORITIZED_KEY);
        if (r) return JSON.parse(r) as string[];
      } catch {}
      return [];
    },
  );
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>(() => {
    try {
      const r = localStorage.getItem(TASKS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [bdTargets, setBdTargets] = useState<BDTargets>(() => {
    try {
      const r = localStorage.getItem(BD_TARGETS_KEY);
      if (r) return { ...DEFAULT_BD_TARGETS, ...JSON.parse(r) };
    } catch {}
    return DEFAULT_BD_TARGETS;
  });
  const [kaizenRecords, setKaizenRecords] = useState<KaizenRecord[]>(() => {
    try {
      const r = localStorage.getItem(KAIZEN_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [predictivePlans, setPredictivePlans] = useState<PredictivePlan[]>(
    () => {
      try {
        const r = localStorage.getItem(PREDICTIVE_PLANS_KEY);
        if (r) {
          const parsed = JSON.parse(r);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    },
  );
  const [predictiveRecords, setPredictiveRecords] = useState<
    PredictiveRecord[]
  >(() => {
    try {
      const r = localStorage.getItem(PREDICTIVE_RECORDS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [electricityMeters, setElectricityMeters] = useState<
    ElectricityMeter[]
  >(() => {
    try {
      const r = localStorage.getItem(ELECTRICITY_METERS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>(() => {
    try {
      const r = localStorage.getItem(METER_READINGS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [logbookCheckItems, setLogbookCheckItems] = useState<
    LogbookCheckItem[]
  >(() => {
    try {
      const r = localStorage.getItem(LOGBOOK_ITEMS_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>(() => {
    try {
      const r = localStorage.getItem(LOGBOOK_ENTRIES_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });

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

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);
  useEffect(() => {
    localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
  }, [machines]);
  useEffect(() => {
    localStorage.setItem(
      PRIORITIZED_KEY,
      JSON.stringify(prioritizedMachineIds),
    );
  }, [prioritizedMachineIds]);
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyCards));
  }, [historyCards]);
  useEffect(() => {
    localStorage.setItem(BREAKDOWN_KEY, JSON.stringify(breakdownRecords));
  }, [breakdownRecords]);
  useEffect(() => {
    localStorage.setItem(CAPA_KEY, JSON.stringify(capaRecords));
  }, [capaRecords]);
  useEffect(() => {
    localStorage.setItem(
      SECTION_HOURS_KEY,
      JSON.stringify(sectionHoursConfigs),
    );
  }, [sectionHoursConfigs]);
  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskRecords));
  }, [taskRecords]);
  useEffect(() => {
    localStorage.setItem(BD_TARGETS_KEY, JSON.stringify(bdTargets));
  }, [bdTargets]);
  useEffect(() => {
    localStorage.setItem(KAIZEN_KEY, JSON.stringify(kaizenRecords));
  }, [kaizenRecords]);
  useEffect(() => {
    localStorage.setItem(PREDICTIVE_PLANS_KEY, JSON.stringify(predictivePlans));
  }, [predictivePlans]);
  useEffect(() => {
    localStorage.setItem(
      PREDICTIVE_RECORDS_KEY,
      JSON.stringify(predictiveRecords),
    );
  }, [predictiveRecords]);
  useEffect(() => {
    localStorage.setItem(
      ELECTRICITY_METERS_KEY,
      JSON.stringify(electricityMeters),
    );
  }, [electricityMeters]);
  useEffect(() => {
    localStorage.setItem(METER_READINGS_KEY, JSON.stringify(meterReadings));
  }, [meterReadings]);
  useEffect(() => {
    localStorage.setItem(LOGBOOK_ITEMS_KEY, JSON.stringify(logbookCheckItems));
  }, [logbookCheckItems]);
  useEffect(() => {
    localStorage.setItem(LOGBOOK_ENTRIES_KEY, JSON.stringify(logbookEntries));
  }, [logbookEntries]);
  const [spareItems, setSpareItems] = useState<SpareItem[]>(() => {
    try {
      const r = localStorage.getItem(SPARES_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [pmSpareUsage, setPmSpareUsage] = useState<PMSpareUsage[]>(() => {
    try {
      const r = localStorage.getItem(PM_SPARE_USAGE_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem(SPARES_KEY, JSON.stringify(spareItems));
  }, [spareItems]);
  useEffect(() => {
    localStorage.setItem(PM_SPARE_USAGE_KEY, JSON.stringify(pmSpareUsage));
  }, [pmSpareUsage]);

  const login = useCallback((username: string, password: string): boolean => {
    const users = loadUsers();
    const cred = users[username.toLowerCase()];
    if (cred && cred.password === password) {
      setUser({ name: cred.name, role: cred.role, username });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCurrentPage("login");
    setNavParams({});
  }, []);

  const navigate = useCallback((page: PageName, params: NavParams = {}) => {
    setCurrentPage(page);
    setNavParams(params);
  }, []);

  const getUsers = useCallback(
    (): Record<string, UserRecord> => loadUsers(),
    [],
  );

  const createUser = useCallback(
    (
      username: string,
      password: string,
      name: string,
      role: "admin" | "operator",
    ): boolean => {
      const users = loadUsers();
      const key = username.toLowerCase();
      if (users[key]) return false;
      users[key] = { password, name, role };
      saveUsers(users);
      return true;
    },
    [],
  );

  const updateUser = useCallback(
    (
      username: string,
      updates: {
        password?: string;
        name?: string;
        role?: "admin" | "operator";
      },
    ) => {
      const users = loadUsers();
      const key = username.toLowerCase();
      if (!users[key]) return;
      users[key] = { ...users[key], ...updates };
      saveUsers(users);
    },
    [],
  );

  const deleteUser = useCallback((username: string) => {
    const users = loadUsers();
    delete users[username.toLowerCase()];
    saveUsers(users);
  }, []);

  const addMachine = useCallback((m: MachineExtended) => {
    setMachines((prev) => {
      const exists = prev.findIndex((x) => x.id === m.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = m;
        return updated;
      }
      return [...prev, m];
    });
  }, []);

  const updateMachine = useCallback(
    (id: string, updates: Partial<MachineExtended>) => {
      setMachines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    },
    [],
  );

  const deleteMachine = useCallback((id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addPMPlan = useCallback((p: PMPlan) => {
    setPmPlans((prev) => {
      const exists = prev.findIndex(
        (x) => x.machineId === p.machineId && x.month === p.month,
      );
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = p;
        return updated;
      }
      return [...prev, p];
    });
  }, []);

  const updatePMPlan = useCallback(
    (machineId: string, month: bigint, updates: Partial<PMPlanExtended>) => {
      setPmPlans((prev) =>
        prev.map((p) =>
          p.machineId === machineId && p.month === month
            ? { ...p, ...updates }
            : p,
        ),
      );
    },
    [],
  );

  const deletePMPlan = useCallback((machineId: string, month: bigint) => {
    setPmPlans((prev) =>
      prev.filter((p) => !(p.machineId === machineId && p.month === month)),
    );
  }, []);

  const addChecklistTemplate = useCallback((t: ChecklistTemplate) => {
    setChecklistTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = t;
        return updated;
      }
      return [...prev, t];
    });
  }, []);

  const updateChecklistTemplates = useCallback(
    (templates: ChecklistTemplate[]) => {
      setChecklistTemplates(templates);
    },
    [],
  );

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
      if (rejectedIdx >= 0) {
        const updated = [...prev];
        updated[rejectedIdx] = pendingRecord;
        return updated;
      }
      return [...prev, pendingRecord];
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
          setHistoryCards((h) => [...h, entry]);
        }
        return prev.map((r) =>
          r.id === id ? { ...r, status: "completed" } : r,
        );
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
    setPmRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
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

  const submitBreakdown = useCallback((r: BreakdownRecord) => {
    setBreakdownRecords((prev) => [...prev, r]);
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
          setCapaRecords((c) => [...c, capa]);
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
          setHistoryCards((h) => [...h, entry]);
        }
        const newStatus = isBreakdown
          ? "approved-breakdown"
          : "approved-service";
        return prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: newStatus,
                isInCapa: createCapa,
                isInHistory: shouldAddHistory,
                adminRemarks,
              }
            : r,
        );
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
    setBreakdownRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
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
      setBreakdownRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [],
  );

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
        return updated;
      }),
    );
  }, []);

  const addHistoryEntry = useCallback((entry: HistoryCardEntry) => {
    setHistoryCards((prev) => [...prev, entry]);
  }, []);
  const updateHistoryEntry = useCallback(
    (id: string, updates: Partial<HistoryCardEntry>) => {
      setHistoryCards((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      );
    },
    [],
  );
  const deleteHistoryEntry = useCallback((id: string) => {
    setHistoryCards((prev) => prev.filter((h) => h.id !== id));
  }, []);
  const importBreakdownRecords = useCallback((records: BreakdownRecord[]) => {
    setBreakdownRecords((prev) => [...prev, ...records]);
  }, []);
  const importCapaRecords = useCallback((records: CAPARecord[]) => {
    setCapaRecords((prev) => [...prev, ...records]);
  }, []);
  const importHistoryEntries = useCallback((entries: HistoryCardEntry[]) => {
    setHistoryCards((prev) => [...prev, ...entries]);
  }, []);
  const updateSectionHoursConfig = useCallback(
    (
      section: string,
      updates: Partial<Omit<SectionHoursConfig, "section">>,
    ) => {
      setSectionHoursConfigs((prev) =>
        prev.map((c) => (c.section === section ? { ...c, ...updates } : c)),
      );
    },
    [],
  );
  const setPrioritizedMachines = useCallback((ids: string[]) => {
    setPrioritizedMachineIds(ids);
  }, []);

  const addTask = useCallback((task: TaskRecord) => {
    setTaskRecords((prev) => [...prev, task]);
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
    setTaskRecords((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
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
  }, []);

  const importTasks = useCallback((records: TaskRecord[]) => {
    setTaskRecords((prev) => [...prev, ...records]);
  }, []);

  const updateBDTargets = useCallback((targets: Partial<BDTargets>) => {
    setBdTargets((prev) => ({ ...prev, ...targets }));
  }, []);

  // Kaizen
  const addKaizen = useCallback((k: KaizenRecord) => {
    setKaizenRecords((prev) => [...prev, k]);
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
      setKaizenRecords((prev) =>
        prev.map((k) => (k.id === id ? { ...k, ...updates } : k)),
      );
    },
    [],
  );

  // Predictive
  const addPredictivePlan = useCallback((p: PredictivePlan) => {
    setPredictivePlans((prev) => [...prev, p]);
  }, []);

  const updatePredictivePlan = useCallback(
    (id: string, updates: Partial<PredictivePlan>) => {
      setPredictivePlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  const deletePredictivePlan = useCallback((id: string) => {
    setPredictivePlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const submitPredictiveRecord = useCallback((r: PredictiveRecord) => {
    setPredictiveRecords((prev) => [...prev, r]);
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
    setPredictiveRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
    );
  }, []);

  // Electricity
  const addElectricityMeter = useCallback((m: ElectricityMeter) => {
    setElectricityMeters((prev) => [...prev, m]);
  }, []);

  const updateElectricityMeter = useCallback(
    (id: string, updates: Partial<ElectricityMeter>) => {
      setElectricityMeters((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    },
    [],
  );

  const deleteElectricityMeter = useCallback((id: string) => {
    setElectricityMeters((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addMeterReading = useCallback((r: MeterReading) => {
    setMeterReadings((prev) => [...prev, r]);
  }, []);

  const deleteMeterReading = useCallback((id: string) => {
    setMeterReadings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Logbook
  const addLogbookCheckItem = useCallback((item: LogbookCheckItem) => {
    setLogbookCheckItems((prev) => [...prev, item]);
  }, []);

  const updateLogbookCheckItem = useCallback(
    (id: string, updates: Partial<LogbookCheckItem>) => {
      setLogbookCheckItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      );
    },
    [],
  );

  const deleteLogbookCheckItem = useCallback((id: string) => {
    setLogbookCheckItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const submitLogbookEntry = useCallback((entry: LogbookEntry) => {
    setLogbookEntries((prev) => [...prev, entry]);
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

  const addSpareItem = useCallback((item: SpareItem) => {
    setSpareItems((prev) => [...prev, item]);
  }, []);

  const updateSpareItem = useCallback(
    (id: string, updates: Partial<SpareItem>) => {
      setSpareItems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  const deleteSpareItem = useCallback((id: string) => {
    setSpareItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const importSpareItems = useCallback((items: SpareItem[]) => {
    setSpareItems((prev) => [...prev, ...items]);
  }, []);

  const addPMSpareUsage = useCallback((usage: PMSpareUsage) => {
    setPmSpareUsage((prev) => [...prev, usage]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
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
