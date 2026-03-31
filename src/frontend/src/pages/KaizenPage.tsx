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
  Pencil,
  Plus,
  Printer,
  ThumbsDown,
  ThumbsUp,
  Trash2,
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

const STATUS_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  "Pending Approval": {
    bg: "oklch(0.35 0.120 75 / 0.25)",
    color: "oklch(0.85 0.190 75)",
    border: "oklch(0.70 0.190 75 / 0.4)",
  },
  Approved: {
    bg: "oklch(0.30 0.090 145 / 0.25)",
    color: "oklch(0.80 0.150 145)",
    border: "oklch(0.52 0.12 145 / 0.4)",
  },
  Rejected: {
    bg: "oklch(0.35 0.120 25 / 0.25)",
    color: "oklch(0.78 0.17 27)",
    border: "oklch(0.55 0.15 25 / 0.4)",
  },
  Closed: {
    bg: "oklch(0.28 0.025 252 / 0.4)",
    color: "oklch(0.68 0.010 260)",
    border: "oklch(0.34 0.030 252)",
  },
};

type SpareRow = {
  id: string;
  name: string;
  partNo: string;
  qty: string;
  unit: string;
};

const EMPTY_SPARE: SpareRow = {
  id: "",
  name: "",
  partNo: "",
  qty: "",
  unit: "",
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
  spares: [] as SpareRow[],
};

