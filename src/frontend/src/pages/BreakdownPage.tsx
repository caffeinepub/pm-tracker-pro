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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  LogOut,
  Plus,
  Wrench,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { BreakdownRecord } from "../context/AppContext";
import { useApp } from "../context/AppContext";

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

const EMPTY_FORM = {
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

const XLSX = (window as any).XLSX;

export default function BreakdownPage() {
  const {
    user,
    logout,
    navigate,
    machines,
    submitBreakdown,
    breakdownRecords,
    importBreakdownRecords,
  } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const xlsxImportRef = useRef<HTMLInputElement>(null);

  const handleImportBreakdown = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          faultType:
            (row.FaultType as
              | "Electrical"
              | "Mechanical"
              | "Pneumatic"
              | "Other") ?? "Other",
          affectedPart: row.AffectedPart ?? "",
          temporaryAction: row.TemporaryAction ?? "",
          breakdownType:
            (row.BreakdownType as
              | "Breakdown"
              | "Planned Stop"
              | "Minor Stop") ?? "Breakdown",
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
  };

  const duration = useMemo(
    () => calcDuration(form.startTime, form.endTime),
    [form.startTime, form.endTime],
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.machineId) {
      toast.error("Select a machine");
      return;
    }
    if (!form.startTime || !form.endTime) {
      toast.error("Enter start and end time");
      return;
    }
    if (!form.problemDescription.trim()) {
      toast.error("Enter problem description");
      return;
    }
    const machine = machines.find((m) => m.id === form.machineId);
    const record: BreakdownRecord = {
      id: `bd-${Date.now()}`,
      machineId: form.machineId,
      machineName: machine?.name ?? form.machineId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes: duration,
      problemDescription: form.problemDescription,
      faultType: form.faultType,
      affectedPart: form.affectedPart,
      temporaryAction: form.temporaryAction,
      breakdownType: form.breakdownType,
      operatorName: user?.name ?? "",
      operatorUsername: user?.username ?? "",
      status: "pending-approval",
      isInCapa: false,
      isInHistory: false,
      submittedAt: Date.now(),
    };
    submitBreakdown(record);
    toast.success("Breakdown slip submitted for approval");
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  return (
    <>
      <MorningPopup />
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.15 0.018 255)" }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.62 0.220 25 / 0.15)",
                border: "1px solid oklch(0.62 0.220 25 / 0.3)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "oklch(0.75 0.200 25)" }}
              />
            </div>
            <div>
              <h1
                className="text-sm font-bold"
                style={{
                  color: "oklch(0.88 0.010 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                Breakdown Entry
              </h1>
              <p
                className="text-[10px]"
                style={{ color: "oklch(0.55 0.010 260)" }}
              >
                Plant Maintenance Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate("dashboard")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "oklch(0.25 0.022 252)",
                color: "oklch(0.68 0.010 260)",
              }}
              data-ocid="breakdown.dashboard.link"
            >
              Dashboard
            </button>
            {user?.role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => xlsxImportRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.15)",
                    color: "oklch(0.65 0.150 232)",
                    border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                  }}
                  data-ocid="breakdown.import.button"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel
                </button>
                <input
                  ref={xlsxImportRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportBreakdown}
                />
              </>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "oklch(0.40 0.150 25 / 0.15)",
                color: "oklch(0.72 0.170 25)",
                border: "1px solid oklch(0.55 0.150 25 / 0.3)",
              }}
              data-ocid="breakdown.logout.button"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full pb-24 md:pb-8">
          {/* New entry button */}
          {user?.role === "operator" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Button
                onClick={() => setShowForm(true)}
                data-ocid="breakdown.open_modal_button"
                className="flex items-center gap-2"
                style={{
                  background: "oklch(0.62 0.220 25 / 0.20)",
                  color: "oklch(0.80 0.200 25)",
                  border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                }}
              >
                <Plus className="w-4 h-4" /> New Breakdown Slip
              </Button>
            </motion.div>
          )}

          {/* Breakdown form dialog */}
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
                  style={{
                    color: "oklch(0.88 0.010 260)",
                    fontFamily: "BricolageGrotesque, sans-serif",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Wrench
                      className="w-5 h-5"
                      style={{ color: "oklch(0.80 0.180 55)" }}
                    />
                    Breakdown Slip
                  </div>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Machine */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Machine *
                    </Label>
                    <Select
                      value={form.machineId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, machineId: v }))
                      }
                    >
                      <SelectTrigger
                        data-ocid="breakdown.select"
                        style={{
                          background: "oklch(0.19 0.020 255)",
                          borderColor: "oklch(0.34 0.030 252)",
                          color: "oklch(0.88 0.010 260)",
                        }}
                      >
                        <SelectValue placeholder="Select machine" />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          background: "oklch(0.22 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
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

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date: e.target.value }))
                      }
                      data-ocid="breakdown.input"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* Start Time */}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startTime: e.target.value }))
                      }
                      data-ocid="breakdown.input"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* End Time */}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      End Time *
                    </Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endTime: e.target.value }))
                      }
                      data-ocid="breakdown.input"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* Duration display */}
                  {form.startTime && form.endTime && (
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
                          {duration > 60 &&
                            " — Will auto-add to CAPA & History Card"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Breakdown Type */}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Breakdown Type
                    </Label>
                    <Select
                      value={form.breakdownType}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          breakdownType: v as BreakdownRecord["breakdownType"],
                        }))
                      }
                    >
                      <SelectTrigger
                        data-ocid="breakdown.select"
                        style={{
                          background: "oklch(0.19 0.020 255)",
                          borderColor: "oklch(0.34 0.030 252)",
                          color: "oklch(0.88 0.010 260)",
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          background: "oklch(0.22 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
                      >
                        <SelectItem
                          value="Breakdown"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Breakdown
                        </SelectItem>
                        <SelectItem
                          value="Planned Stop"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Planned Stop
                        </SelectItem>
                        <SelectItem
                          value="Minor Stop"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Minor Stop
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fault Type */}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Fault Type
                    </Label>
                    <Select
                      value={form.faultType}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          faultType: v as BreakdownRecord["faultType"],
                        }))
                      }
                    >
                      <SelectTrigger
                        data-ocid="breakdown.select"
                        style={{
                          background: "oklch(0.19 0.020 255)",
                          borderColor: "oklch(0.34 0.030 252)",
                          color: "oklch(0.88 0.010 260)",
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          background: "oklch(0.22 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
                      >
                        <SelectItem
                          value="Electrical"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Electrical
                        </SelectItem>
                        <SelectItem
                          value="Mechanical"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Mechanical
                        </SelectItem>
                        <SelectItem
                          value="Pneumatic"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Pneumatic
                        </SelectItem>
                        <SelectItem
                          value="Other"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Affected Part */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Affected Part / Component
                    </Label>
                    <Input
                      value={form.affectedPart}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, affectedPart: e.target.value }))
                      }
                      placeholder="e.g. Motor, Gearbox, Sensor..."
                      data-ocid="breakdown.input"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* Problem Description */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Problem Description *
                    </Label>
                    <Textarea
                      value={form.problemDescription}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          problemDescription: e.target.value,
                        }))
                      }
                      placeholder="Describe the problem in detail..."
                      rows={3}
                      data-ocid="breakdown.textarea"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* Temporary Action */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Temporary Action Taken
                    </Label>
                    <Textarea
                      value={form.temporaryAction}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          temporaryAction: e.target.value,
                        }))
                      }
                      placeholder="What was done temporarily to restore operation..."
                      rows={2}
                      data-ocid="breakdown.textarea"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        borderColor: "oklch(0.34 0.030 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>

                  {/* Operator */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Operator Name
                    </Label>
                    <Input
                      value={user?.name ?? ""}
                      readOnly
                      data-ocid="breakdown.input"
                      style={{
                        background: "oklch(0.17 0.018 255)",
                        borderColor: "oklch(0.28 0.025 252)",
                        color: "oklch(0.68 0.010 260)",
                      }}
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

          {/* Records table */}
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
                <p
                  className="text-sm mt-1"
                  style={{ color: "oklch(0.50 0.010 260)" }}
                >
                  Submit a breakdown slip when a breakdown occurs
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {myRecords.map((r, idx) => (
                    <div
                      key={r.id}
                      data-ocid={`breakdown.item.${idx + 1}`}
                      className="rounded-lg p-4 space-y-2"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        border: "1px solid oklch(0.28 0.025 252)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "oklch(0.80 0.180 55)" }}
                        >
                          {r.machineName}
                        </span>
                        {statusBadge(r.status)}
                      </div>
                      <div
                        className="text-xs space-y-1"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        <div>
                          {r.date} | {r.startTime}–{r.endTime} |{" "}
                          {r.durationMinutes} min
                        </div>
                        <div>
                          {r.faultType} — {r.problemDescription}
                        </div>
                        {r.isInCapa && (
                          <span className="text-yellow-400">⚠️ In CAPA</span>
                        )}
                        {r.isInHistory && (
                          <span className="ml-2 text-blue-400">
                            📋 In History
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow
                        style={{ borderColor: "oklch(0.34 0.030 252)" }}
                      >
                        {[
                          "Machine",
                          "Date",
                          "Duration",
                          "Fault Type",
                          "Problem",
                          "Operator",
                          "Status",
                          "Flags",
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
                          <TableCell className="text-sm">
                            <span
                              style={{
                                color:
                                  r.durationMinutes > 60
                                    ? "oklch(0.75 0.200 25)"
                                    : "oklch(0.88 0.010 260)",
                              }}
                            >
                              {r.durationMinutes} min
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {r.faultType}
                          </TableCell>
                          <TableCell
                            className="text-xs max-w-[180px] truncate"
                            style={{ color: "oklch(0.75 0.010 260)" }}
                          >
                            {r.problemDescription}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {r.operatorName}
                          </TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex gap-1">
                              {r.isInCapa && (
                                <span style={{ color: "oklch(0.80 0.180 55)" }}>
                                  CAPA
                                </span>
                              )}
                              {r.isInHistory && (
                                <span
                                  style={{ color: "oklch(0.65 0.150 232)" }}
                                >
                                  Hist
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </motion.div>

          {/* Rejected notice */}
          {user?.role === "operator" &&
            myRecords.some((r) => r.status === "rejected") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 rounded-lg flex items-center gap-3"
                style={{
                  background: "oklch(0.40 0.150 25 / 0.15)",
                  border: "1px solid oklch(0.55 0.150 25 / 0.4)",
                }}
              >
                <XCircle
                  className="w-5 h-5 shrink-0"
                  style={{ color: "oklch(0.72 0.200 25)" }}
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.72 0.200 25)" }}
                  >
                    Submission Rejected
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    Admin has rejected one or more submissions. Submit a new
                    breakdown slip with corrections.
                  </p>
                </div>
              </motion.div>
            )}

          {/* Approved notice */}
          {user?.role === "operator" &&
            myRecords.some(
              (r) =>
                r.status === "approved-breakdown" ||
                r.status === "approved-service",
            ) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 rounded-lg flex items-center gap-3"
                style={{
                  background: "oklch(0.45 0.120 145 / 0.15)",
                  border: "1px solid oklch(0.52 0.120 145 / 0.4)",
                }}
              >
                <CheckCircle2
                  className="w-5 h-5 shrink-0"
                  style={{ color: "oklch(0.75 0.130 145)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "oklch(0.75 0.130 145)" }}
                >
                  Some submissions have been approved.
                </p>
              </motion.div>
            )}
        </main>

        <footer
          className="border-t py-4"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-5xl mx-auto px-4 text-center">
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
