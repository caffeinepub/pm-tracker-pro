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
  ArrowLeft,
  Bell,
  Check,
  Download,
  Edit,
  FileSpreadsheet,
  LogOut,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import NotificationBell from "../components/NotificationBell";
import type { CAPARecord } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

export default function CapaPage() {
  const { user, logout, navigate, capaRecords, updateCapa, importCapaRecords } =
    useApp();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CAPARecord>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCapas = capaRecords.filter((c) => c.status === "Open").length;
  const closedCapas = capaRecords.filter((c) => c.status === "Closed").length;

  const handleEditOpen = (capa: CAPARecord) => {
    setEditId(capa.id);
    setEditForm({
      rootCause: capa.rootCause,
      permanentAction: capa.permanentAction,
      responsiblePerson: capa.responsiblePerson,
      targetDate: capa.targetDate,
      status: capa.status,
    });
  };

  const handleEditSave = () => {
    if (!editId) return;
    updateCapa(editId, editForm);
    toast.success("CAPA updated successfully");
    setEditId(null);
    setEditForm({});
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
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "BreakdownID",
        "MachineID",
        "MachineName",
        "Date",
        "ProblemSummary",
        "RootCause",
        "TemporaryAction",
        "PermanentAction",
        "ResponsiblePerson",
        "TargetDate",
        "Status",
      ],
      [
        "BD-001",
        "M001",
        "CNC Machine",
        "2026-01-15",
        "Spindle failure",
        "Bearing worn out",
        "Replaced bearing temporarily",
        "Install new spindle bearing",
        "Maintenance Team",
        "2026-02-01",
        "Open",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CAPA");
    XLSX.writeFile(wb, "CAPA_Template.xlsx");
  };

  const editRecord = capaRecords.find((c) => c.id === editId);

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
            className="p-2 rounded-lg transition-colors"
            style={{ color: "oklch(0.75 0.008 260)" }}
            data-ocid="capa.back.button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield
            className="w-5 h-5"
            style={{ color: "oklch(0.80 0.180 55)" }}
          />
          <h1
            className="text-base font-bold"
            style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
          >
            CAPA Records
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-2 ml-4">
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
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg"
            style={{ color: "oklch(0.68 0.010 260)" }}
            data-ocid="capa.logout.button"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20">
        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="industrial-card p-4">
            <div
              className="text-xs mb-1"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              Open CAPAs
            </div>
            <div
              className="text-3xl font-bold"
              style={{
                color: "oklch(0.72 0.170 27)",
                fontFamily: "BricolageGrotesque, sans-serif",
              }}
            >
              {openCapas}
            </div>
          </div>
          <div className="industrial-card p-4">
            <div
              className="text-xs mb-1"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              Closed CAPAs
            </div>
            <div
              className="text-3xl font-bold"
              style={{
                color: "oklch(0.75 0.130 145)",
                fontFamily: "BricolageGrotesque, sans-serif",
              }}
            >
              {closedCapas}
            </div>
          </div>
        </motion.div>

        {/* Admin Actions */}
        {user?.role === "admin" && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="capa.import.button"
              style={{
                borderColor: "oklch(0.50 0.065 232 / 0.5)",
                color: "oklch(0.65 0.150 232)",
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Import Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadTemplate}
              data-ocid="capa.download_template.button"
              style={{
                borderColor: "oklch(0.40 0.030 252)",
                color: "oklch(0.68 0.010 260)",
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />
          </div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="industrial-card overflow-hidden"
        >
          {capaRecords.length === 0 ? (
            <div
              className="p-12 text-center"
              data-ocid="capa.table.empty_state"
            >
              <Shield
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "oklch(0.40 0.010 260)" }}
              />
              <p className="text-sm" style={{ color: "oklch(0.55 0.010 260)" }}>
                No CAPA records yet. They are auto-created when a breakdown
                &gt;60 min is approved.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="capa.table">
                <TableHeader>
                  <TableRow style={{ borderColor: "oklch(0.28 0.030 252)" }}>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Machine
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Date
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Problem
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Root Cause
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Permanent Action
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Responsible
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Target Date
                    </TableHead>
                    <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                      Status
                    </TableHead>
                    {user?.role === "admin" && (
                      <TableHead style={{ color: "oklch(0.68 0.010 260)" }}>
                        Action
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capaRecords.map((capa, idx) => (
                    <TableRow
                      key={capa.id}
                      style={{ borderColor: "oklch(0.24 0.028 252)" }}
                      data-ocid={`capa.table.item.${idx + 1}`}
                    >
                      <TableCell
                        className="font-medium"
                        style={{ color: "oklch(0.88 0.008 260)" }}
                      >
                        {capa.machineName}
                      </TableCell>
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {capa.date}
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        style={{ color: "oklch(0.75 0.008 260)" }}
                      >
                        {capa.problemSummary}
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        style={{ color: "oklch(0.75 0.008 260)" }}
                      >
                        {capa.rootCause || (
                          <span style={{ color: "oklch(0.50 0.010 260)" }}>
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        style={{ color: "oklch(0.75 0.008 260)" }}
                      >
                        {capa.permanentAction || (
                          <span style={{ color: "oklch(0.50 0.010 260)" }}>
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {capa.responsiblePerson || "—"}
                      </TableCell>
                      <TableCell style={{ color: "oklch(0.75 0.008 260)" }}>
                        {capa.targetDate || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            background:
                              capa.status === "Open"
                                ? "oklch(0.62 0.220 25 / 0.15)"
                                : "oklch(0.45 0.120 145 / 0.15)",
                            color:
                              capa.status === "Open"
                                ? "oklch(0.72 0.170 27)"
                                : "oklch(0.75 0.130 145)",
                            border: `1px solid ${capa.status === "Open" ? "oklch(0.62 0.220 25 / 0.4)" : "oklch(0.52 0.120 145 / 0.4)"}`,
                          }}
                        >
                          {capa.status}
                        </Badge>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditOpen(capa)}
                            data-ocid={`capa.edit_button.${idx + 1}`}
                            style={{ color: "oklch(0.65 0.150 232)" }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent
          className="max-w-lg"
          style={{
            background: "oklch(0.17 0.030 252)",
            border: "1px solid oklch(0.28 0.030 252)",
          }}
          data-ocid="capa.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Edit CAPA — {editRecord?.machineName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className="text-xs"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Root Cause
              </Label>
              <Textarea
                value={editForm.rootCause ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, rootCause: e.target.value }))
                }
                rows={2}
                data-ocid="capa.edit.root_cause.textarea"
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
                Permanent Action
              </Label>
              <Textarea
                value={editForm.permanentAction ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    permanentAction: e.target.value,
                  }))
                }
                rows={2}
                data-ocid="capa.edit.permanent_action.textarea"
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
                  Responsible Person
                </Label>
                <Input
                  value={editForm.responsiblePerson ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      responsiblePerson: e.target.value,
                    }))
                  }
                  data-ocid="capa.edit.responsible_person.input"
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
                  Target Date
                </Label>
                <Input
                  type="date"
                  value={editForm.targetDate ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                  data-ocid="capa.edit.target_date.input"
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
                Status
              </Label>
              <Select
                value={editForm.status ?? "Open"}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v as "Open" | "Closed" }))
                }
              >
                <SelectTrigger
                  data-ocid="capa.edit.status.select"
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
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleEditSave}
              data-ocid="capa.edit.save_button"
              style={{
                background: "oklch(0.52 0.120 145)",
                color: "oklch(0.96 0.004 260)",
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
