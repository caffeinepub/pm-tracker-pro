import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  History,
  LogOut,
  Plus,
  Shield,
  Wrench,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
const XLSX = (window as any).XLSX;
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type {
  BreakdownRecord,
  CAPARecord,
  HistoryCardEntry,
} from "../context/AppContext";
import { useApp } from "../context/AppContext";
import HistoryTab from "./HistoryTab";

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

function statusBadge(status: BreakdownRecord["status"]) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    "pending-approval": {
      label: "Pending Approval",
      color: "oklch(0.92 0.160 55)",
      bg: "oklch(0.35 0.090 55 / 0.35)",
    },
    "approved-breakdown": {
      label: "Breakdown",
      color: "oklch(0.92 0.170 27)",
      bg: "oklch(0.35 0.120 27 / 0.35)",
    },
    "approved-service": {
      label: "Service",
      color: "oklch(0.90 0.140 145)",
      bg: "oklch(0.30 0.090 145 / 0.35)",
    },
    rejected: {
      label: "Rejected",
      color: "oklch(0.92 0.190 25)",
      bg: "oklch(0.35 0.120 25 / 0.35)",
    },
  };
  const s = map[status] ?? {
    label: status,
    color: "oklch(0.80 0.010 260)",
    bg: "oklch(0.30 0.010 260 / 0.3)",
  };
  return (
    <Badge
      className="font-bold text-xs px-2 py-0.5"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}66`,
      }}
    >
      {s.label}
    </Badge>
  );
}

const EMPTY_BD_FORM = {
  machineId: "",
  date: new Date().toISOString().split("T")[0],
  startTime: "",
  endTime: "",
  problemDescription: "",
  faultType: "Mechanical" as BreakdownRecord["faultType"],
  affectedPart: "",
  temporaryAction: "",
  breakdownType: "Breakdown" as BreakdownRecord["breakdownType"],
};

export default function BreakdownPanelPage() {
  const {
    user,
    logout,
    navigate,
    machines,
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
  } = useApp();

  // Breakdown tab state
  const [showForm, setShowForm] = useState(false);
  const [bdForm, setBdForm] = useState({ ...EMPTY_BD_FORM });
  const [bdApprovalId, setBdApprovalId] = useState<string | null>(null);
  const [bdClassification, setBdClassification] = useState<
    "Breakdown" | "Service"
  >("Breakdown");
  const [bdAddToCapa, setBdAddToCapa] = useState(false);
  const [bdAddToHistory, setBdAddToHistory] = useState(false);
  const [bdAdminRemarks, setBdAdminRemarks] = useState("");
  const [bdEditId, setBdEditId] = useState<string | null>(null);
  const [bdEditForm, setBdEditForm] = useState<Partial<BreakdownRecord>>({});

  // CAPA tab state
  const [capaEditId, setCapaEditId] = useState<string | null>(null);
  const [capaEditForm, setCapaEditForm] = useState<Partial<CAPARecord>>({});

  // History tab state moved to HistoryTab component

  // Import refs
  const bdImportRef = useRef<HTMLInputElement>(null);
  const capaImportRef = useRef<HTMLInputElement>(null);

  const duration = useMemo(
    () => calcDuration(bdForm.startTime, bdForm.endTime),
    [bdForm.startTime, bdForm.endTime],
  );

  const pendingBreakdowns = useMemo(
    () => breakdownRecords.filter((r) => r.status === "pending-approval"),
    [breakdownRecords],
  );
  const myRecords = useMemo(() => {
    const sortByDate = (
      a: (typeof breakdownRecords)[0],
      b: (typeof breakdownRecords)[0],
    ) => {
      const dateDiff = b.date.localeCompare(a.date);
      return dateDiff !== 0 ? dateDiff : b.submittedAt - a.submittedAt;
    };
    if (user?.role === "admin") return [...breakdownRecords].sort(sortByDate);
    return breakdownRecords
      .filter((r) => r.operatorUsername === user?.username)
      .sort(sortByDate);
  }, [breakdownRecords, user]);

  function handleSubmitBreakdown(e: React.FormEvent) {
    e.preventDefault();
    if (!bdForm.machineId) {
      toast.error("Select a machine");
      return;
    }
    if (!bdForm.startTime || !bdForm.endTime) {
      toast.error("Enter start and end time");
      return;
    }
    if (!bdForm.problemDescription.trim()) {
      toast.error("Enter problem description");
      return;
    }
    const machine = machines.find((m) => m.id === bdForm.machineId);
    submitBreakdown({
      id: `bd-${Date.now()}`,
      machineId: bdForm.machineId,
      machineName: machine?.name ?? bdForm.machineId,
      date: bdForm.date,
      startTime: bdForm.startTime,
      endTime: bdForm.endTime,
      durationMinutes: duration,
      problemDescription: bdForm.problemDescription,
      faultType: bdForm.faultType,
      affectedPart: bdForm.affectedPart,
      temporaryAction: bdForm.temporaryAction,
      breakdownType: bdForm.breakdownType,
      operatorName: user?.name ?? "",
      operatorUsername: user?.username ?? "",
      status: "pending-approval",
      isInCapa: false,
      isInHistory: false,
      submittedAt: Date.now(),
    });
    toast.success("Breakdown slip submitted for approval");
    setBdForm({ ...EMPTY_BD_FORM });
    setShowForm(false);
  }

  function openBdApproval(r: BreakdownRecord) {
    setBdApprovalId(r.id);
    setBdClassification("Breakdown");
    setBdAddToCapa(false);
    setBdAddToHistory(false);
    setBdAdminRemarks(r.adminRemarks ?? "");
  }

  function handleApproveBreakdown() {
    if (!bdApprovalId) return;
    approveBreakdown(
      bdApprovalId,
      bdClassification,
      bdAddToCapa,
      bdAdminRemarks,
      bdAddToHistory,
    );
    const record = breakdownRecords.find((r) => r.id === bdApprovalId);
    toast.success(`Approved as ${bdClassification} for ${record?.machineName}`);
    setBdApprovalId(null);
  }

  function openBdEdit(r: BreakdownRecord) {
    setBdEditId(r.id);
    setBdEditForm({ ...r });
  }

  function saveBdEdit() {
    if (!bdEditId) return;
    updateBreakdown(bdEditId, bdEditForm);
    toast.success("Breakdown record updated");
    setBdEditId(null);
    setBdEditForm({});
  }

  // CAPA
  const openCapas = capaRecords.filter((c) => c.status === "Open").length;

  function handleImportBreakdown(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result as ArrayBuffer, {
          type: "array",
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
        const now = Date.now();
        const records = rows.map((row, idx) => ({
          id: `bd-import-${now}-${idx}`,
          machineId: row.MachineID ?? "",
          machineName: row.MachineName ?? row.MachineID ?? "",
          date: row.Date ?? new Date().toISOString().split("T")[0],
          startTime: row.StartTime ?? "08:00",
          endTime: row.EndTime ?? "09:00",
          durationMinutes: row.DurationMinutes
            ? Number(row.DurationMinutes)
            : 0,
          problemDescription: row.ProblemDescription ?? "",
          faultType: (row.FaultType as BreakdownRecord["faultType"]) ?? "Other",
          affectedPart: row.AffectedPart ?? "",
          temporaryAction: row.TemporaryAction ?? "",
          breakdownType:
            (row.BreakdownType as BreakdownRecord["breakdownType"]) ??
            "Breakdown",
          operatorName: row.OperatorName ?? "",
          operatorUsername: row.OperatorUsername ?? "",
          status: "approved-breakdown" as const,
          isInCapa: false,
          isInHistory: false,
          submittedAt: now,
        }));
        importBreakdownRecords(records);
        toast.success(`Imported ${records.length} breakdown records`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  function handleImportCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result as ArrayBuffer, {
          type: "array",
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
        const records: CAPARecord[] = rows.map((row, idx) => ({
          id: `capa-import-${Date.now()}-${idx}`,
          breakdownId: row.BreakdownID ?? "",
          machineId: row.MachineID ?? "",
          machineName: row.MachineName ?? row.MachineID ?? "",
          date: row.Date ?? new Date().toISOString().split("T")[0],
          problemSummary: row.ProblemSummary ?? "",
          rootCause: row.RootCause ?? "",
          temporaryAction: row.TemporaryAction ?? "",
          permanentAction: row.PermanentAction ?? "",
          responsiblePerson: row.ResponsiblePerson ?? "",
          targetDate: row.TargetDate ?? "",
          status: (row.Status as "Open" | "Closed") ?? "Open",
          createdAt: Date.now(),
        }));
        importCapaRecords(records);
        toast.success(`Imported ${records.length} CAPA records`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  const approvalRecord = breakdownRecords.find((r) => r.id === bdApprovalId);

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <MorningPopup />
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("dashboard")}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                ←
              </button>
              <AlertTriangle
                className="w-5 h-5"
                style={{ color: "oklch(0.75 0.200 25)" }}
              />
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Breakdown{" "}
                <span style={{ color: "oklch(0.75 0.200 25)" }}>Panel</span>
              </span>
              <nav className="hidden md:flex items-center gap-2 ml-6">
                <button
                  type="button"
                  onClick={() => navigate("dashboard")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate("preventive")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  PM
                </button>
                <button
                  type="button"
                  onClick={() => navigate("breakdown-panel")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => navigate("analysis")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Analysis
                </button>
              </nav>
              {pendingBreakdowns.length > 0 && (
                <Badge
                  style={{
                    background: "oklch(0.62 0.220 25 / 0.20)",
                    color: "oklch(0.75 0.200 25)",
                    border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                  }}
                >
                  {pendingBreakdowns.length} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg"
                style={{ color: "oklch(0.68 0.010 260)" }}
                data-ocid="breakdown_panel.logout.button"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20 md:pb-6">
          <Tabs defaultValue="breakdown" data-ocid="breakdown_panel.panel">
            <TabsList
              className="mb-6 flex flex-wrap gap-1 h-auto p-1"
              style={{ background: "oklch(0.22 0.022 252)" }}
            >
              <TabsTrigger
                data-ocid="breakdown_panel.tab"
                value="breakdown"
                className="flex items-center gap-1.5 text-xs relative"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Breakdown
                {pendingBreakdowns.length > 0 && (
                  <Badge
                    className="ml-1 h-4 px-1 text-[10px] font-bold"
                    style={{
                      background: "oklch(0.62 0.220 25)",
                      color: "white",
                    }}
                  >
                    {pendingBreakdowns.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                data-ocid="breakdown_panel.tab"
                value="capa"
                className="flex items-center gap-1.5 text-xs relative"
              >
                <AlertCircle className="w-3.5 h-3.5" /> CAPA
                {openCapas > 0 && (
                  <Badge
                    className="ml-1 h-4 px-1 text-[10px] font-bold"
                    style={{
                      background: "oklch(0.55 0.200 25)",
                      color: "white",
                    }}
                  >
                    {openCapas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                data-ocid="breakdown_panel.tab"
                value="history"
                className="flex items-center gap-1.5 text-xs"
              >
                <History className="w-3.5 h-3.5" /> History Cards
              </TabsTrigger>
            </TabsList>

            {/* BREAKDOWN TAB */}
            <TabsContent value="breakdown">
              <div className="space-y-6">
                {/* Operator: new slip */}
                {user?.role === "operator" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={() => setShowForm(true)}
                      data-ocid="breakdown.open_modal_button"
                      style={{
                        background: "oklch(0.62 0.220 25 / 0.20)",
                        color: "oklch(0.80 0.200 25)",
                        border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> New Breakdown Slip
                    </Button>
                  </motion.div>
                )}

                {/* Admin: pending approvals */}
                {user?.role === "admin" && pendingBreakdowns.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="industrial-card p-5"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Clock
                        className="w-4 h-4"
                        style={{ color: "oklch(0.80 0.180 55)" }}
                      />
                      <h2
                        className="text-base font-bold"
                        style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                      >
                        Pending Breakdown Approvals
                      </h2>
                      <Badge
                        style={{
                          background: "oklch(0.62 0.220 25 / 0.20)",
                          color: "oklch(0.75 0.200 25)",
                          border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                        }}
                      >
                        {pendingBreakdowns.length}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow
                            style={{ borderColor: "oklch(0.34 0.030 252)" }}
                          >
                            {[
                              "Machine",
                              "Date",
                              "Duration",
                              "Fault",
                              "Problem",
                              "Operator",
                              "Actions",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingBreakdowns.map((r, idx) => (
                            <TableRow
                              key={r.id}
                              data-ocid={`bd_approvals.row.${idx + 1}`}
                              style={{ borderColor: "oklch(0.28 0.025 252)" }}
                            >
                              <TableCell
                                className="font-semibold text-sm"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {r.machineName}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {r.date}
                              </TableCell>
                              <TableCell
                                className="text-sm"
                                style={{
                                  color:
                                    r.durationMinutes > 60
                                      ? "oklch(0.75 0.200 25)"
                                      : "inherit",
                                }}
                              >
                                {r.durationMinutes} min
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.faultType}
                              </TableCell>
                              <TableCell
                                className="text-xs max-w-[150px] truncate"
                                style={{ color: "oklch(0.75 0.010 260)" }}
                              >
                                {r.problemDescription}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.operatorName}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    data-ocid={`bd_approvals.confirm_button.${idx + 1}`}
                                    onClick={() => openBdApproval(r)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                    style={{
                                      background:
                                        "oklch(0.45 0.120 145 / 0.20)",
                                      border:
                                        "1px solid oklch(0.52 0.120 145 / 0.5)",
                                      color: "oklch(0.75 0.130 145)",
                                    }}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    data-ocid={`bd_approvals.delete_button.${idx + 1}`}
                                    onClick={() => {
                                      rejectBreakdown(r.id);
                                      toast.error(
                                        `Rejected for ${r.machineName}`,
                                      );
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                    style={{
                                      background: "oklch(0.40 0.150 25 / 0.20)",
                                      color: "oklch(0.72 0.170 25)",
                                      border:
                                        "1px solid oklch(0.55 0.150 25 / 0.4)",
                                    }}
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                )}

                {/* All records table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="industrial-card p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className="w-5 h-5"
                        style={{ color: "oklch(0.75 0.200 25)" }}
                      />
                      <h2
                        className="text-base font-bold"
                        style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                      >
                        {user?.role === "admin"
                          ? "All Breakdown Records"
                          : "My Breakdown Submissions"}
                      </h2>
                      <Badge
                        style={{
                          background: "oklch(0.62 0.220 25 / 0.15)",
                          color: "oklch(0.75 0.200 25)",
                          border: "1px solid oklch(0.62 0.220 25 / 0.35)",
                        }}
                      >
                        {myRecords.length}
                      </Badge>
                    </div>
                    {user?.role === "admin" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => bdImportRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "oklch(0.50 0.065 232 / 0.15)",
                            color: "oklch(0.65 0.150 232)",
                            border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                          }}
                          data-ocid="breakdown.import.button"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Import
                          Excel
                        </button>
                        <input
                          ref={bdImportRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={handleImportBreakdown}
                        />
                      </div>
                    )}
                    {user?.role === "operator" && (
                      <Button
                        size="sm"
                        onClick={() => setShowForm(true)}
                        data-ocid="breakdown.primary_button"
                        style={{
                          background: "oklch(0.62 0.220 25 / 0.20)",
                          color: "oklch(0.80 0.200 25)",
                          border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Slip
                      </Button>
                    )}
                  </div>
                  {myRecords.length === 0 ? (
                    <div
                      data-ocid="breakdown.empty_state"
                      className="text-center py-12"
                    >
                      <Wrench
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: "oklch(0.45 0.010 260)" }}
                      />
                      <p
                        className="font-medium"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        No breakdown records yet
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow
                            style={{ borderColor: "oklch(0.34 0.030 252)" }}
                          >
                            {[
                              "Machine",
                              "Date",
                              "Duration",
                              "Fault",
                              "Problem",
                              "Operator",
                              "Status",
                              ...(user?.role === "admin" ? ["Edit"] : []),
                            ].map((h) => (
                              <TableHead
                                key={h}
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myRecords.map((r, idx) => (
                            <TableRow
                              key={r.id}
                              data-ocid={`breakdown.row.${idx + 1}`}
                              style={{ borderColor: "oklch(0.28 0.025 252)" }}
                            >
                              <TableCell
                                className="font-semibold"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {r.machineName}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {r.date}
                              </TableCell>
                              <TableCell
                                className="text-sm"
                                style={{
                                  color:
                                    r.durationMinutes > 60
                                      ? "oklch(0.75 0.200 25)"
                                      : "inherit",
                                }}
                              >
                                {r.durationMinutes} min
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.faultType}
                              </TableCell>
                              <TableCell
                                className="text-xs max-w-[150px] truncate"
                                style={{ color: "oklch(0.75 0.010 260)" }}
                              >
                                {r.problemDescription}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.operatorName}
                              </TableCell>
                              <TableCell>{statusBadge(r.status)}</TableCell>
                              {user?.role === "admin" && (
                                <TableCell>
                                  <button
                                    type="button"
                                    data-ocid={`breakdown.edit_button.${idx + 1}`}
                                    onClick={() => openBdEdit(r)}
                                    className="p-1.5 rounded hover:opacity-80"
                                    style={{ color: "oklch(0.65 0.150 232)" }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </motion.div>

                {/* Rejected notice for operator */}
                {user?.role === "operator" &&
                  myRecords.some((r) => r.status === "rejected") && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{
                        background: "oklch(0.40 0.150 25 / 0.15)",
                        border: "1px solid oklch(0.55 0.150 25 / 0.4)",
                      }}
                    >
                      <XCircle
                        className="w-5 h-5 shrink-0"
                        style={{ color: "oklch(0.72 0.200 25)" }}
                      />
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.72 0.200 25)" }}
                      >
                        Submission Rejected — Submit a new breakdown slip with
                        corrections.
                      </p>
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* CAPA TAB */}
            <TabsContent value="capa">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="industrial-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      className="w-5 h-5"
                      style={{ color: "oklch(0.80 0.180 55)" }}
                    />
                    <h2
                      className="text-lg font-bold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      CAPA Records
                    </h2>
                    {openCapas > 0 && (
                      <Badge
                        style={{
                          background: "oklch(0.62 0.220 25 / 0.20)",
                          color: "oklch(0.80 0.200 25)",
                          border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                        }}
                      >
                        {openCapas} Open
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role === "admin" && (
                      <>
                        <button
                          type="button"
                          onClick={() => capaImportRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "oklch(0.50 0.065 232 / 0.15)",
                            color: "oklch(0.65 0.150 232)",
                            border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                          }}
                          data-ocid="capa.import.button"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Import
                        </button>
                        <input
                          ref={capaImportRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={handleImportCapa}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const rows = [
                          [
                            "ID",
                            "Machine",
                            "Date",
                            "Problem",
                            "Root Cause",
                            "Permanent Action",
                            "Responsible",
                            "Target",
                            "Status",
                          ],
                          ...[...capaRecords]
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((c) => [
                              c.id,
                              c.machineName,
                              c.date,
                              c.problemSummary,
                              c.rootCause,
                              c.permanentAction,
                              c.responsiblePerson,
                              c.targetDate,
                              c.status,
                            ]),
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(rows);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "CAPA");
                        XLSX.writeFile(
                          wb,
                          `CAPA_${new Date().toISOString().split("T")[0]}.xlsx`,
                        );
                        toast.success("CAPA exported as Excel");
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        background: "oklch(0.34 0.030 252 / 0.3)",
                        color: "oklch(0.68 0.010 260)",
                        border: "1px solid oklch(0.40 0.030 252)",
                      }}
                      data-ocid="capa.secondary_button"
                    >
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>

                {capaRecords.length === 0 ? (
                  <div
                    data-ocid="capa.empty_state"
                    className="text-center py-12"
                  >
                    <Shield
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "oklch(0.45 0.010 260)" }}
                    />
                    <p
                      className="font-medium"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      No CAPA records yet
                    </p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "oklch(0.50 0.010 260)" }}
                    >
                      Auto-created when breakdowns &gt; 60 min are approved.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table data-ocid="capa.table">
                      <TableHeader>
                        <TableRow
                          style={{ borderColor: "oklch(0.34 0.030 252)" }}
                        >
                          {[
                            "Machine",
                            "Date",
                            "Problem",
                            "Root Cause",
                            "Perm. Action",
                            "Responsible",
                            "Target",
                            "Status",
                            ...(user?.role === "admin" ? ["Edit"] : []),
                          ].map((h) => (
                            <TableHead
                              key={h}
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {capaRecords.map((c, idx) => (
                          <TableRow
                            key={c.id}
                            data-ocid={`capa.table.item.${idx + 1}`}
                            style={{ borderColor: "oklch(0.24 0.028 252)" }}
                          >
                            <TableCell
                              className="font-medium"
                              style={{ color: "oklch(0.88 0.008 260)" }}
                            >
                              {c.machineName}
                            </TableCell>
                            <TableCell
                              style={{ color: "oklch(0.75 0.008 260)" }}
                            >
                              {c.date}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {c.problemSummary}
                            </TableCell>
                            <TableCell
                              className="max-w-[100px] truncate"
                              style={{
                                color: c.rootCause
                                  ? "inherit"
                                  : "oklch(0.50 0.010 260)",
                              }}
                            >
                              {c.rootCause || "—"}
                            </TableCell>
                            <TableCell
                              className="max-w-[100px] truncate"
                              style={{
                                color: c.permanentAction
                                  ? "oklch(0.75 0.130 145)"
                                  : "oklch(0.72 0.200 25)",
                              }}
                            >
                              {c.permanentAction || "⚠️ Unfilled"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.responsiblePerson || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.targetDate || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                style={{
                                  background:
                                    c.status === "Open"
                                      ? "oklch(0.62 0.220 25 / 0.15)"
                                      : "oklch(0.45 0.120 145 / 0.15)",
                                  color:
                                    c.status === "Open"
                                      ? "oklch(0.80 0.200 25)"
                                      : "oklch(0.75 0.130 145)",
                                  border: "1px solid currentColor",
                                }}
                              >
                                {c.status}
                              </Badge>
                            </TableCell>
                            {user?.role === "admin" && (
                              <TableCell>
                                <button
                                  type="button"
                                  data-ocid={`capa.edit_button.${idx + 1}`}
                                  onClick={() => {
                                    setCapaEditId(c.id);
                                    setCapaEditForm({ ...c });
                                  }}
                                  className="p-1.5 rounded hover:opacity-80"
                                  style={{ color: "oklch(0.65 0.150 232)" }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history">
              <HistoryTab
                user={user}
                machines={machines}
                historyCards={historyCards}
                addHistoryEntry={addHistoryEntry}
                updateHistoryEntry={updateHistoryEntry}
                deleteHistoryEntry={deleteHistoryEntry}
                importHistoryEntries={importHistoryEntries}
              />
            </TabsContent>
          </Tabs>
        </main>

        {/* New Breakdown Slip Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="breakdown.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                <div className="flex items-center gap-2">
                  <Wrench
                    className="w-5 h-5"
                    style={{ color: "oklch(0.80 0.180 55)" }}
                  />{" "}
                  Breakdown Slip
                </div>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitBreakdown} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Machine *
                  </Label>
                  <Select
                    value={bdForm.machineId}
                    onValueChange={(v) =>
                      setBdForm((f) => ({ ...f, machineId: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="breakdown.select"
                      style={inputStyle}
                    >
                      <SelectValue placeholder="Select machine" />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: "oklch(0.22 0.022 252)" }}
                    >
                      {machines.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={bdForm.date}
                    onChange={(e) =>
                      setBdForm((f) => ({ ...f, date: e.target.value }))
                    }
                    data-ocid="breakdown.input"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={bdForm.startTime}
                    onChange={(e) =>
                      setBdForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    data-ocid="breakdown.input"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    End Time *
                  </Label>
                  <Input
                    type="time"
                    value={bdForm.endTime}
                    onChange={(e) =>
                      setBdForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    data-ocid="breakdown.input"
                    style={inputStyle}
                  />
                </div>
                {bdForm.startTime && bdForm.endTime && (
                  <div className="sm:col-span-2">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background:
                          duration > 60
                            ? "oklch(0.62 0.220 25 / 0.15)"
                            : "oklch(0.45 0.120 145 / 0.15)",
                        border: `1px solid ${duration > 60 ? "oklch(0.62 0.220 25 / 0.4)" : "oklch(0.52 0.120 145 / 0.4)"}`,
                      }}
                    >
                      <Clock
                        className="w-4 h-4"
                        style={{
                          color:
                            duration > 60
                              ? "oklch(0.75 0.200 25)"
                              : "oklch(0.75 0.130 145)",
                        }}
                      />
                      <span
                        style={{
                          color:
                            duration > 60
                              ? "oklch(0.75 0.200 25)"
                              : "oklch(0.75 0.130 145)",
                        }}
                      >
                        Duration: <strong>{duration} min</strong>
                        {duration > 60 && " — Will auto-add to CAPA & History"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Breakdown Type
                  </Label>
                  <Select
                    value={bdForm.breakdownType}
                    onValueChange={(v) =>
                      setBdForm((f) => ({
                        ...f,
                        breakdownType: v as BreakdownRecord["breakdownType"],
                      }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="breakdown.select"
                      style={inputStyle}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: "oklch(0.22 0.022 252)" }}
                    >
                      {["Breakdown", "Planned Stop", "Minor Stop"].map((v) => (
                        <SelectItem
                          key={v}
                          value={v}
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Fault Type
                  </Label>
                  <Select
                    value={bdForm.faultType}
                    onValueChange={(v) =>
                      setBdForm((f) => ({
                        ...f,
                        faultType: v as BreakdownRecord["faultType"],
                      }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="breakdown.select"
                      style={inputStyle}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: "oklch(0.22 0.022 252)" }}
                    >
                      {["Electrical", "Mechanical", "Pneumatic", "Other"].map(
                        (v) => (
                          <SelectItem
                            key={v}
                            value={v}
                            style={{ color: "oklch(0.88 0.010 260)" }}
                          >
                            {v}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Affected Part / Component
                  </Label>
                  <Input
                    value={bdForm.affectedPart}
                    onChange={(e) =>
                      setBdForm((f) => ({ ...f, affectedPart: e.target.value }))
                    }
                    placeholder="e.g. Motor, Gearbox..."
                    data-ocid="breakdown.input"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Problem Description *
                  </Label>
                  <Textarea
                    value={bdForm.problemDescription}
                    onChange={(e) =>
                      setBdForm((f) => ({
                        ...f,
                        problemDescription: e.target.value,
                      }))
                    }
                    rows={3}
                    data-ocid="breakdown.textarea"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Temporary Action Taken
                  </Label>
                  <Textarea
                    value={bdForm.temporaryAction}
                    onChange={(e) =>
                      setBdForm((f) => ({
                        ...f,
                        temporaryAction: e.target.value,
                      }))
                    }
                    rows={2}
                    data-ocid="breakdown.textarea"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  data-ocid="breakdown.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-ocid="breakdown.submit_button"
                  style={{
                    background: "oklch(0.62 0.220 25 / 0.25)",
                    color: "oklch(0.80 0.200 25)",
                    border: "1px solid oklch(0.62 0.220 25 / 0.5)",
                  }}
                >
                  Submit for Approval
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Breakdown Approval Dialog */}
        {approvalRecord && (
          <Dialog
            open={!!bdApprovalId}
            onOpenChange={(o) => !o && setBdApprovalId(null)}
          >
            <DialogContent
              className="max-w-lg max-h-[90vh] overflow-y-auto"
              style={{
                background: "oklch(0.22 0.022 252)",
                border: "1px solid oklch(0.34 0.030 252)",
                color: "oklch(0.88 0.010 260)",
              }}
              data-ocid="bd_approval.dialog"
            >
              <DialogHeader>
                <DialogTitle
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Approve / Edit Breakdown — {approvalRecord.machineName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  All fields are editable before approval.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Machine
                    </Label>
                    <Select
                      value={bdEditForm.machineId ?? approvalRecord.machineId}
                      onValueChange={(v) => {
                        const m = machines.find((x) => x.id === v);
                        setBdEditForm((f) => ({
                          ...f,
                          machineId: v,
                          machineName: m?.name ?? v,
                        }));
                      }}
                    >
                      <SelectTrigger style={inputStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ background: "oklch(0.22 0.022 252)" }}
                      >
                        {machines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={bdEditForm.date ?? approvalRecord.date}
                      onChange={(e) =>
                        setBdEditForm((f) => ({ ...f, date: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Start Time
                    </Label>
                    <Input
                      type="time"
                      value={bdEditForm.startTime ?? approvalRecord.startTime}
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          startTime: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      End Time
                    </Label>
                    <Input
                      type="time"
                      value={bdEditForm.endTime ?? approvalRecord.endTime}
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          endTime: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Fault Type
                    </Label>
                    <Select
                      value={bdEditForm.faultType ?? approvalRecord.faultType}
                      onValueChange={(v) =>
                        setBdEditForm((f) => ({
                          ...f,
                          faultType: v as BreakdownRecord["faultType"],
                        }))
                      }
                    >
                      <SelectTrigger style={inputStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ background: "oklch(0.22 0.022 252)" }}
                      >
                        {["Electrical", "Mechanical", "Pneumatic", "Other"].map(
                          (v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Breakdown Type
                    </Label>
                    <Select
                      value={
                        bdEditForm.breakdownType ?? approvalRecord.breakdownType
                      }
                      onValueChange={(v) =>
                        setBdEditForm((f) => ({
                          ...f,
                          breakdownType: v as BreakdownRecord["breakdownType"],
                        }))
                      }
                    >
                      <SelectTrigger style={inputStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ background: "oklch(0.22 0.022 252)" }}
                      >
                        {["Breakdown", "Planned Stop", "Minor Stop"].map(
                          (v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Affected Part
                    </Label>
                    <Input
                      value={
                        bdEditForm.affectedPart ?? approvalRecord.affectedPart
                      }
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          affectedPart: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Problem Description
                    </Label>
                    <Textarea
                      value={
                        bdEditForm.problemDescription ??
                        approvalRecord.problemDescription
                      }
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          problemDescription: e.target.value,
                        }))
                      }
                      rows={2}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Temporary Action
                    </Label>
                    <Textarea
                      value={
                        bdEditForm.temporaryAction ??
                        approvalRecord.temporaryAction
                      }
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          temporaryAction: e.target.value,
                        }))
                      }
                      rows={2}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Operator Name
                    </Label>
                    <Input
                      value={
                        bdEditForm.operatorName ?? approvalRecord.operatorName
                      }
                      onChange={(e) =>
                        setBdEditForm((f) => ({
                          ...f,
                          operatorName: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    className="text-xs font-semibold"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Classification
                  </Label>
                  <RadioGroup
                    value={bdClassification}
                    onValueChange={(v) =>
                      setBdClassification(v as "Breakdown" | "Service")
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Breakdown" id="cls-bd" />
                      <Label htmlFor="cls-bd" className="cursor-pointer">
                        Breakdown
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Service" id="cls-svc" />
                      <Label htmlFor="cls-svc" className="cursor-pointer">
                        Service
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {bdClassification === "Breakdown" &&
                  (approvalRecord.durationMinutes > 60 ? (
                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: "oklch(0.62 0.220 25 / 0.12)",
                        border: "1px solid oklch(0.62 0.220 25 / 0.3)",
                        color: "oklch(0.80 0.200 25)",
                      }}
                    >
                      ⚠️ Duration &gt; 60 min — Will auto-add to CAPA and History
                      Card
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Switch
                          id="add-capa"
                          checked={bdAddToCapa}
                          onCheckedChange={setBdAddToCapa}
                          data-ocid="bd_approval.switch"
                        />
                        <Label
                          htmlFor="add-capa"
                          className="cursor-pointer text-sm"
                        >
                          Add to CAPA?
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          id="add-hist"
                          checked={bdAddToHistory}
                          onCheckedChange={setBdAddToHistory}
                          data-ocid="bd_approval.switch"
                        />
                        <Label
                          htmlFor="add-hist"
                          className="cursor-pointer text-sm"
                        >
                          Add to History Card?
                        </Label>
                      </div>
                    </div>
                  ))}

                <div>
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Admin Remarks
                  </Label>
                  <Input
                    value={bdAdminRemarks}
                    onChange={(e) => setBdAdminRemarks(e.target.value)}
                    placeholder="Optional..."
                    data-ocid="bd_approval.input"
                    style={inputStyle}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setBdApprovalId(null)}
                    data-ocid="bd_approval.cancel_button"
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.68 0.010 260)",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateBreakdown(bdApprovalId!, bdEditForm);
                      handleApproveBreakdown();
                    }}
                    data-ocid="bd_approval.confirm_button"
                    style={{
                      background: "oklch(0.45 0.120 145 / 0.25)",
                      color: "oklch(0.75 0.130 145)",
                      border: "1px solid oklch(0.52 0.120 145 / 0.5)",
                    }}
                  >
                    Save & Approve
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Admin Edit Breakdown Dialog (for already-approved records) */}
        <Dialog
          open={!!bdEditId && !bdApprovalId}
          onOpenChange={(o) => !o && setBdEditId(null)}
        >
          <DialogContent
            className="max-w-lg max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="breakdown.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Edit Breakdown Record
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "date", label: "Date", type: "date" },
                  { key: "startTime", label: "Start Time", type: "time" },
                  { key: "endTime", label: "End Time", type: "time" },
                  { key: "affectedPart", label: "Affected Part", type: "text" },
                  { key: "operatorName", label: "Operator Name", type: "text" },
                ].map(({ key, label, type }) => (
                  <div
                    key={key}
                    className={
                      key === "affectedPart" || key === "operatorName"
                        ? "col-span-2"
                        : ""
                    }
                  >
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      {label}
                    </Label>
                    <Input
                      type={type}
                      value={String(
                        bdEditForm[key as keyof BreakdownRecord] ?? "",
                      )}
                      onChange={(e) =>
                        setBdEditForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                ))}
                {[
                  {
                    key: "faultType",
                    label: "Fault Type",
                    opts: ["Electrical", "Mechanical", "Pneumatic", "Other"],
                  },
                  {
                    key: "breakdownType",
                    label: "Breakdown Type",
                    opts: ["Breakdown", "Planned Stop", "Minor Stop"],
                  },
                ].map(({ key, label, opts }) => (
                  <div key={key}>
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      {label}
                    </Label>
                    <Select
                      value={String(
                        bdEditForm[key as keyof BreakdownRecord] ?? "",
                      )}
                      onValueChange={(v) =>
                        setBdEditForm((f) => ({ ...f, [key]: v }))
                      }
                    >
                      <SelectTrigger style={inputStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ background: "oklch(0.22 0.022 252)" }}
                      >
                        {opts.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Problem Description
                  </Label>
                  <Textarea
                    value={String(bdEditForm.problemDescription ?? "")}
                    onChange={(e) =>
                      setBdEditForm((f) => ({
                        ...f,
                        problemDescription: e.target.value,
                      }))
                    }
                    rows={2}
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Temporary Action
                  </Label>
                  <Textarea
                    value={String(bdEditForm.temporaryAction ?? "")}
                    onChange={(e) =>
                      setBdEditForm((f) => ({
                        ...f,
                        temporaryAction: e.target.value,
                      }))
                    }
                    rows={2}
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-2">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Admin Remarks
                  </Label>
                  <Input
                    value={String(bdEditForm.adminRemarks ?? "")}
                    onChange={(e) =>
                      setBdEditForm((f) => ({
                        ...f,
                        adminRemarks: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setBdEditId(null)}
                  data-ocid="breakdown.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveBdEdit}
                  data-ocid="breakdown.save_button"
                  style={{
                    background: "oklch(0.45 0.120 145 / 0.25)",
                    color: "oklch(0.75 0.130 145)",
                    border: "1px solid oklch(0.52 0.120 145 / 0.5)",
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* CAPA Edit Dialog */}
        <Dialog
          open={!!capaEditId}
          onOpenChange={(o) => !o && setCapaEditId(null)}
        >
          <DialogContent
            className="max-w-lg"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="capa.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Edit CAPA — {capaEditForm.machineName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {[
                { key: "rootCause", label: "Root Cause" },
                {
                  key: "permanentAction",
                  label: "Permanent Corrective Action *",
                },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    {label}
                  </Label>
                  <Textarea
                    value={String(capaEditForm[key as keyof CAPARecord] ?? "")}
                    onChange={(e) =>
                      setCapaEditForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    rows={2}
                    data-ocid="capa.textarea"
                    style={inputStyle}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Responsible Person
                  </Label>
                  <Input
                    value={capaEditForm.responsiblePerson ?? ""}
                    onChange={(e) =>
                      setCapaEditForm((f) => ({
                        ...f,
                        responsiblePerson: e.target.value,
                      }))
                    }
                    data-ocid="capa.input"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Target Date
                  </Label>
                  <Input
                    type="date"
                    value={capaEditForm.targetDate ?? ""}
                    onChange={(e) =>
                      setCapaEditForm((f) => ({
                        ...f,
                        targetDate: e.target.value,
                      }))
                    }
                    data-ocid="capa.input"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Status
                </Label>
                <Select
                  value={capaEditForm.status ?? "Open"}
                  onValueChange={(v) =>
                    setCapaEditForm((f) => ({
                      ...f,
                      status: v as "Open" | "Closed",
                    }))
                  }
                >
                  <SelectTrigger data-ocid="capa.select" style={inputStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{ background: "oklch(0.22 0.022 252)" }}
                  >
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  updateCapa(capaEditId!, capaEditForm);
                  toast.success("CAPA updated");
                  setCapaEditId(null);
                }}
                data-ocid="capa.save_button"
                style={{
                  background: "oklch(0.52 0.120 145)",
                  color: "oklch(0.96 0.004 260)",
                }}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <footer
          className="mt-auto border-t py-4"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-xs" style={{ color: "oklch(0.50 0.010 260)" }}>
              © {new Date().getFullYear()}. Built with ❤ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "oklch(0.70 0.188 55)" }}
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
