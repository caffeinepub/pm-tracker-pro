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
  Activity,
  ArrowLeft,
  Download,
  Edit,
  FileSpreadsheet,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import NotificationBell from "../components/NotificationBell";
import type { HistoryCardEntry } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const EVENT_TYPES: HistoryCardEntry["eventType"][] = [
  "Breakdown",
  "PM",
  "Repair",
  "Other",
];

const eventTypeBadge = (type: HistoryCardEntry["eventType"]) => {
  const map: Record<string, { bg: string; color: string }> = {
    Breakdown: {
      bg: "oklch(0.62 0.220 25 / 0.15)",
      color: "oklch(0.72 0.170 27)",
    },
    PM: { bg: "oklch(0.45 0.120 145 / 0.15)", color: "oklch(0.75 0.130 145)" },
    Repair: { bg: "oklch(0.55 0.15 60 / 0.15)", color: "oklch(0.82 0.16 60)" },
    Other: {
      bg: "oklch(0.34 0.030 252 / 0.4)",
      color: "oklch(0.68 0.010 260)",
    },
  };
  const s = map[type] ?? map.Other;
  return (
    <Badge
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
      }}
    >
      {type}
    </Badge>
  );
};

type FormState = Omit<HistoryCardEntry, "id" | "createdAt" | "sourceId">;

const emptyForm = (): FormState => ({
  machineId: "",
  date: new Date().toISOString().split("T")[0],
  eventType: "Breakdown",
  durationMinutes: 0,
  problemDescription: "",
  actionTaken: "",
  doneBy: "",
  remarks: "",
});

const XLSX = (window as any).XLSX;

