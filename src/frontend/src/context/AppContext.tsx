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

// Extended machine with section and available working hours
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

const MACHINES_KEY = "pm_tracker_machines";
const PRIORITIZED_KEY = "pm_tracker_prioritized_machines";
const USERS_STORAGE_KEY = "pm_tracker_users";
const SESSION_KEY = "pm_tracker_session";
const HISTORY_KEY = "pm_tracker_history";
const BREAKDOWN_KEY = "pm_tracker_breakdowns";
const CAPA_KEY = "pm_tracker_capa";
const SECTION_HOURS_KEY = "pm_tracker_section_hours";

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
  | "history";

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
        if (r) return JSON.parse(r);
      } catch {}
      return [];
    },
  );
  const [capaRecords, setCapaRecords] = useState<CAPARecord[]>(() => {
    try {
      const r = localStorage.getItem(CAPA_KEY);
      if (r) return JSON.parse(r);
    } catch {}
    return [];
  });
  const [historyCards, setHistoryCards] = useState<HistoryCardEntry[]>(() => {
    try {
      const r = localStorage.getItem(HISTORY_KEY);
      if (r) return JSON.parse(r);
    } catch {}
    return [];
  });

  const [sectionHoursConfigs, setSectionHoursConfigs] = useState<
    SectionHoursConfig[]
  >(() => {
    try {
      const r = localStorage.getItem(SECTION_HOURS_KEY);
      if (r) return JSON.parse(r);
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
      const idx = prev.findIndex(
        (x) => x.machineId === p.machineId && x.month === p.month,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...p };
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
      const exists = prev.findIndex((x) => x.id === t.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = t;
        return updated;
      }
      return [...prev, t];
    });
  }, []);

  const updateChecklistTemplates = useCallback(
    (templates: ChecklistTemplate[]) => {
      setChecklistTemplates((prev) => {
        let result = [...prev];
        for (const t of templates) {
          const idx = result.findIndex((x) => x.id === t.id);
          if (idx >= 0) {
            result[idx] = t;
          } else {
            result = [...result, t];
          }
        }
        return result;
      });
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