export default function KaizenPage() {
  const { user, logout, navigate, kaizenRecords, addKaizen, updateKaizen } =
    useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingKaizenId, setEditingKaizenId] = useState<string | null>(null);
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

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    id: string;
    reason: string;
  }>({ open: false, id: "", reason: "" });

  // Filter records: operators only see their own
  const filteredRecords = kaizenRecords
    .filter((k) =>
      user?.role === "admin" ? true : k.submittedByUsername === user?.username,
    )
    .filter((k) => filterCategory === "all" || k.category === filterCategory)
    .filter((k) => filterStatus === "all" || k.status === filterStatus)
    .sort((a, b) => b.submittedAt - a.submittedAt);

  function openNewForm() {
    setEditingKaizenId(null);
    setForm({ ...EMPTY_FORM, submittedBy: user?.name ?? "" });
    setShowForm(true);
  }

  function openEditForm(record: KaizenRecord) {
    setEditingKaizenId(record.id);
    setForm({
      title: record.title,
      category: record.category,
      machineArea: record.machineArea,
      problemDescription: record.problemDescription,
      improvementDescription: record.improvementDescription,
      beforePhotoDataUrl: record.beforePhotoDataUrl ?? "",
      afterPhotoDataUrl: record.afterPhotoDataUrl ?? "",
      submittedBy: record.submittedBy,
      spares: record.spares
        ? record.spares.map((s, i) => ({ ...s, id: s.name + i }))
        : [],
    });
    setShowForm(true);
  }

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

    const validSpares = form.spares.filter((s) => s.name.trim());

    if (editingKaizenId) {
      // Editing existing record
      updateKaizen(editingKaizenId, {
        title: form.title,
        category: form.category,
        machineArea: form.machineArea,
        problemDescription: form.problemDescription,
        improvementDescription: form.improvementDescription,
        beforePhotoDataUrl: form.beforePhotoDataUrl || undefined,
        afterPhotoDataUrl: form.afterPhotoDataUrl || undefined,
        submittedBy: form.submittedBy || user?.name || "",
        spares: validSpares.length > 0 ? validSpares : undefined,
      });
      toast.success("Kaizen updated!");
    } else {
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
        status: "Pending Approval",
        spares: validSpares.length > 0 ? validSpares : undefined,
      };
      addKaizen(record);
      toast.success("Kaizen submitted for approval!");
    }
    setShowForm(false);
    setEditingKaizenId(null);
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

  function handleAddSpare() {
    setForm((f) => ({
      ...f,
      spares: [
        ...f.spares,
        { ...EMPTY_SPARE, id: `spare-${Date.now()}-${f.spares.length}` },
      ],
    }));
  }

  function handleRemoveSpare(idx: number) {
    setForm((f) => ({ ...f, spares: f.spares.filter((_, i) => i !== idx) }));
  }

  function handleSpareChange(idx: number, field: keyof SpareRow, val: string) {
    setForm((f) => {
      const updated = f.spares.map((s, i) =>
        i === idx ? { ...s, [field]: val } : s,
      );
      return { ...f, spares: updated };
    });
  }

  function handleApproveKaizen(id: string) {
    updateKaizen(id, { status: "Approved", approvedAt: Date.now() });
    toast.success("Kaizen approved!");
  }

  function handleRejectKaizen() {
    if (!rejectDialog.reason.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    updateKaizen(rejectDialog.id, {
      status: "Rejected",
      rejectedAt: Date.now(),
      rejectionReason: rejectDialog.reason,
    });
    toast.success("Kaizen rejected");
    setRejectDialog({ open: false, id: "", reason: "" });
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
      "Approved At": k.approvedAt
        ? new Date(k.approvedAt).toLocaleString()
        : "",
      "Rejection Reason": k.rejectionReason ?? "",
      "Closed At": k.closedAt ? new Date(k.closedAt).toLocaleString() : "",
      "Close Remarks": k.closedRemarks ?? "",
      Spares: k.spares
        ? k.spares
            .map((s) => `${s.name} (${s.partNo}) x${s.qty} ${s.unit}`)
            .join("; ")
        : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Kaizen");
    XLSX.writeFile(
      wb,
      `Kaizen_Records_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  const navItems = [
    { label: "Dashboard", page: "dashboard" as const },
    { label: "Preventive Maintenance", page: "preventive" as const },
    { label: "Breakdown", page: "breakdown-panel" as const },
    { label: "Analysis", page: "analysis" as const },
  ];

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };

  return (
    <>
      <MorningPopup />
      <style>{`
        @media print {
          body > * { display: none !important; }
          #kaizen-print-area { display: block !important; }
        }
      `}</style>

      {/* Print Area — hidden except when printing */}
      <div
        id="kaizen-print-area"
        style={{
          display: "none",
          fontFamily: "Arial, sans-serif",
          color: "#000",
          background: "#fff",
          padding: "24px",
        }}
      >
        {viewSlip && (
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                borderBottom: "3px solid #1a1a2e",
                paddingBottom: "12px",
                marginBottom: "16px",
              }}
            >
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  margin: "0 0 4px 0",
                  letterSpacing: "2px",
                }}
              >
                KAIZEN IMPROVEMENT SLIP
              </h1>
              <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                Plant Maintenance Management System
              </p>
            </div>

            {/* Info Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "14px",
                fontSize: "12px",
              }}
            >
              <tbody>
                {(
                  [
                    ["Kaizen ID", viewSlip.id],
                    [
                      "Date",
                      new Date(viewSlip.submittedAt).toLocaleDateString(),
                    ],
                    ["Title", viewSlip.title],
                    ["Category", viewSlip.category],
                    ["Machine / Area", viewSlip.machineArea || "-"],
                    ["Submitted By", viewSlip.submittedBy],
                    ["Status", viewSlip.status],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid #ccc" }}>
                    <td
                      style={{
                        padding: "6px 10px",
                        fontWeight: "600",
                        background: "#f5f5f5",
                        width: "30%",
                        border: "1px solid #ccc",
                      }}
                    >
                      {k}
                    </td>
                    <td
                      style={{ padding: "6px 10px", border: "1px solid #ccc" }}
                    >
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Problem Description */}
            <div
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "12px",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                  fontSize: "12px",
                }}
              >
                Problem Description (Before):
              </p>
              <p
                style={{ fontSize: "12px", whiteSpace: "pre-wrap", margin: 0 }}
              >
                {viewSlip.problemDescription}
              </p>
            </div>

            {/* Improvement Description */}
            <div
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "12px",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                  fontSize: "12px",
                }}
              >
                Improvement Description (After):
              </p>
              <p
                style={{ fontSize: "12px", whiteSpace: "pre-wrap", margin: 0 }}
              >
                {viewSlip.improvementDescription}
              </p>
            </div>

            {/* Photos side by side */}
            {(viewSlip.beforePhotoDataUrl || viewSlip.afterPhotoDataUrl) && (
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  marginBottom: "12px",
                }}
              >
                {viewSlip.beforePhotoDataUrl && (
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid #ccc",
                      padding: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "700",
                        fontSize: "11px",
                        marginBottom: "6px",
                      }}
                    >
                      Before Photo:
                    </p>
                    <img
                      src={viewSlip.beforePhotoDataUrl}
                      alt="Before"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                )}
                {viewSlip.afterPhotoDataUrl && (
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid #ccc",
                      padding: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "700",
                        fontSize: "11px",
                        marginBottom: "6px",
                      }}
                    >
                      After Photo:
                    </p>
                    <img
                      src={viewSlip.afterPhotoDataUrl}
                      alt="After"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Spares Used */}
            <div
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "14px",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                Spares Used:
              </p>
              {viewSlip.spares && viewSlip.spares.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0f0f0" }}>
                      {["Spare Name", "Part No.", "Qty", "Unit"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #ccc",
                            textAlign: "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewSlip.spares.map((spare, i) => (
                      <tr key={spare.name + spare.partNo + String(i)}>
                        <td
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                          }}
                        >
                          {spare.name}
                        </td>
                        <td
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                          }}
                        >
                          {spare.partNo}
                        </td>
                        <td
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                          }}
                        >
                          {spare.qty}
                        </td>
                        <td
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                          }}
                        >
                          {spare.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: "11px", color: "#777", margin: 0 }}>
                  No spares recorded
                </p>
              )}
            </div>

            {/* Rejection reason if applicable */}
            {viewSlip.rejectionReason && (
              <div
                style={{
                  border: "1px solid #e0a0a0",
                  padding: "10px",
                  marginBottom: "12px",
                  background: "#fff5f5",
                }}
              >
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  Rejection Reason:
                </p>
                <p style={{ fontSize: "12px", margin: 0 }}>
                  {viewSlip.rejectionReason}
                </p>
              </div>
            )}

            {/* Closing Remarks */}
            {viewSlip.closedRemarks && (
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "14px",
                }}
              >
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  Closing Remarks:
                </p>
                <p style={{ fontSize: "12px", margin: 0 }}>
                  {viewSlip.closedRemarks}
                </p>
              </div>
            )}

            {/* Footer signature line */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "32px",
                gap: "24px",
                borderTop: "1px solid #ccc",
                paddingTop: "16px",
              }}
            >
              {["Submitted By / Operator", "Approved By / Admin", "Date"].map(
                (label) => (
                  <div key={label} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        borderBottom: "1px solid #555",
                        height: "40px",
                        marginBottom: "6px",
                      }}
                    />
                    <p style={{ fontSize: "10px", color: "#666" }}>{label}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main App */}
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
                Submit and track improvement ideas
                {user?.role === "admin" &&
                  " — Admin can approve, reject, and edit all records"}
              </p>
            </div>
            <Button
              onClick={openNewForm}
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
                className="w-44"
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
                  value="Pending Approval"
                  style={{ color: "oklch(0.85 0.190 75)" }}
                >
                  Pending Approval
                </SelectItem>
                <SelectItem
                  value="Approved"
                  style={{ color: "oklch(0.80 0.150 145)" }}
                >
                  Approved
                </SelectItem>
                <SelectItem
                  value="Rejected"
                  style={{ color: "oklch(0.78 0.17 27)" }}
                >
                  Rejected
                </SelectItem>
                <SelectItem
                  value="Closed"
                  style={{ color: "oklch(0.68 0.010 260)" }}
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
                    {filteredRecords.map((k, idx) => {
                      const sc =
                        STATUS_COLORS[k.status] ?? STATUS_COLORS.Closed;
                      return (
                        <TableRow
                          key={k.id}
                          data-ocid={`kaizen.item.${idx + 1}`}
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
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.border}`,
                                fontWeight: "bold",
                                fontSize: "11px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {k.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {/* Slip / View button */}
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

                              {/* Admin: Edit */}
                              {user?.role === "admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditForm(k)}
                                  data-ocid={`kaizen.edit_button.${idx + 1}`}
                                  style={{
                                    fontSize: "11px",
                                    borderColor: "oklch(0.65 0.150 232 / 0.5)",
                                    color: "oklch(0.65 0.150 232)",
                                    height: "26px",
                                    padding: "0 8px",
                                  }}
                                >
                                  <Pencil className="w-3 h-3 mr-1" /> Edit
                                </Button>
                              )}

                              {/* Admin: Approve — only for Pending Approval */}
                              {user?.role === "admin" &&
                                k.status === "Pending Approval" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveKaizen(k.id)}
                                    data-ocid={`kaizen.confirm_button.${idx + 1}`}
                                    style={{
                                      fontSize: "11px",
                                      background: "oklch(0.30 0.090 145 / 0.2)",
                                      color: "oklch(0.80 0.150 145)",
                                      border:
                                        "1px solid oklch(0.52 0.12 145 / 0.4)",
                                      height: "26px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    <ThumbsUp className="w-3 h-3 mr-1" />{" "}
                                    Approve
                                  </Button>
                                )}

                              {/* Admin: Reject — only for Pending Approval */}
                              {user?.role === "admin" &&
                                k.status === "Pending Approval" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setRejectDialog({
                                        open: true,
                                        id: k.id,
                                        reason: "",
                                      })
                                    }
                                    data-ocid={`kaizen.delete_button.${idx + 1}`}
                                    style={{
                                      fontSize: "11px",
                                      background: "oklch(0.35 0.120 25 / 0.2)",
                                      color: "oklch(0.78 0.17 27)",
                                      border:
                                        "1px solid oklch(0.55 0.15 25 / 0.4)",
                                      height: "26px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    <ThumbsDown className="w-3 h-3 mr-1" />{" "}
                                    Reject
                                  </Button>
                                )}

                              {/* Admin: Close — only for Approved */}
                              {user?.role === "admin" &&
                                k.status === "Approved" && (
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
                                      background: "oklch(0.28 0.025 252 / 0.4)",
                                      color: "oklch(0.68 0.010 260)",
                                      border: "1px solid oklch(0.34 0.030 252)",
                                      height: "26px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />{" "}
                                    Close
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </main>

        {/* ====== Submit / Edit Form Dialog ====== */}
        <Dialog
          open={showForm}
          onOpenChange={(o) => {
            if (!o) {
              setShowForm(false);
              setEditingKaizenId(null);
            }
          }}
        >
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
                  {editingKaizenId ? "Edit Kaizen Record" : "Submit New Kaizen"}
                </div>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Title */}
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
                  style={inputStyle}
                />
              </div>

              {/* Category + Machine */}
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
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Problem Description */}
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
                  style={inputStyle}
                />
              </div>

              {/* Improvement Description */}
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
                  style={inputStyle}
                />
              </div>

              {/* Photos */}
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

              {/* ===== Spares Used ===== */}
              <div
                className="rounded-lg p-4 space-y-3"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  border: "1px solid oklch(0.34 0.030 252)",
                }}
              >
                <div className="flex items-center justify-between">
                  <Label
                    className="text-xs font-semibold"
                    style={{ color: "oklch(0.80 0.180 55)" }}
                  >
                    Spares Used
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSpare}
                    data-ocid="kaizen.secondary_button"
                    style={{
                      fontSize: "11px",
                      background: "oklch(0.35 0.090 55 / 0.20)",
                      color: "oklch(0.80 0.180 55)",
                      border: "1px solid oklch(0.70 0.18 55 / 0.4)",
                      height: "26px",
                      padding: "0 10px",
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Spare
                  </Button>
                </div>

                {form.spares.length === 0 ? (
                  <p
                    className="text-xs py-2 text-center"
                    style={{ color: "oklch(0.50 0.010 260)" }}
                  >
                    No spares added. Click "Add Spare" to record parts used.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_1fr_80px_80px_32px] gap-1.5">
                      {["Spare Name", "Part No.", "Qty", "Unit", ""].map(
                        (h) => (
                          <span
                            key={h}
                            className="text-xs"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            {h}
                          </span>
                        ),
                      )}
                    </div>
                    {form.spares.map((spare, idx) => (
                      <div
                        key={spare.id || `spare-${idx}`}
                        className="grid grid-cols-[1fr_1fr_80px_80px_32px] gap-1.5 items-center"
                      >
                        <Input
                          value={spare.name}
                          onChange={(e) =>
                            handleSpareChange(idx, "name", e.target.value)
                          }
                          placeholder="Spare name"
                          style={{
                            ...inputStyle,
                            fontSize: "12px",
                            height: "32px",
                          }}
                        />
                        <Input
                          value={spare.partNo}
                          onChange={(e) =>
                            handleSpareChange(idx, "partNo", e.target.value)
                          }
                          placeholder="Part no."
                          style={{
                            ...inputStyle,
                            fontSize: "12px",
                            height: "32px",
                          }}
                        />
                        <Input
                          value={spare.qty}
                          onChange={(e) =>
                            handleSpareChange(idx, "qty", e.target.value)
                          }
                          placeholder="Qty"
                          style={{
                            ...inputStyle,
                            fontSize: "12px",
                            height: "32px",
                          }}
                        />
                        <Input
                          value={spare.unit}
                          onChange={(e) =>
                            handleSpareChange(idx, "unit", e.target.value)
                          }
                          placeholder="Unit"
                          style={{
                            ...inputStyle,
                            fontSize: "12px",
                            height: "32px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpare(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded"
                          style={{
                            color: "oklch(0.72 0.170 25)",
                            background: "oklch(0.40 0.150 25 / 0.10)",
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submitted By */}
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
                  style={inputStyle}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingKaizenId(null);
                  }}
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
                  {editingKaizenId ? "Save Changes" : "Submit Kaizen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ====== View Slip Dialog ====== */}
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
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(
                    [
                      ["Title", viewSlip.title],
                      ["Category", viewSlip.category],
                      ["Machine/Area", viewSlip.machineArea || "-"],
                      ["Submitted By", viewSlip.submittedBy],
                      [
                        "Date",
                        new Date(viewSlip.submittedAt).toLocaleDateString(),
                      ],
                      ["Status", viewSlip.status],
                    ] as [string, string][]
                  ).map(([k, v]) => (
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

                {/* Problem */}
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

                {/* Improvement */}
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

                {/* Photos */}
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

                {/* Spares */}
                {viewSlip.spares && viewSlip.spares.length > 0 && (
                  <div
                    className="rounded p-3"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      border: "1px solid oklch(0.34 0.030 252)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-2"
                      style={{ color: "oklch(0.80 0.180 55)" }}
                    >
                      Spares Used
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {["Spare Name", "Part No.", "Qty", "Unit"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left pb-1 pr-3"
                                  style={{ color: "oklch(0.55 0.010 260)" }}
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {viewSlip.spares.map((spare, i) => (
                            <tr
                              key={spare.name + spare.partNo + String(i)}
                              style={{
                                borderTop: "1px solid oklch(0.28 0.025 252)",
                              }}
                            >
                              <td
                                className="py-1 pr-3"
                                style={{ color: "oklch(0.88 0.010 260)" }}
                              >
                                {spare.name}
                              </td>
                              <td
                                className="py-1 pr-3"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {spare.partNo}
                              </td>
                              <td
                                className="py-1 pr-3"
                                style={{ color: "oklch(0.88 0.010 260)" }}
                              >
                                {spare.qty}
                              </td>
                              <td
                                className="py-1"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {spare.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {viewSlip.rejectionReason && (
                  <div
                    className="rounded p-3"
                    style={{
                      background: "oklch(0.35 0.120 25 / 0.15)",
                      border: "1px solid oklch(0.55 0.15 25 / 0.4)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: "oklch(0.78 0.17 27)" }}
                    >
                      Rejection Reason
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      {viewSlip.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Close remarks */}
                {viewSlip.closedRemarks && (
                  <div
                    className="rounded p-3"
                    style={{ background: "oklch(0.19 0.020 255)" }}
                  >
                    <p
                      className="text-xs mb-1"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      Closing Remarks
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      {viewSlip.closedRemarks}
                    </p>
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

        {/* ====== Reject Dialog ====== */}
        <Dialog
          open={rejectDialog.open}
          onOpenChange={(o) =>
            !o && setRejectDialog({ open: false, id: "", reason: "" })
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
              <DialogTitle style={{ color: "oklch(0.78 0.17 27)" }}>
                Reject Kaizen
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label
                className="text-xs"
                style={{ color: "oklch(0.65 0.010 260)" }}
              >
                Rejection Reason *
              </Label>
              <Textarea
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog((d) => ({ ...d, reason: e.target.value }))
                }
                rows={3}
                placeholder="Explain why this kaizen is being rejected..."
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
                    setRejectDialog({ open: false, id: "", reason: "" })
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
                  onClick={handleRejectKaizen}
                  data-ocid="kaizen.confirm_button"
                  style={{
                    background: "oklch(0.35 0.120 25 / 0.2)",
                    color: "oklch(0.78 0.17 27)",
                    border: "1px solid oklch(0.55 0.15 25 / 0.4)",
                  }}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ====== Close Dialog ====== */}
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
