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
  CheckCircle2,
  FileSpreadsheet,
  Lightbulb,
  LogOut,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { KaizenRecord } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

const CATEGORIES: KaizenRecord["category"][] = [
  "Safety",
  "Quality",
  "Cost",
  "Delivery",
  "Environment",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Safety: "oklch(0.78 0.17 27)",
  Quality: "oklch(0.75 0.13 145)",
  Cost: "oklch(0.80 0.180 55)",
  Delivery: "oklch(0.65 0.150 232)",
  Environment: "oklch(0.72 0.14 160)",
  Other: "oklch(0.68 0.010 260)",
};

const EMPTY_FORM = {
  title: "",
  category: "Safety" as KaizenRecord["category"],
  machineArea: "",
  problemDescription: "",
  improvementDescription: "",
  beforePhotoDataUrl: "",
  afterPhotoDataUrl: "",
  submittedBy: "",
};

export default function KaizenPage() {
  const { user, logout, navigate, kaizenRecords, addKaizen, updateKaizen } =
    useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    submittedBy: user?.name ?? "",
  });
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewSlip, setViewSlip] = useState<KaizenRecord | null>(null);
  const [closeDialog, setCloseDialog] = useState<{
    open: boolean;
    id: string;
    remarks: string;
  }>({ open: false, id: "", remarks: "" });
  const filteredRecords = kaizenRecords
    .filter((k) => filterCategory === "all" || k.category === filterCategory)
    .filter((k) => filterStatus === "all" || k.status === filterStatus)
    .sort((a, b) => b.submittedAt - a.submittedAt);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Enter a title");
      return;
    }
    if (!form.problemDescription.trim()) {
      toast.error("Enter problem description");
      return;
    }
    if (!form.improvementDescription.trim()) {
      toast.error("Enter improvement description");
      return;
    }
    const record: KaizenRecord = {
      id: `kaizen-${Date.now()}`,
      title: form.title,
      category: form.category,
      machineArea: form.machineArea,
      problemDescription: form.problemDescription,
      improvementDescription: form.improvementDescription,
      beforePhotoDataUrl: form.beforePhotoDataUrl || undefined,
      afterPhotoDataUrl: form.afterPhotoDataUrl || undefined,
      submittedBy: form.submittedBy || user?.name || "",
      submittedByUsername: user?.username ?? "",
      submittedAt: Date.now(),
      status: "Open",
    };
    addKaizen(record);
    toast.success("Kaizen submitted!");
    setShowForm(false);
    setForm({ ...EMPTY_FORM, submittedBy: user?.name ?? "" });
  }

  function handlePhotoChange(
    field: "beforePhotoDataUrl" | "afterPhotoDataUrl",
    file: File | undefined,
  ) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setForm((f) => ({ ...f, [field]: (ev.target?.result as string) ?? "" }));
    reader.readAsDataURL(file);
  }

  function handleExport() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const data = kaizenRecords.map((k) => ({
      ID: k.id,
      Title: k.title,
      Category: k.category,
      "Machine/Area": k.machineArea,
      "Problem Description": k.problemDescription,
      "Improvement Description": k.improvementDescription,
      "Submitted By": k.submittedBy,
      "Submitted At": new Date(k.submittedAt).toLocaleString(),
      Status: k.status,
      "Closed At": k.closedAt ? new Date(k.closedAt).toLocaleString() : "",
      "Close Remarks": k.closedRemarks ?? "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Kaizen");
    XLSX.writeFile(
      wb,
      `Kaizen_Records_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  function handleCloseKaizen() {
    if (!closeDialog.remarks.trim()) {
      toast.error("Enter closing remarks");
      return;
    }
    updateKaizen(closeDialog.id, {
      status: "Closed",
      closedAt: Date.now(),
      closedRemarks: closeDialog.remarks,
    });
    toast.success("Kaizen closed");
    setCloseDialog({ open: false, id: "", remarks: "" });
  }

  function handlePrint() {
    window.print();
  }

  const navItems = [
    { label: "Dashboard", page: "dashboard" as const },
    { label: "Preventive Maintenance", page: "preventive" as const },
    { label: "Breakdown", page: "breakdown-panel" as const },
    { label: "Analysis", page: "analysis" as const },
  ];

  return (
    <>
      <MorningPopup />
      <style>{`
        @media print {
          body > * { display: none !important; }
          #kaizen-print-area { display: block !important; }
        }
      `}</style>
      <div
        id="kaizen-print-area"
        style={{ display: "none" }}
        className="p-8 text-black bg-white"
      >
        {viewSlip && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center border-b-2 border-black pb-4 mb-6">
              <h1 className="text-2xl font-bold">KAIZEN IMPROVEMENT SLIP</h1>
              <p className="text-sm text-gray-500">
                Plant Maintenance Management System
              </p>
            </div>
            <table className="w-full text-sm border-collapse mb-6">
              <tbody>
                {[
                  ["Kaizen ID", viewSlip.id],
                  ["Date", new Date(viewSlip.submittedAt).toLocaleDateString()],
                  ["Title", viewSlip.title],
                  ["Category", viewSlip.category],
                  ["Machine / Area", viewSlip.machineArea || "-"],
                  ["Submitted By", viewSlip.submittedBy],
                  ["Status", viewSlip.status],
                ].map(([k, v]) => (
                  <tr key={k} className="border border-gray-300">
                    <td className="px-3 py-2 font-semibold bg-gray-100 w-1/3">
                      {k}
                    </td>
                    <td className="px-3 py-2">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mb-4 border border-gray-300 p-3">
              <p className="font-semibold mb-1">
                Problem Description (Before):
              </p>
              <p className="text-sm">{viewSlip.problemDescription}</p>
            </div>
            <div className="mb-4 border border-gray-300 p-3">
              <p className="font-semibold mb-1">
                Improvement Description (After):
              </p>
              <p className="text-sm">{viewSlip.improvementDescription}</p>
            </div>
            {(viewSlip.beforePhotoDataUrl || viewSlip.afterPhotoDataUrl) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {viewSlip.beforePhotoDataUrl && (
                  <div>
                    <p className="font-semibold mb-1 text-sm">Before Photo:</p>
                    <img
                      src={viewSlip.beforePhotoDataUrl}
                      alt="Before"
                      className="w-full max-h-48 object-contain border"
                    />
                  </div>
                )}
                {viewSlip.afterPhotoDataUrl && (
                  <div>
                    <p className="font-semibold mb-1 text-sm">After Photo:</p>
                    <img
                      src={viewSlip.afterPhotoDataUrl}
                      alt="After"
                      className="w-full max-h-48 object-contain border"
                    />
                  </div>
                )}
              </div>
            )}
            {viewSlip.closedRemarks && (
              <div className="border border-gray-300 p-3">
                <p className="font-semibold mb-1">Closing Remarks:</p>
                <p className="text-sm">{viewSlip.closedRemarks}</p>
              </div>
            )}
          </div>
        )}
      </div>

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
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "oklch(0.55 0.14 290 / 0.15)",
                  border: "1px solid oklch(0.55 0.14 290 / 0.4)",
                }}
              >
                <Lightbulb
                  className="w-4 h-4"
                  style={{ color: "oklch(0.75 0.16 290)" }}
                />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Kaizen{" "}
                <span style={{ color: "oklch(0.75 0.16 290)" }}>Panel</span>
              </span>
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    data-ocid="nav.link"
                    onClick={() => navigate(item.page)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                size="sm"
                onClick={handleExport}
                data-ocid="kaizen.export.button"
                style={{
                  background: "oklch(0.30 0.060 145 / 0.25)",
                  color: "oklch(0.75 0.13 145)",
                  border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Excel
              </Button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "oklch(0.40 0.150 25 / 0.15)",
                  color: "oklch(0.72 0.170 25)",
                  border: "1px solid oklch(0.55 0.150 25 / 0.3)",
                }}
                data-ocid="kaizen.logout.button"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-24 md:pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-xl font-bold"
                style={{
                  fontFamily: "BricolageGrotesque, sans-serif",
                  color: "oklch(0.88 0.010 260)",
                }}
              >
                Kaizen Improvements
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: "oklch(0.55 0.010 260)" }}
              >
                Submit and track improvement ideas from operators and admin
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              data-ocid="kaizen.open_modal_button"
              style={{
                background: "oklch(0.55 0.14 290 / 0.20)",
                color: "oklch(0.75 0.16 290)",
                border: "1px solid oklch(0.55 0.14 290 / 0.4)",
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Submit New Kaizen
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger
                className="w-40"
                style={{
                  background: "oklch(0.22 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.88 0.010 260)",
                  fontSize: "13px",
                }}
                data-ocid="kaizen.select"
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(0.22 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                }}
              >
                <SelectItem
                  value="all"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  All Categories
                </SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                className="w-36"
                style={{
                  background: "oklch(0.22 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.88 0.010 260)",
                  fontSize: "13px",
                }}
                data-ocid="kaizen.select"
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(0.22 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                }}
              >
                <SelectItem
                  value="all"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  All Status
                </SelectItem>
                <SelectItem
                  value="Open"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  Open
                </SelectItem>
                <SelectItem
                  value="Closed"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge
              style={{
                background: "oklch(0.55 0.14 290 / 0.15)",
                color: "oklch(0.75 0.16 290)",
                border: "1px solid oklch(0.55 0.14 290 / 0.3)",
              }}
            >
              {filteredRecords.length} records
            </Badge>
          </div>

          {/* Table */}
          {filteredRecords.length === 0 ? (
            <div
              data-ocid="kaizen.empty_state"
              className="industrial-card p-12 text-center"
            >
              <Lightbulb
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "oklch(0.45 0.010 260)" }}
              />
              <p
                className="font-medium"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                No kaizen records yet
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "oklch(0.50 0.010 260)" }}
              >
                Submit improvement ideas to get started
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="industrial-card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "oklch(0.34 0.030 252)" }}>
                      {[
                        "#",
                        "Date",
                        "Title",
                        "Category",
                        "Machine/Area",
                        "Submitted By",
                        "Status",
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
                    {filteredRecords.map((k, idx) => (
                      <TableRow
                        key={k.id}
                        data-ocid={`kaizen.row.${idx + 1}`}
                        style={{ borderColor: "oklch(0.28 0.025 252)" }}
                      >
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.55 0.010 260)" }}
                        >
                          {idx + 1}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {new Date(k.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-sm"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {k.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{
                              background: `${CATEGORY_COLORS[k.category]}22`,
                              color: CATEGORY_COLORS[k.category],
                              border: `1px solid ${CATEGORY_COLORS[k.category]}55`,
                              fontSize: "11px",
                            }}
                          >
                            {k.category}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {k.machineArea || "-"}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {k.submittedBy}
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{
                              background:
                                k.status === "Closed"
                                  ? "oklch(0.30 0.090 145 / 0.25)"
                                  : "oklch(0.35 0.090 55 / 0.25)",
                              color:
                                k.status === "Closed"
                                  ? "oklch(0.75 0.130 145)"
                                  : "oklch(0.80 0.180 55)",
                              border: `1px solid ${k.status === "Closed" ? "oklch(0.52 0.12 145 / 0.4)" : "oklch(0.70 0.18 55 / 0.4)"}`,
                              fontWeight: "bold",
                            }}
                          >
                            {k.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewSlip(k)}
                              data-ocid={`kaizen.edit_button.${idx + 1}`}
                              style={{
                                fontSize: "11px",
                                borderColor: "oklch(0.34 0.030 252)",
                                color: "oklch(0.68 0.010 260)",
                                height: "26px",
                                padding: "0 8px",
                              }}
                            >
                              <Printer className="w-3 h-3 mr-1" /> Slip
                            </Button>
                            {user?.role === "admin" && k.status === "Open" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setCloseDialog({
                                    open: true,
                                    id: k.id,
                                    remarks: "",
                                  })
                                }
                                data-ocid={`kaizen.close_button.${idx + 1}`}
                                style={{
                                  fontSize: "11px",
                                  background: "oklch(0.30 0.090 145 / 0.2)",
                                  color: "oklch(0.75 0.130 145)",
                                  border:
                                    "1px solid oklch(0.52 0.12 145 / 0.4)",
                                  height: "26px",
                                  padding: "0 8px",
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Close
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </main>

        {/* Submit Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="kaizen.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  color: "oklch(0.88 0.010 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb
                    className="w-5 h-5"
                    style={{ color: "oklch(0.75 0.16 290)" }}
                  />
                  Submit New Kaizen
                </div>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Title *
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Brief title of the improvement"
                  data-ocid="kaizen.input"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Category *
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        category: v as KaizenRecord["category"],
                      }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="kaizen.select"
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
                      {CATEGORIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {c}
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
                    Machine / Area
                  </Label>
                  <Input
                    value={form.machineArea}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, machineArea: e.target.value }))
                    }
                    placeholder="Machine name or area"
                    data-ocid="kaizen.input"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.88 0.010 260)",
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Problem Description (Before) *
                </Label>
                <Textarea
                  value={form.problemDescription}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      problemDescription: e.target.value,
                    }))
                  }
                  placeholder="Describe the problem or current situation..."
                  rows={3}
                  data-ocid="kaizen.textarea"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Improvement Description (After) *
                </Label>
                <Textarea
                  value={form.improvementDescription}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      improvementDescription: e.target.value,
                    }))
                  }
                  placeholder="Describe the improvement and expected benefit..."
                  rows={3}
                  data-ocid="kaizen.textarea"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Before Photo
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handlePhotoChange(
                        "beforePhotoDataUrl",
                        e.target.files?.[0],
                      )
                    }
                    className="block w-full text-xs"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                    data-ocid="kaizen.upload_button"
                  />
                  {form.beforePhotoDataUrl && (
                    <img
                      src={form.beforePhotoDataUrl}
                      alt="Before"
                      className="mt-1 rounded max-h-24 object-cover"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    After Photo
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handlePhotoChange(
                        "afterPhotoDataUrl",
                        e.target.files?.[0],
                      )
                    }
                    className="block w-full text-xs"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                    data-ocid="kaizen.upload_button"
                  />
                  {form.afterPhotoDataUrl && (
                    <img
                      src={form.afterPhotoDataUrl}
                      alt="After"
                      className="mt-1 rounded max-h-24 object-cover"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Submitted By
                </Label>
                <Input
                  value={form.submittedBy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, submittedBy: e.target.value }))
                  }
                  data-ocid="kaizen.input"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  data-ocid="kaizen.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-ocid="kaizen.submit_button"
                  style={{
                    background: "oklch(0.55 0.14 290 / 0.25)",
                    color: "oklch(0.75 0.16 290)",
                    border: "1px solid oklch(0.55 0.14 290 / 0.5)",
                  }}
                >
                  Submit Kaizen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Slip Dialog */}
        <Dialog open={!!viewSlip} onOpenChange={(o) => !o && setViewSlip(null)}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="kaizen.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  color: "oklch(0.88 0.010 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                Kaizen Improvement Slip
              </DialogTitle>
            </DialogHeader>
            {viewSlip && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Title", viewSlip.title],
                    ["Category", viewSlip.category],
                    ["Machine/Area", viewSlip.machineArea || "-"],
                    ["Submitted By", viewSlip.submittedBy],
                    [
                      "Date",
                      new Date(viewSlip.submittedAt).toLocaleDateString(),
                    ],
                    ["Status", viewSlip.status],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded p-2"
                      style={{ background: "oklch(0.19 0.020 255)" }}
                    >
                      <p
                        className="text-xs"
                        style={{ color: "oklch(0.55 0.010 260)" }}
                      >
                        {k}
                      </p>
                      <p
                        className="font-semibold"
                        style={{ color: "oklch(0.88 0.010 260)" }}
                      >
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="rounded p-3"
                  style={{ background: "oklch(0.19 0.020 255)" }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Problem Description (Before)
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    {viewSlip.problemDescription}
                  </p>
                </div>
                <div
                  className="rounded p-3"
                  style={{ background: "oklch(0.19 0.020 255)" }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Improvement Description (After)
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    {viewSlip.improvementDescription}
                  </p>
                </div>
                {(viewSlip.beforePhotoDataUrl ||
                  viewSlip.afterPhotoDataUrl) && (
                  <div className="grid grid-cols-2 gap-3">
                    {viewSlip.beforePhotoDataUrl && (
                      <div>
                        <p
                          className="text-xs mb-1"
                          style={{ color: "oklch(0.55 0.010 260)" }}
                        >
                          Before Photo
                        </p>
                        <img
                          src={viewSlip.beforePhotoDataUrl}
                          alt="Before"
                          className="rounded max-h-36 w-full object-contain"
                          style={{ border: "1px solid oklch(0.34 0.030 252)" }}
                        />
                      </div>
                    )}
                    {viewSlip.afterPhotoDataUrl && (
                      <div>
                        <p
                          className="text-xs mb-1"
                          style={{ color: "oklch(0.55 0.010 260)" }}
                        >
                          After Photo
                        </p>
                        <img
                          src={viewSlip.afterPhotoDataUrl}
                          alt="After"
                          className="rounded max-h-36 w-full object-contain"
                          style={{ border: "1px solid oklch(0.34 0.030 252)" }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={handlePrint}
                    data-ocid="kaizen.primary_button"
                    style={{
                      background: "oklch(0.55 0.14 290 / 0.20)",
                      color: "oklch(0.75 0.16 290)",
                      border: "1px solid oklch(0.55 0.14 290 / 0.4)",
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Slip
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Close Dialog */}
        <Dialog
          open={closeDialog.open}
          onOpenChange={(o) =>
            !o && setCloseDialog({ open: false, id: "", remarks: "" })
          }
        >
          <DialogContent
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="kaizen.dialog"
          >
            <DialogHeader>
              <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
                Close Kaizen
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label
                className="text-xs"
                style={{ color: "oklch(0.65 0.010 260)" }}
              >
                Closing Remarks *
              </Label>
              <Textarea
                value={closeDialog.remarks}
                onChange={(e) =>
                  setCloseDialog((d) => ({ ...d, remarks: e.target.value }))
                }
                rows={3}
                data-ocid="kaizen.textarea"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.88 0.010 260)",
                }}
              />
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCloseDialog({ open: false, id: "", remarks: "" })
                  }
                  data-ocid="kaizen.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseKaizen}
                  data-ocid="kaizen.confirm_button"
                  style={{
                    background: "oklch(0.30 0.090 145 / 0.2)",
                    color: "oklch(0.75 0.130 145)",
                    border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  }}
                >
                  Close Kaizen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <footer
          className="border-t py-4"
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