export default function HistoryPage() {
  const {
    user,
    logout,
    navigate,
    machines,
    historyCards,
    addHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
    importHistoryEntries,
  } = useApp();

  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (machineFilter === "all") return historyCards;
    return historyCards.filter((h) => h.machineId === machineFilter);
  }, [historyCards, machineFilter]);

  // MTTR / MTBF for selected machine
  const { mttr, mtbf } = useMemo(() => {
    if (machineFilter === "all") return { mttr: null, mtbf: null };
    const bds = filtered.filter(
      (h) => h.eventType === "Breakdown" && (h.durationMinutes ?? 0) > 0,
    );
    const avgMttr =
      bds.length > 0
        ? Math.round(
            bds.reduce((s, h) => s + (h.durationMinutes ?? 0), 0) / bds.length,
          )
        : null;
    let avgMtbf: number | null = null;
    if (bds.length > 1) {
      const sorted = [...bds].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          (new Date(sorted[i].date).getTime() -
            new Date(sorted[i - 1].date).getTime()) /
          (1000 * 60 * 60 * 24);
        gaps.push(diff);
      }
      avgMtbf = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }
    return { mttr: avgMttr, mtbf: avgMtbf };
  }, [filtered, machineFilter]);

  const handleAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const handleEditOpen = (entry: HistoryCardEntry) => {
    setEditId(entry.id);
    setForm({
      machineId: entry.machineId,
      date: entry.date,
      eventType: entry.eventType,
      durationMinutes: entry.durationMinutes ?? 0,
      problemDescription: entry.problemDescription,
      actionTaken: entry.actionTaken,
      doneBy: entry.doneBy,
      remarks: entry.remarks,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.machineId || !form.date || !form.problemDescription) {
      toast.error("Machine, Date, and Problem Description are required");
      return;
    }
    if (editId) {
      updateHistoryEntry(editId, form);
      toast.success("History entry updated");
    } else {
      addHistoryEntry({
        ...form,
        id: `hist-manual-${Date.now()}`,
        createdAt: Date.now(),
      });
      toast.success("History entry added");
    }
    setShowDialog(false);
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    toast.success("Entry deleted");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const entries: HistoryCardEntry[] = rows.map((row, idx) => ({
          id: `hist-import-${Date.now()}-${idx}`,
          machineId: row.MachineID ?? "",
          date: row.Date ?? new Date().toISOString().split("T")[0],
          eventType:
            (row.EventType as HistoryCardEntry["eventType"]) ?? "Other",
          durationMinutes: row.DurationMinutes
            ? Number(row.DurationMinutes)
            : undefined,
          problemDescription: row.ProblemDescription ?? "",
          actionTaken: row.ActionTaken ?? "",
          doneBy: row.DoneBy ?? "",
          remarks: row.Remarks ?? "",
          createdAt: Date.now(),
        }));
        importHistoryEntries(entries);
        toast.success(`Imported ${entries.length} history entries`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "MachineID",
        "Date",
        "EventType",
        "DurationMinutes",
        "ProblemDescription",
        "ActionTaken",
        "DoneBy",
        "Remarks",
      ],
      [
        "M001",
        "2026-01-15",
        "Breakdown",
        "120",
        "Spindle motor failure",
        "Replaced motor",
        "Maintenance Team",
        "Spare part used",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HistoryCards");
    XLSX.writeFile(wb, "HistoryCard_Template.xlsx");
  };

  const machineName = (id: string) =>
    machines.find((m) => m.id === id)?.name ?? id;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.13 0.025 252)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          background: "oklch(0.17 0.030 252)",
          borderBottom: "1px solid oklch(0.28 0.030 252)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="p-2 rounded-lg"
            style={{ color: "oklch(0.75 0.008 260)" }}
            data-ocid="history.back.button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Activity
            className="w-5 h-5"
            style={{ color: "oklch(0.65 0.150 232)" }}
          />
          <h1
            className="text-base font-bold"
            style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
          >
            Machine History Cards
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg"
            style={{ color: "oklch(0.68 0.010 260)" }}
            data-ocid="history.logout.button"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20">
        {/* Filters + Actions */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <Select value={machineFilter} onValueChange={setMachineFilter}>
            <SelectTrigger
              className="w-44"
              data-ocid="history.machine_filter.select"
              style={{
                background: "oklch(0.17 0.030 252)",
                borderColor: "oklch(0.28 0.030 252)",
              }}
            >
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "oklch(0.17 0.030 252)",
                borderColor: "oklch(0.28 0.030 252)",
              }}
            >
              <SelectItem value="all">All Machines</SelectItem>
              {machines
                .filter((m) => m.id)
                .map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {user?.role === "admin" && (
            <>
              <Button
                size="sm"
                onClick={handleAdd}
                data-ocid="history.add.button"
                style={{
                  background: "oklch(0.50 0.065 232)",
                  color: "oklch(0.96 0.004 260)",
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-ocid="history.import.button"
                style={{
                  borderColor: "oklch(0.50 0.065 232 / 0.5)",
                  color: "oklch(0.65 0.150 232)",
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Import Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadTemplate}
                data-ocid="history.download_template.button"
                style={{
                  borderColor: "oklch(0.40 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
            </>
          )}
        </div>

        {/* MTTR/MTBF KPI when machine selected */}
        {machineFilter !== "all" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
          >
            <div className="industrial-card p-3">
              <div
                className="text-xs mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Machine
              </div>
              <div
                className="text-base font-bold"
                style={{
                  color: "oklch(0.88 0.008 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {machineName(machineFilter)}
              </div>
            </div>
            <div className="industrial-card p-3">
              <div
                className="text-xs mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Total Events
              </div>
              <div
                className="text-2xl font-bold"
                style={{
                  color: "oklch(0.65 0.150 232)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {filtered.length}
              </div>
            </div>
            <div className="industrial-card p-3">
              <div
                className="text-xs mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                MTTR (avg min)
              </div>
              <div
                className="text-2xl font-bold"
                style={{
                  color: "oklch(0.80 0.180 55)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {mttr ?? "—"}
              </div>
            </div>
            <div className="industrial-card p-3">
              <div
                className="text-xs mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                MTBF (avg days)
              </div>
              <div
                className="text-2xl font-bold"
                style={{
                  color: "oklch(0.75 0.130 145)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {mtbf ?? "—"}
              </div>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="industrial-card overflow-hidden"
        >
          {filtered.length === 0 ? (
            <div
              className="p-12 text-center"
              data-ocid="history.table.empty_state"
            >
              <Activity
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "oklch(0.40 0.010 260)" }}
              />
              <p className="text-sm" style={{ color: "oklch(0.55 0.010 260)" }}>
                No history entries yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="history.table">
                <TableHeader>
                  <TableRow style={{ borderColor: "oklch(0.28 0.030 252)" }}>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Date
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Type
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Machine
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Duration (min)
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Problem
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Action Taken
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Done By
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Remarks
                    </TableHead>
                    {user?.role === "admin" && (
                      <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      style={{ borderColor: "oklch(0.24 0.028 252)" }}
                      data-ocid={`history.table.item.${idx + 1}`}
                    >
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {entry.date}
                      </TableCell>
                      <TableCell>{eventTypeBadge(entry.eventType)}</TableCell>
                      <TableCell
                        className="font-medium"
                        style={{ color: "oklch(0.88 0.008 260)" }}
                      >
                        {machineName(entry.machineId)}
                      </TableCell>
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {entry.durationMinutes ?? "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[140px] truncate"
                        style={{ color: "oklch(0.75 0.008 260)" }}
                      >
                        {entry.problemDescription}
                      </TableCell>
                      <TableCell
                        className="max-w-[140px] truncate"
                        style={{ color: "oklch(0.75 0.008 260)" }}
                      >
                        {entry.actionTaken}
                      </TableCell>
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {entry.doneBy}
                      </TableCell>
                      <TableCell
                        className="max-w-[120px] truncate"
                        style={{ color: "oklch(0.55 0.010 260)" }}
                      >
                        {entry.remarks || "—"}
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditOpen(entry)}
                              data-ocid={`history.edit_button.${idx + 1}`}
                              style={{ color: "oklch(0.65 0.150 232)" }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                              data-ocid={`history.delete_button.${idx + 1}`}
                              style={{ color: "oklch(0.72 0.170 27)" }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </main>

      {/* Add / Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => !open && setShowDialog(false)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{
            background: "oklch(0.17 0.030 252)",
            border: "1px solid oklch(0.28 0.030 252)",
          }}
          data-ocid="history.entry.dialog"
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              {editId ? "Edit" : "Add"} History Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
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
                    data-ocid="history.entry.machine.select"
                    style={{
                      background: "oklch(0.13 0.025 252)",
                      borderColor: "oklch(0.28 0.030 252)",
                    }}
                  >
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.17 0.030 252)",
                      borderColor: "oklch(0.28 0.030 252)",
                    }}
                  >
                    {machines
                      .filter((m) => m.id)
                      .map((m) => (
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
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Date *
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="history.entry.date.input"
                  style={{
                    background: "oklch(0.13 0.025 252)",
                    borderColor: "oklch(0.28 0.030 252)",
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Event Type
                </Label>
                <Select
                  value={form.eventType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      eventType: v as HistoryCardEntry["eventType"],
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="history.entry.event_type.select"
                    style={{
                      background: "oklch(0.13 0.025 252)",
                      borderColor: "oklch(0.28 0.030 252)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.17 0.030 252)",
                      borderColor: "oklch(0.28 0.030 252)",
                    }}
                  >
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Duration (min)
                </Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  data-ocid="history.entry.duration.input"
                  style={{
                    background: "oklch(0.13 0.025 252)",
                    borderColor: "oklch(0.28 0.030 252)",
                  }}
                />
              </div>
            </div>
            <div>
              <Label
                className="text-xs"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Problem Description *
              </Label>
              <Textarea
                value={form.problemDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, problemDescription: e.target.value }))
                }
                rows={2}
                data-ocid="history.entry.problem.textarea"
                style={{
                  background: "oklch(0.13 0.025 252)",
                  borderColor: "oklch(0.28 0.030 252)",
                }}
              />
            </div>
            <div>
              <Label
                className="text-xs"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Action Taken
              </Label>
              <Textarea
                value={form.actionTaken}
                onChange={(e) =>
                  setForm((f) => ({ ...f, actionTaken: e.target.value }))
                }
                rows={2}
                data-ocid="history.entry.action.textarea"
                style={{
                  background: "oklch(0.13 0.025 252)",
                  borderColor: "oklch(0.28 0.030 252)",
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Done By
                </Label>
                <Input
                  value={form.doneBy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, doneBy: e.target.value }))
                  }
                  data-ocid="history.entry.done_by.input"
                  style={{
                    background: "oklch(0.13 0.025 252)",
                    borderColor: "oklch(0.28 0.030 252)",
                  }}
                />
              </div>
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Remarks
                </Label>
                <Input
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  data-ocid="history.entry.remarks.input"
                  style={{
                    background: "oklch(0.13 0.025 252)",
                    borderColor: "oklch(0.28 0.030 252)",
                  }}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              data-ocid="history.entry.save_button"
              style={{
                background: "oklch(0.50 0.065 232)",
                color: "oklch(0.96 0.004 260)",
              }}
            >
              {editId ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
