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
  Edit2,
  FileSpreadsheet,
  History,
  Plus,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { HistoryCardEntry } from "../context/AppContext";

interface HistoryTabProps {
  user: { role: string; name: string; username: string } | null;
  machines: Array<{ id: string; name: string }>;
  historyCards: HistoryCardEntry[];
  addHistoryEntry: (entry: HistoryCardEntry) => void;
  updateHistoryEntry: (id: string, updates: Partial<HistoryCardEntry>) => void;
  deleteHistoryEntry: (id: string) => void;
  importHistoryEntries: (entries: HistoryCardEntry[]) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class HistoryTabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error?.message || "Unknown error" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="p-8 text-center rounded-lg"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.62 0.220 25 / 0.4)",
            color: "oklch(0.75 0.200 25)",
          }}
        >
          <p className="font-semibold mb-2">History tab encountered an error</p>
          <p className="text-xs" style={{ color: "oklch(0.65 0.010 260)" }}>
            {this.state.error}
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: "oklch(0.65 0.010 260)" }}
          >
            Try refreshing the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HistoryTab({
  user,
  machines,
  historyCards,
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  importHistoryEntries,
}: HistoryTabProps) {
  const XLSX = (window as any).XLSX;

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };

  const [histMachineFilter, setHistMachineFilter] = useState("all");
  const [histDialogOpen, setHistDialogOpen] = useState(false);
  const [histEditId, setHistEditId] = useState<string | null>(null);
  const [histForm, setHistForm] = useState<Partial<HistoryCardEntry>>({});
  const histImportRef = useRef<HTMLInputElement>(null);

  const filteredHistory = useMemo(
    () =>
      histMachineFilter !== "all"
        ? historyCards.filter(
            (h) =>
              h.machineId === histMachineFilter ||
              h.machineName?.includes(histMachineFilter),
          )
        : historyCards,
    [historyCards, histMachineFilter],
  );

  function openHistEdit(h: HistoryCardEntry) {
    setHistEditId(h.id);
    setHistForm({ ...h });
  }

  function saveHistEdit() {
    if (histEditId) {
      updateHistoryEntry(histEditId, histForm);
      toast.success("History entry updated");
    } else {
      if (!histForm.machineId || !histForm.date) {
        toast.error("Machine and date are required");
        return;
      }
      addHistoryEntry({
        id: `hist-${Date.now()}`,
        machineId: histForm.machineId ?? "",
        machineName: histForm.machineName,
        date: histForm.date ?? "",
        eventType: histForm.eventType ?? "Other",
        durationMinutes: histForm.durationMinutes,
        problemDescription: histForm.problemDescription ?? "",
        actionTaken: histForm.actionTaken ?? "",
        doneBy: histForm.doneBy ?? "",
        remarks: histForm.remarks ?? "",
        createdAt: Date.now(),
      });
      toast.success("History entry added");
    }
    setHistDialogOpen(false);
    setHistEditId(null);
    setHistForm({});
  }

  let tableContent: React.ReactNode;
  try {
    tableContent = filteredHistory
      .filter((h) => h?.id)
      .map((h, idx) => (
        <TableRow
          key={h.id}
          data-ocid={`history.row.${idx + 1}`}
          style={{ borderColor: "oklch(0.28 0.025 252)" }}
        >
          <TableCell
            className="font-semibold text-sm"
            style={{ color: "oklch(0.80 0.180 55)" }}
          >
            {String(h.machineName || h.machineId || "")}
          </TableCell>
          <TableCell
            className="text-xs"
            style={{ color: "oklch(0.68 0.010 260)" }}
          >
            {String(h.date || "")}
          </TableCell>
          <TableCell>
            <Badge
              style={{
                background:
                  String(h.eventType || "Other") === "Breakdown"
                    ? "oklch(0.62 0.220 25 / 0.15)"
                    : "oklch(0.50 0.065 232 / 0.15)",
                color:
                  String(h.eventType || "Other") === "Breakdown"
                    ? "oklch(0.75 0.200 25)"
                    : "oklch(0.65 0.150 232)",
                border: "1px solid currentColor",
              }}
            >
              {String(h.eventType || "Other")}
            </Badge>
          </TableCell>
          <TableCell className="text-xs">
            {h.durationMinutes != null ? `${h.durationMinutes} min` : "\u2014"}
          </TableCell>
          <TableCell className="text-xs max-w-[150px] truncate">
            {String(h.problemDescription || "") || "\u2014"}
          </TableCell>
          <TableCell className="text-xs max-w-[150px] truncate">
            {String(h.actionTaken || "") || "\u2014"}
          </TableCell>
          <TableCell className="text-xs">
            {String(h.doneBy || "") || "\u2014"}
          </TableCell>
          <TableCell className="text-xs max-w-[100px] truncate">
            {String(h.remarks || "") || "\u2014"}
          </TableCell>
          {user?.role === "admin" && (
            <TableCell>
              <div className="flex gap-1">
                <button
                  type="button"
                  data-ocid={`history.edit_button.${idx + 1}`}
                  onClick={() => {
                    openHistEdit(h);
                    setHistDialogOpen(true);
                  }}
                  className="p-1.5 rounded"
                  style={{ color: "oklch(0.65 0.150 232)" }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-ocid={`history.delete_button.${idx + 1}`}
                  onClick={() => {
                    deleteHistoryEntry(h.id);
                    toast.success("Entry deleted");
                  }}
                  className="p-1.5 rounded"
                  style={{ color: "oklch(0.72 0.200 25)" }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </TableCell>
          )}
        </TableRow>
      ));
  } catch {
    tableContent = (
      <TableRow>
        <TableCell colSpan={9}>
          <div
            className="p-4 text-center text-sm"
            style={{ color: "oklch(0.72 0.200 25)" }}
          >
            Error displaying history entries. Please refresh the page.
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <HistoryTabErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History
              className="w-5 h-5"
              style={{ color: "oklch(0.65 0.150 232)" }}
            />
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Machine History Cards
            </h2>
            <Badge
              style={{
                background: "oklch(0.50 0.065 232 / 0.15)",
                color: "oklch(0.65 0.150 232)",
                border: "1px solid oklch(0.50 0.065 232 / 0.4)",
              }}
            >
              {historyCards.length}
            </Badge>
          </div>
          <div className="flex gap-2">
            {user?.role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setHistEditId(null);
                    setHistForm({
                      machineId: "",
                      date: new Date().toISOString().split("T")[0],
                      eventType: "Other",
                      problemDescription: "",
                      actionTaken: "",
                      doneBy: "",
                      remarks: "",
                    });
                    setHistDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: "oklch(0.45 0.120 145 / 0.15)",
                    color: "oklch(0.75 0.130 145)",
                    border: "1px solid oklch(0.52 0.120 145 / 0.4)",
                  }}
                  data-ocid="history.open_modal_button"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Entry
                </button>
                <button
                  type="button"
                  onClick={() => histImportRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.15)",
                    color: "oklch(0.65 0.150 232)",
                    border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                  }}
                  data-ocid="history.import.button"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Import
                </button>
                <input
                  ref={histImportRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const wb = XLSX.read(ev.target?.result as ArrayBuffer, {
                          type: "array",
                        });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(ws) as Record<
                          string,
                          string
                        >[];
                        const entries = rows.map((row, idx) => ({
                          id: `hist-import-${Date.now()}-${idx}`,
                          machineId: row.MachineID ?? "",
                          machineName: row.MachineName,
                          date: row.Date ?? "",
                          eventType:
                            (row.EventType as HistoryCardEntry["eventType"]) ??
                            "Other",
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
                        toast.success(
                          `Imported ${entries.length} history entries`,
                        );
                      } catch {
                        toast.error("Failed to parse file");
                      }
                    };
                    reader.readAsArrayBuffer(file);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            <Select
              value={histMachineFilter}
              onValueChange={setHistMachineFilter}
            >
              <SelectTrigger className="w-40 h-8 text-xs" style={inputStyle}>
                <SelectValue placeholder="Filter by machine" />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.22 0.022 252)" }}>
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
          </div>
        </div>

        <div className="industrial-card overflow-hidden">
          {filteredHistory.filter((h) => h?.id).length === 0 ? (
            <div className="p-10 text-center" data-ocid="history.empty_state">
              <Activity
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "oklch(0.45 0.010 260)" }}
              />
              <p className="text-sm" style={{ color: "oklch(0.68 0.010 260)" }}>
                No history entries yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="history.table">
                <TableHeader>
                  <TableRow style={{ borderColor: "oklch(0.34 0.030 252)" }}>
                    {[
                      "Machine",
                      "Date",
                      "Event",
                      "Duration",
                      "Problem",
                      "Action",
                      "Done By",
                      "Remarks",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-xs"
                        style={{ color: "oklch(0.65 0.010 260)" }}
                      >
                        {h}
                      </TableHead>
                    ))}
                    {user?.role === "admin" && (
                      <TableHead
                        className="text-xs"
                        style={{ color: "oklch(0.65 0.010 260)" }}
                      >
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>{tableContent}</TableBody>
              </Table>
            </div>
          )}
        </div>
      </motion.div>

      {/* History Entry Dialog */}
      <Dialog
        open={histDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setHistDialogOpen(false);
            setHistEditId(null);
            setHistForm({});
          }
        }}
      >
        <DialogContent
          className="max-w-lg"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.34 0.030 252)",
            color: "oklch(0.88 0.010 260)",
          }}
          data-ocid="history.dialog"
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              {histEditId ? "Edit" : "Add"} History Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Machine
                </Label>
                <Select
                  value={histForm.machineId ?? ""}
                  onValueChange={(v) => {
                    const m = machines.find((x) => x.id === v);
                    setHistForm((f) => ({
                      ...f,
                      machineId: v,
                      machineName: m?.name,
                    }));
                  }}
                >
                  <SelectTrigger style={inputStyle}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent
                    style={{ background: "oklch(0.22 0.022 252)" }}
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
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Date
                </Label>
                <Input
                  type="date"
                  value={histForm.date ?? ""}
                  onChange={(e) =>
                    setHistForm((f) => ({ ...f, date: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Event Type
                </Label>
                <Select
                  value={histForm.eventType ?? "Other"}
                  onValueChange={(v) =>
                    setHistForm((f) => ({
                      ...f,
                      eventType: v as HistoryCardEntry["eventType"],
                    }))
                  }
                >
                  <SelectTrigger style={inputStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{ background: "oklch(0.22 0.022 252)" }}
                  >
                    {["Breakdown", "PM", "Repair", "Other"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
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
                  Duration (min)
                </Label>
                <Input
                  type="number"
                  value={histForm.durationMinutes ?? ""}
                  onChange={(e) =>
                    setHistForm((f) => ({
                      ...f,
                      durationMinutes: Number(e.target.value) || undefined,
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
                  Done By
                </Label>
                <Input
                  value={histForm.doneBy ?? ""}
                  onChange={(e) =>
                    setHistForm((f) => ({ ...f, doneBy: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>
            </div>
            {[
              { key: "problemDescription", label: "Problem Description" },
              { key: "actionTaken", label: "Action Taken" },
              { key: "remarks", label: "Remarks" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  {label}
                </Label>
                <Textarea
                  value={String(histForm[key as keyof HistoryCardEntry] ?? "")}
                  onChange={(e) =>
                    setHistForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  rows={2}
                  style={inputStyle}
                />
              </div>
            ))}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setHistDialogOpen(false);
                  setHistEditId(null);
                  setHistForm({});
                }}
                data-ocid="history.cancel_button"
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveHistEdit}
                data-ocid="history.save_button"
                style={{
                  background: "oklch(0.45 0.120 145 / 0.25)",
                  color: "oklch(0.75 0.130 145)",
                  border: "1px solid oklch(0.52 0.120 145 / 0.5)",
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HistoryTabErrorBoundary>
  );
}
