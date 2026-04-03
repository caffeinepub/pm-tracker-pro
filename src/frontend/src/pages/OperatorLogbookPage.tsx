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
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit3,
  FileSpreadsheet,
  ListTodo,
  LogOut,
  Package,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { LogbookCheckItem, LogbookEntry } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

type ActivityRow = {
  id: string;
  description: string;
  timeSpent: string;
  status: string;
  remarks: string;
  photo: string;
};

type ItemFormState = {
  description: string;
  category: string;
};

const ITEM_CATEGORIES = [
  "Safety",
  "Quality",
  "Housekeeping",
  "Equipment",
  "Production",
  "Maintenance",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Safety: "oklch(0.50 0.20 27)",
  Quality: "oklch(0.45 0.16 145)",
  Housekeeping: "oklch(0.48 0.16 195)",
  Equipment: "oklch(0.48 0.18 232)",
  Production: "oklch(0.52 0.18 55)",
  Maintenance: "oklch(0.48 0.17 290)",
  Other: "oklch(0.45 0.04 260)",
};

const ACTIVITY_STATUSES = ["Completed", "In Progress", "Pending"];

const ITEM_STATUS_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  OK: {
    bg: "oklch(0.28 0.07 145 / 0.3)",
    color: "oklch(0.80 0.14 145)",
    border: "oklch(0.45 0.12 145 / 0.45)",
  },
  "Not OK": {
    bg: "oklch(0.30 0.10 25 / 0.3)",
    color: "oklch(0.78 0.17 27)",
    border: "oklch(0.50 0.14 25 / 0.45)",
  },
  NA: {
    bg: "oklch(0.25 0.015 260 / 0.4)",
    color: "oklch(0.62 0.010 260)",
    border: "oklch(0.38 0.020 260 / 0.4)",
  },
};

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function printLogbookEntry(entry: LogbookEntry) {
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const checksheetRows = entry.items
    .map(
      (item, i) => `
      <tr>
        <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px 8px;">${item.description}</td>
        <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;
            background:${
              item.status === "OK"
                ? "#d4edda"
                : item.status === "Not OK"
                  ? "#f8d7da"
                  : "#e2e3e5"
            };color:${
              item.status === "OK"
                ? "#155724"
                : item.status === "Not OK"
                  ? "#721c24"
                  : "#495057"
            };">${item.status}</span>
        </td>
        <td style="border:1px solid #ccc;padding:6px 8px;">${item.remark || "—"}</td>
        <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">
          ${item.photoDataUrl ? `<img src="${item.photoDataUrl}" style="max-width:60px;max-height:60px;object-fit:cover;border-radius:4px;" />` : "—"}
        </td>
      </tr>`,
    )
    .join("");

  const activityRows =
    entry.activities && entry.activities.length > 0
      ? entry.activities
          .map(
            (act, i) => `
          <tr>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;">${act.description}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${act.timeSpent || "—"}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${act.status}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;">${act.remarks || "—"}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${(act as any).photo ? `<img src="${(act as any).photo}" style="max-width:60px;max-height:60px;object-fit:cover;border-radius:4px;" />` : "—"}</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="6" style="border:1px solid #ccc;padding:8px;text-align:center;color:#888;">No additional activities recorded</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Operator Daily Logbook — ${entry.date}</title>
  <style>
    @page { size: A4; margin: 15mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 18px; font-weight: 700; letter-spacing: 1px; text-align: center; text-transform: uppercase; }
    h2 { font-size: 13px; font-weight: 700; margin: 14px 0 6px; border-bottom: 2px solid #1a1a1a; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 11px; font-weight: 600; color: #555; text-align: center; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { background: #1a1a1a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { font-size: 10.5px; vertical-align: middle; }
    .header-box { border: 2px solid #1a1a1a; padding: 12px 16px; margin-bottom: 14px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
    .meta-item { border: 1px solid #ccc; padding: 6px 10px; border-radius: 4px; }
    .meta-label { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.5px; }
    .meta-value { font-size: 12px; font-weight: 700; margin-top: 2px; }
    .remarks-box { border: 1px solid #ccc; padding: 10px; min-height: 50px; border-radius: 4px; font-size: 11px; line-height: 1.5; }
    .signature-row { display: flex; gap: 20px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; }
    .sig-box { flex: 1; text-align: center; }
    .sig-line { border-bottom: 1px solid #555; height: 36px; margin-bottom: 4px; }
    .sig-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header-box">
    <h3>Plant Maintenance Management System</h3>
    <h1>Operator Daily Logbook</h1>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Date</div>
        <div class="meta-value">${formatDate(entry.date)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Operator Name</div>
        <div class="meta-value">${entry.operatorName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Submitted At</div>
        <div class="meta-value">${new Date(entry.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  </div>
  <h2>Section 1 — Checksheet</h2>
  ${
    entry.items.length > 0
      ? `
  <table>
    <thead>
      <tr>
        <th style="width:35px;">Sr</th>
        <th>Point Description</th>
        <th style="width:70px;text-align:center;">Status</th>
        <th>Remark</th>
        <th style="width:70px;text-align:center;">Photo</th>
      </tr>
    </thead>
    <tbody>${checksheetRows}</tbody>
  </table>`
      : `<p style="color:#888;font-style:italic;margin-bottom:10px;">No checksheet items recorded.</p>`
  }
  <h2>Section 2 — Additional Work Done Today</h2>
  <table>
    <thead>
      <tr>
        <th style="width:35px;">Sr</th>
        <th>Activity Description</th>
        <th style="width:70px;text-align:center;">Time (hrs)</th>
        <th style="width:80px;text-align:center;">Status</th>
        <th>Remarks</th>
        <th style="width:70px;text-align:center;">Photo</th>
      </tr>
    </thead>
    <tbody>${activityRows}</tbody>
  </table>
  <h2>Section 3 — General Remarks</h2>
  <div class="remarks-box">${entry.generalRemarks || "No general remarks provided."}</div>
  <div class="signature-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Operator Signature / ${entry.operatorName}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Date: ${formatDate(entry.date)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Supervisor / Admin Sign</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("Pop-up blocked. Please allow pop-ups and try again.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 600);
}

export default function OperatorLogbookPage() {
  const {
    user,
    logout,
    logbookCheckItems,
    logbookEntries,
    addLogbookCheckItem,
    updateLogbookCheckItem,
    deleteLogbookCheckItem,
    submitLogbookEntry,
    spareItems,
    addPMSpareUsage,
  } = useApp();

  const isAdmin = user?.role === "admin";
  const todayStr = new Date().toISOString().split("T")[0];

  // ─── Checksheet Management (Admin) ───────────────────────────────────────
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    description: "",
    category: "Safety",
  });

  // ─── Daily Entry Form ─────────────────────────────────────────────────────
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryItems, setEntryItems] = useState<
    Record<
      string,
      { status: "OK" | "Not OK" | "NA"; remark: string; photoDataUrl: string }
    >
  >({});
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [lastSubmitted, setLastSubmitted] = useState<LogbookEntry | null>(null);
  const [spareRows, setSpareRows] = useState<
    Array<{ id: string; spareName: string; qty: number; cost: number }>
  >([]);

  // ─── View Entry Dialog ───────────────────────────────────────────────────
  const [viewEntry, setViewEntry] = useState<LogbookEntry | null>(null);

  // ─── Records expand/collapse ─────────────────────────────────────────────
  const [recordsExpanded, setRecordsExpanded] = useState(true);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ─── Sorted Records ──────────────────────────────────────────────────────
  const sortedEntries = useMemo(() => {
    const safe = Array.isArray(logbookEntries) ? logbookEntries : [];
    const filtered = isAdmin
      ? safe
      : safe.filter((e) => e.operatorUsername === user?.username);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [logbookEntries, isAdmin, user?.username]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function getItemState(checkItemId: string) {
    return (
      entryItems[checkItemId] ?? {
        status: "NA" as const,
        remark: "",
        photoDataUrl: "",
      }
    );
  }

  function setItemField(
    checkItemId: string,
    field: "status" | "remark" | "photoDataUrl",
    value: string,
  ) {
    setEntryItems((prev) => ({
      ...prev,
      [checkItemId]: {
        ...getItemState(checkItemId),
        [field]: value,
      },
    }));
  }

  function handlePhotoUpload(checkItemId: string, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setItemField(checkItemId, "photoDataUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // ─── Activity Management ─────────────────────────────────────────────────
  function addActivity() {
    setActivities((prev) => [
      ...prev,
      {
        id: genId(),
        description: "",
        timeSpent: "",
        status: "Completed",
        remarks: "",
        photo: "",
      },
    ]);
  }

  function updateActivity(
    id: string,
    field: keyof Omit<ActivityRow, "id">,
    value: string,
  ) {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  }

  function removeActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  function handleActivityPhotoUpload(actId: string, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateActivity(actId, "photo", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!user) return;
    if (!entryDate) {
      toast.error("Please select a date.");
      return;
    }

    const safeCheckItems = Array.isArray(logbookCheckItems)
      ? logbookCheckItems
      : [];
    const items = safeCheckItems.map((ci) => {
      const state = getItemState(ci.id);
      return {
        checkItemId: ci.id,
        description: ci.description,
        status: state.status,
        remark: state.remark,
        photoDataUrl: state.photoDataUrl || undefined,
      };
    });

    const validActivities = activities
      .filter((a) => a.description.trim())
      .map(({ description, timeSpent, status, remarks }) => ({
        description,
        timeSpent,
        status,
        remarks,
      }));

    const validSpares = spareRows.filter((s) => s.spareName.trim());
    const entry: LogbookEntry = {
      id: genId(),
      date: entryDate,
      operatorName: user.name || user.username,
      operatorUsername: user.username,
      items,
      generalRemarks,
      submittedAt: Date.now(),
      activities: validActivities,
      spareUsed:
        validSpares.length > 0
          ? validSpares.map(({ spareName, qty, cost }) => ({
              spareName,
              qty,
              cost,
            }))
          : undefined,
    };

    submitLogbookEntry(entry);

    // Track spare cost in pmSpareUsage for material issue slip
    if (validSpares.length > 0) {
      addPMSpareUsage({
        id: `logbook-spare-${Date.now()}`,
        machineId: "logbook",
        machineName: "Operator Logbook",
        date: entryDate,
        spareUsed: validSpares.map(({ spareName, qty, cost }) => ({
          spareName,
          qty,
          unit: "pcs",
          cost,
        })),
        submittedBy: user.name || user.username,
        submittedByUsername: user.username,
        workType: "Logbook",
      });
    }

    setLastSubmitted(entry);

    // Reset form (activities reset daily)
    setEntryItems({});
    setGeneralRemarks("");
    setActivities([]);
    setSpareRows([]);
    toast.success("Logbook entry submitted successfully!");
  }

  // ─── Admin Checksheet CRUD ────────────────────────────────────────────────
  function openAddItem() {
    setEditItemId(null);
    setItemForm({ description: "", category: "Safety" });
    setShowItemDialog(true);
  }

  function openEditItem(item: LogbookCheckItem) {
    setEditItemId(item.id);
    setItemForm({
      description: item.description,
      category: item.category || "Other",
    });
    setShowItemDialog(true);
  }

  function handleSaveItem() {
    if (!itemForm.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (editItemId) {
      updateLogbookCheckItem(editItemId, {
        description: itemForm.description.trim(),
        category: itemForm.category,
      });
      toast.success("Checksheet point updated.");
    } else {
      addLogbookCheckItem({
        id: genId(),
        description: itemForm.description.trim(),
        category: itemForm.category,
        createdAt: Date.now(),
      });
      toast.success("Checksheet point added.");
    }
    setShowItemDialog(false);
  }

  function handleDeleteItem(id: string) {
    deleteLogbookCheckItem(id);
    toast.success("Checksheet point removed.");
  }

  // ─── Excel Export ─────────────────────────────────────────────────────────
  function handleExport() {
    if (!XLSX) {
      toast.error("Excel export not available.");
      return;
    }
    const entries = Array.isArray(logbookEntries) ? logbookEntries : [];
    if (entries.length === 0) {
      toast.error("No logbook records to export.");
      return;
    }

    const rows: any[] = [];
    for (const entry of entries) {
      const base = {
        Date: entry.date,
        "Operator Name": entry.operatorName,
        "Operator Username": entry.operatorUsername,
        "Submitted At": new Date(entry.submittedAt).toLocaleString(),
        "General Remarks": entry.generalRemarks,
      };
      const hasItems = entry.items.length > 0;
      const hasActivities = (entry.activities ?? []).length > 0;

      if (!hasItems && !hasActivities) {
        rows.push(base);
      } else {
        for (const item of entry.items) {
          rows.push({
            ...base,
            "Checksheet Point": item.description,
            "Check Status": item.status,
            "Check Remark": item.remark,
            "Activity Description": "",
            "Time Spent (hrs)": "",
            "Activity Status": "",
            "Activity Remarks": "",
          });
        }
        for (const act of entry.activities ?? []) {
          rows.push({
            Date: entry.date,
            "Operator Name": entry.operatorName,
            "Operator Username": entry.operatorUsername,
            "Submitted At": new Date(entry.submittedAt).toLocaleString(),
            "General Remarks": entry.generalRemarks,
            "Checksheet Point": "",
            "Check Status": "",
            "Check Remark": "",
            "Activity Description": act.description,
            "Time Spent (hrs)": act.timeSpent,
            "Activity Status": act.status,
            "Activity Remarks": act.remarks,
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logbook");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Operator_Logbook_${dateStr}.xlsx`);
    toast.success("Logbook exported to Excel.");
  }

  const safeCheckItems = Array.isArray(logbookCheckItems)
    ? logbookCheckItems
    : [];

  // ─── Reusable Styles ──────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "oklch(0.19 0.020 255)",
    border: "1px solid oklch(0.34 0.030 252)",
    borderRadius: "12px",
  };

  const inputStyle: React.CSSProperties = {
    background: "oklch(0.165 0.022 252)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
    fontSize: "13px",
  };

  const labelStyle: React.CSSProperties = {
    color: "oklch(0.62 0.010 260)",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const accentColor = "oklch(0.72 0.15 195)";
  const accentBg = "oklch(0.28 0.08 195 / 0.25)";
  const accentBorder = "oklch(0.52 0.12 195 / 0.4)";

  return (
    <>
      <MorningPopup />

      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
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
                  background: accentBg,
                  border: `1px solid ${accentBorder}`,
                }}
              >
                <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Operator <span style={{ color: accentColor }}>Logbook</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                size="sm"
                onClick={handleExport}
                data-ocid="logbook.export.button"
                style={{
                  background: "oklch(0.28 0.07 145 / 0.25)",
                  color: "oklch(0.78 0.13 145)",
                  border: "1px solid oklch(0.45 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Excel
              </Button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: "oklch(0.35 0.12 25 / 0.15)",
                  color: "oklch(0.72 0.17 25)",
                  border: "1px solid oklch(0.52 0.14 25 / 0.3)",
                }}
                data-ocid="logbook.logout.button"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-24 md:pb-8">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2
              className="text-xl font-bold"
              style={{
                fontFamily: "BricolageGrotesque, sans-serif",
                color: "oklch(0.88 0.010 260)",
              }}
            >
              Daily Logbook
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.010 260)" }}
            >
              {isAdmin
                ? "Admin view — manage checksheet points and review all operator records"
                : "Record your daily activities, checksheet, and remarks"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6">
            {/* ── Admin: Checksheet Management ──────────────────────── */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                style={cardStyle}
                className="p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className="w-4 h-4"
                      style={{ color: accentColor }}
                    />
                    <h3
                      className="font-bold text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      Checksheet Management
                    </h3>
                    <Badge
                      style={{
                        background: accentBg,
                        color: accentColor,
                        border: `1px solid ${accentBorder}`,
                        fontSize: "10px",
                      }}
                    >
                      Admin Only
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={openAddItem}
                    data-ocid="logbook.open_modal_button"
                    style={{
                      background: accentBg,
                      color: accentColor,
                      border: `1px solid ${accentBorder}`,
                      fontSize: "12px",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Point
                  </Button>
                </div>

                {safeCheckItems.length === 0 ? (
                  <div
                    className="text-center py-8"
                    style={{ color: "oklch(0.50 0.010 260)" }}
                  >
                    <ListTodo
                      className="w-8 h-8 mx-auto mb-2 opacity-40"
                      style={{ color: accentColor }}
                    />
                    <p className="text-sm">No checksheet points defined yet.</p>
                    <p className="text-xs mt-1 opacity-70">
                      Click "Add Point" to create the first checksheet item.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow
                          style={{ borderColor: "oklch(0.34 0.030 252)" }}
                        >
                          <TableHead
                            style={{
                              color: "oklch(0.55 0.010 260)",
                              fontSize: "11px",
                            }}
                          >
                            #
                          </TableHead>
                          <TableHead
                            style={{
                              color: "oklch(0.55 0.010 260)",
                              fontSize: "11px",
                            }}
                          >
                            Description
                          </TableHead>
                          <TableHead
                            style={{
                              color: "oklch(0.55 0.010 260)",
                              fontSize: "11px",
                            }}
                          >
                            Category
                          </TableHead>
                          <TableHead
                            style={{
                              color: "oklch(0.55 0.010 260)",
                              fontSize: "11px",
                            }}
                          >
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeCheckItems.map((item, idx) => (
                          <TableRow
                            key={item.id}
                            data-ocid={`logbook.row.${idx + 1}`}
                            style={{ borderColor: "oklch(0.28 0.025 252)" }}
                          >
                            <TableCell
                              style={{
                                color: "oklch(0.55 0.010 260)",
                                fontSize: "12px",
                                width: "40px",
                              }}
                            >
                              {idx + 1}
                            </TableCell>
                            <TableCell
                              style={{
                                color: "oklch(0.88 0.010 260)",
                                fontSize: "13px",
                              }}
                            >
                              {item.description}
                            </TableCell>
                            <TableCell>
                              <Badge
                                style={{
                                  background:
                                    CATEGORY_COLORS[item.category] ||
                                    CATEGORY_COLORS.Other,
                                  color: "white",
                                  border: "none",
                                  fontWeight: 600,
                                  fontSize: "10px",
                                }}
                              >
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditItem(item)}
                                  data-ocid={`logbook.edit_button.${idx + 1}`}
                                  className="p-1.5 rounded-md transition-colors"
                                  style={{
                                    background: "oklch(0.28 0.06 232 / 0.25)",
                                    color: "oklch(0.68 0.14 232)",
                                    border:
                                      "1px solid oklch(0.45 0.10 232 / 0.35)",
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  data-ocid={`logbook.delete_button.${idx + 1}`}
                                  className="p-1.5 rounded-md transition-colors"
                                  style={{
                                    background: "oklch(0.30 0.09 25 / 0.25)",
                                    color: "oklch(0.72 0.17 25)",
                                    border:
                                      "1px solid oklch(0.50 0.13 25 / 0.35)",
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Daily Entry Form ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={cardStyle}
              className="p-5"
            >
              <div className="flex items-center gap-2 mb-5">
                <Edit3 className="w-4 h-4" style={{ color: accentColor }} />
                <h3
                  className="font-bold text-sm"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  New Daily Entry
                </h3>
              </div>

              {/* Date + Operator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <Label htmlFor="entry-date" style={labelStyle}>
                    Date
                  </Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="mt-1"
                    style={inputStyle}
                    data-ocid="logbook.input"
                  />
                </div>
                <div>
                  <Label style={labelStyle}>Operator Name</Label>
                  <div
                    className="mt-1 px-3 py-2 rounded-md text-sm"
                    style={{
                      background: "oklch(0.165 0.022 252)",
                      border: "1px solid oklch(0.34 0.030 252)",
                      color: "oklch(0.88 0.010 260)",
                    }}
                  >
                    {user?.name || user?.username || "—"}
                  </div>
                </div>
              </div>

              {/* ── Admin Checksheet Points ──────────────────────────── */}
              <div
                className="rounded-lg p-4 mb-5"
                style={{
                  background: "oklch(0.165 0.022 252 / 0.6)",
                  border: "1px solid oklch(0.30 0.025 252)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    Checksheet
                  </h4>
                  <Badge
                    style={{
                      background: "oklch(0.28 0.04 260 / 0.4)",
                      color: "oklch(0.58 0.010 260)",
                      border: "1px solid oklch(0.38 0.020 260 / 0.4)",
                      fontSize: "10px",
                    }}
                  >
                    Admin Defined
                  </Badge>
                </div>

                {safeCheckItems.length === 0 ? (
                  <p
                    className="text-sm py-4 text-center"
                    style={{ color: "oklch(0.52 0.010 260)" }}
                  >
                    Admin has not defined checksheet points yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {safeCheckItems.map((ci, idx) => {
                      const state = getItemState(ci.id);
                      const statusColors =
                        ITEM_STATUS_COLORS[state.status] ||
                        ITEM_STATUS_COLORS.NA;
                      return (
                        <motion.div
                          key={ci.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="rounded-lg p-3"
                          style={{
                            background: "oklch(0.19 0.020 255)",
                            border: `1px solid ${
                              state.status === "Not OK"
                                ? "oklch(0.45 0.10 25 / 0.5)"
                                : "oklch(0.30 0.025 252)"
                            }`,
                          }}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <Badge
                              style={{
                                background:
                                  CATEGORY_COLORS[ci.category] ||
                                  CATEGORY_COLORS.Other,
                                color: "white",
                                border: "none",
                                fontWeight: 600,
                                fontSize: "9px",
                                minWidth: "fit-content",
                              }}
                            >
                              {ci.category}
                            </Badge>
                            <span
                              className="text-sm flex-1"
                              style={{ color: "oklch(0.85 0.010 260)" }}
                            >
                              {idx + 1}. {ci.description}
                            </span>
                            <div
                              className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                              style={{
                                background: statusColors.bg,
                                color: statusColors.color,
                                border: `1px solid ${statusColors.border}`,
                              }}
                            >
                              {state.status}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                            {/* Status Select */}
                            <div>
                              <Label
                                style={{ ...labelStyle, fontSize: "10px" }}
                              >
                                Status
                              </Label>
                              <Select
                                value={state.status}
                                onValueChange={(v) =>
                                  setItemField(
                                    ci.id,
                                    "status",
                                    v as "OK" | "Not OK" | "NA",
                                  )
                                }
                              >
                                <SelectTrigger
                                  className="mt-1 h-8 text-xs"
                                  style={inputStyle}
                                  data-ocid="logbook.select"
                                >
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent
                                  style={{
                                    background: "oklch(0.22 0.025 255)",
                                    border: "1px solid oklch(0.34 0.030 252)",
                                  }}
                                >
                                  <SelectItem value="OK">OK</SelectItem>
                                  <SelectItem value="Not OK">Not OK</SelectItem>
                                  <SelectItem value="NA">NA</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Remark */}
                            <div>
                              <Label
                                style={{ ...labelStyle, fontSize: "10px" }}
                              >
                                Remark
                              </Label>
                              <Input
                                value={state.remark}
                                onChange={(e) =>
                                  setItemField(ci.id, "remark", e.target.value)
                                }
                                placeholder="Enter remark…"
                                className="mt-1 h-8 text-xs"
                                style={inputStyle}
                                data-ocid="logbook.input"
                              />
                            </div>

                            {/* Photo */}
                            <div>
                              <Label
                                style={{ ...labelStyle, fontSize: "10px" }}
                              >
                                Photo
                              </Label>
                              <div className="mt-1 flex items-center gap-2">
                                {state.photoDataUrl ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={state.photoDataUrl}
                                      alt=""
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemField(ci.id, "photoDataUrl", "")
                                      }
                                      className="p-1 rounded"
                                      style={{
                                        color: "oklch(0.68 0.15 25)",
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fileInputRefs.current[ci.id]?.click()
                                    }
                                    className="flex items-center gap-1.5 text-xs px-3 h-8 rounded-md transition-colors"
                                    style={{
                                      background: accentBg,
                                      color: accentColor,
                                      border: `1px solid ${accentBorder}`,
                                    }}
                                    data-ocid="logbook.upload_button"
                                  >
                                    <Camera className="w-3 h-3" />
                                    Upload
                                  </button>
                                )}
                                <input
                                  ref={(el) => {
                                    fileInputRefs.current[ci.id] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(ci.id, file);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Additional Work Done Today ───────────────────────── */}
              <div
                className="rounded-lg p-4 mb-5"
                style={{
                  background: "oklch(0.165 0.022 252 / 0.6)",
                  border: "1px solid oklch(0.30 0.025 252)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo
                      className="w-4 h-4"
                      style={{ color: "oklch(0.75 0.16 55)" }}
                    />
                    <h4
                      className="font-semibold text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      Additional Work Done Today
                    </h4>
                    <Badge
                      style={{
                        background: "oklch(0.32 0.10 55 / 0.25)",
                        color: "oklch(0.80 0.18 55)",
                        border: "1px solid oklch(0.55 0.15 55 / 0.4)",
                        fontSize: "10px",
                      }}
                    >
                      Resets Daily
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={addActivity}
                    data-ocid="logbook.secondary_button"
                    style={{
                      background: "oklch(0.32 0.10 55 / 0.25)",
                      color: "oklch(0.80 0.18 55)",
                      border: "1px solid oklch(0.55 0.15 55 / 0.4)",
                      fontSize: "12px",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
                  </Button>
                </div>

                {activities.length === 0 ? (
                  <p
                    className="text-sm py-3 text-center"
                    style={{ color: "oklch(0.48 0.010 260)" }}
                  >
                    No activities added yet. Click "Add Activity" to record work
                    done today.
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {activities.map((act, idx) => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg p-3 mb-2"
                        style={{
                          background: "oklch(0.19 0.020 255)",
                          border: "1px solid oklch(0.30 0.025 252)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            Activity {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeActivity(act.id)}
                            className="p-1 rounded transition-colors"
                            style={{ color: "oklch(0.62 0.14 25)" }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <Label style={{ ...labelStyle, fontSize: "10px" }}>
                              Activity Description
                            </Label>
                            <Input
                              value={act.description}
                              onChange={(e) =>
                                updateActivity(
                                  act.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Describe the activity…"
                              className="mt-1 h-8 text-xs"
                              style={inputStyle}
                              data-ocid="logbook.input"
                            />
                          </div>
                          <div>
                            <Label style={{ ...labelStyle, fontSize: "10px" }}>
                              Time Spent (hrs)
                            </Label>
                            <Input
                              value={act.timeSpent}
                              onChange={(e) =>
                                updateActivity(
                                  act.id,
                                  "timeSpent",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 1.5"
                              className="mt-1 h-8 text-xs"
                              style={inputStyle}
                              data-ocid="logbook.input"
                            />
                          </div>
                          <div>
                            <Label style={{ ...labelStyle, fontSize: "10px" }}>
                              Status
                            </Label>
                            <Select
                              value={act.status}
                              onValueChange={(v) =>
                                updateActivity(act.id, "status", v)
                              }
                            >
                              <SelectTrigger
                                className="mt-1 h-8 text-xs"
                                style={inputStyle}
                                data-ocid="logbook.select"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent
                                style={{
                                  background: "oklch(0.22 0.025 255)",
                                  border: "1px solid oklch(0.34 0.030 252)",
                                }}
                              >
                                {ACTIVITY_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-4">
                            <Label style={{ ...labelStyle, fontSize: "10px" }}>
                              Remarks
                            </Label>
                            <Input
                              value={act.remarks}
                              onChange={(e) =>
                                updateActivity(
                                  act.id,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              placeholder="Additional remarks…"
                              className="mt-1 h-8 text-xs"
                              style={inputStyle}
                              data-ocid="logbook.input"
                            />
                          </div>
                          {/* Photo Upload */}
                          <div className="sm:col-span-4">
                            <Label style={{ ...labelStyle, fontSize: "10px" }}>
                              Photo
                            </Label>
                            <div className="mt-1 flex items-center gap-2">
                              {act.photo ? (
                                <div className="relative">
                                  <img
                                    src={act.photo}
                                    alt="Activity"
                                    className="w-16 h-16 object-cover rounded border"
                                    style={{
                                      border: "1px solid oklch(0.34 0.030 252)",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateActivity(act.id, "photo", "")
                                    }
                                    className="absolute -top-1 -right-1 rounded-full p-0.5"
                                    style={{
                                      background: "oklch(0.50 0.20 27)",
                                      color: "#fff",
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label
                                  className="flex items-center gap-1.5 cursor-pointer rounded px-3 py-1.5 text-xs"
                                  style={{
                                    background: "oklch(0.24 0.025 255)",
                                    border: "1px dashed oklch(0.42 0.030 252)",
                                    color: "oklch(0.65 0.010 260)",
                                  }}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  Upload Photo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleActivityPhotoUpload(act.id, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* ── Spares Used ─────────────────────────────────────── */}
              <div
                className="rounded-lg p-4 mb-5"
                style={{
                  background: "oklch(0.165 0.022 252 / 0.6)",
                  border: "1px solid oklch(0.30 0.025 252)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package
                      className="w-4 h-4"
                      style={{ color: "oklch(0.80 0.13 35)" }}
                    />
                    <h4
                      className="font-semibold text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      Spares Used (Optional)
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() =>
                      setSpareRows((prev) => [
                        ...prev,
                        { id: genId(), spareName: "", qty: 1, cost: 0 },
                      ])
                    }
                    data-ocid="logbook.secondary_button"
                    style={{
                      background: "oklch(0.45 0.12 35 / 0.20)",
                      color: "oklch(0.80 0.13 35)",
                      border: "1px solid oklch(0.55 0.12 35 / 0.4)",
                      fontSize: "12px",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Spare
                  </Button>
                </div>
                {spareRows.length === 0 ? (
                  <p
                    className="text-xs text-center py-2"
                    style={{ color: "oklch(0.48 0.010 260)" }}
                  >
                    No spares recorded. Click "Add Spare" if any parts were
                    used.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {spareRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <div className="flex-1 min-w-[140px]">
                          <Input
                            value={row.spareName}
                            onChange={(e) =>
                              setSpareRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, spareName: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            placeholder="Spare part name…"
                            list="logbook-spare-list"
                            className="h-8 text-xs"
                            style={inputStyle}
                            data-ocid={`logbook.input.${idx + 1}`}
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            value={row.qty}
                            onChange={(e) =>
                              setSpareRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, qty: Number(e.target.value) }
                                    : r,
                                ),
                              )
                            }
                            placeholder="Qty"
                            className="h-8 text-xs"
                            style={inputStyle}
                            min={0}
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            value={row.cost}
                            onChange={(e) =>
                              setSpareRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, cost: Number(e.target.value) }
                                    : r,
                                ),
                              )
                            }
                            placeholder="Cost ₹"
                            className="h-8 text-xs"
                            style={inputStyle}
                            min={0}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSpareRows((prev) =>
                              prev.filter((r) => r.id !== row.id),
                            )
                          }
                          className="p-1.5 rounded"
                          style={{ color: "oklch(0.68 0.15 25)" }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <datalist id="logbook-spare-list">
                      {(Array.isArray(spareItems) ? spareItems : []).map(
                        (s) => (
                          <option key={s.id} value={s.partName} />
                        ),
                      )}
                    </datalist>
                  </div>
                )}
              </div>

              {/* ── General Remarks ─────────────────────────────────── */}
              <div className="mb-5">
                <Label htmlFor="general-remarks" style={labelStyle}>
                  General Remarks
                </Label>
                <Textarea
                  id="general-remarks"
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                  placeholder="Any general observations, issues, or notes for the day…"
                  rows={3}
                  className="mt-1"
                  style={{ ...inputStyle, resize: "vertical" }}
                  data-ocid="logbook.textarea"
                />
              </div>

              {/* Submit + Print ─────────────────────────────────────── */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleSubmit}
                  data-ocid="logbook.submit_button"
                  style={{
                    background: accentBg,
                    color: accentColor,
                    border: `1px solid ${accentBorder}`,
                    fontWeight: 600,
                  }}
                >
                  <ClipboardList className="w-4 h-4 mr-2" /> Submit Entry
                </Button>

                <AnimatePresence>
                  {lastSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Button
                        onClick={() => printLogbookEntry(lastSubmitted)}
                        style={{
                          background: "oklch(0.28 0.07 145 / 0.25)",
                          color: "oklch(0.78 0.13 145)",
                          border: "1px solid oklch(0.45 0.12 145 / 0.4)",
                          fontWeight: 600,
                        }}
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print Today's
                        Logbook
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ── Logbook Records ──────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={cardStyle}
              className="p-5"
            >
              <button
                type="button"
                className="flex items-center justify-between w-full mb-1"
                onClick={() => setRecordsExpanded((p) => !p)}
              >
                <div className="flex items-center gap-2">
                  <BookOpen
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                  <h3
                    className="font-bold text-sm"
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    Logbook Records
                  </h3>
                  <Badge
                    style={{
                      background: accentBg,
                      color: accentColor,
                      border: `1px solid ${accentBorder}`,
                      fontSize: "10px",
                    }}
                  >
                    {sortedEntries.length}
                  </Badge>
                </div>
                {recordsExpanded ? (
                  <ChevronUp
                    className="w-4 h-4"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  />
                ) : (
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  />
                )}
              </button>

              <AnimatePresence>
                {recordsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {sortedEntries.length === 0 ? (
                      <div
                        data-ocid="logbook.empty_state"
                        className="text-center py-10"
                      >
                        <BookOpen
                          className="w-10 h-10 mx-auto mb-3 opacity-20"
                          style={{ color: accentColor }}
                        />
                        <p
                          className="text-sm"
                          style={{ color: "oklch(0.50 0.010 260)" }}
                        >
                          No logbook entries yet.
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "oklch(0.40 0.010 260)" }}
                        >
                          Submit the form above to create the first daily
                          record.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <Table>
                          <TableHeader>
                            <TableRow
                              style={{ borderColor: "oklch(0.34 0.030 252)" }}
                            >
                              {[
                                "#",
                                "Date",
                                "Operator",
                                "Checksheet",
                                "Activities",
                                "Actions",
                              ].map((h) => (
                                <TableHead
                                  key={h}
                                  style={{
                                    color: "oklch(0.55 0.010 260)",
                                    fontSize: "11px",
                                  }}
                                >
                                  {h}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedEntries.map((entry, idx) => {
                              const okCount = entry.items.filter(
                                (i) => i.status === "OK",
                              ).length;
                              const total = entry.items.length;
                              const actCount = entry.activities?.length ?? 0;
                              return (
                                <TableRow
                                  key={entry.id}
                                  data-ocid={`logbook.item.${idx + 1}`}
                                  style={{
                                    borderColor: "oklch(0.28 0.025 252)",
                                  }}
                                >
                                  <TableCell
                                    style={{
                                      color: "oklch(0.50 0.010 260)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell
                                    style={{
                                      color: "oklch(0.88 0.010 260)",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {entry.date}
                                  </TableCell>
                                  <TableCell
                                    style={{
                                      color: "oklch(0.78 0.010 260)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {entry.operatorName}
                                  </TableCell>
                                  <TableCell>
                                    {total > 0 ? (
                                      <Badge
                                        style={{
                                          background:
                                            okCount === total
                                              ? "oklch(0.28 0.07 145 / 0.3)"
                                              : "oklch(0.30 0.07 55 / 0.3)",
                                          color:
                                            okCount === total
                                              ? "oklch(0.78 0.13 145)"
                                              : "oklch(0.80 0.16 55)",
                                          border:
                                            okCount === total
                                              ? "1px solid oklch(0.45 0.12 145 / 0.4)"
                                              : "1px solid oklch(0.55 0.14 55 / 0.4)",
                                          fontSize: "11px",
                                        }}
                                      >
                                        {okCount}/{total} OK
                                      </Badge>
                                    ) : (
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: "oklch(0.45 0.010 260)",
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell
                                    style={{
                                      color: "oklch(0.68 0.010 260)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {actCount > 0 ? (
                                      <Badge
                                        style={{
                                          background:
                                            "oklch(0.30 0.07 232 / 0.3)",
                                          color: "oklch(0.72 0.14 232)",
                                          border:
                                            "1px solid oklch(0.48 0.12 232 / 0.4)",
                                          fontSize: "11px",
                                        }}
                                      >
                                        {actCount} activities
                                      </Badge>
                                    ) : (
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: "oklch(0.42 0.010 260)",
                                        }}
                                      >
                                        None
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setViewEntry(entry)}
                                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors"
                                        style={{
                                          background: accentBg,
                                          color: accentColor,
                                          border: `1px solid ${accentBorder}`,
                                        }}
                                      >
                                        <BookOpen className="w-3 h-3" /> View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => printLogbookEntry(entry)}
                                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors"
                                        style={{
                                          background:
                                            "oklch(0.28 0.07 145 / 0.25)",
                                          color: "oklch(0.75 0.13 145)",
                                          border:
                                            "1px solid oklch(0.45 0.12 145 / 0.4)",
                                        }}
                                      >
                                        <Printer className="w-3 h-3" /> Print
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="border-t py-4 text-center text-xs"
          style={{
            borderColor: "oklch(0.28 0.025 252)",
            color: "oklch(0.42 0.010 260)",
          }}
        >
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: accentColor }}
          >
            caffeine.ai
          </a>
        </footer>
      </div>

      {/* ── Admin: Add/Edit Checksheet Item Dialog ──────────────── */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent
          data-ocid="logbook.dialog"
          style={{
            background: "oklch(0.19 0.020 255)",
            border: "1px solid oklch(0.34 0.030 252)",
            color: "oklch(0.88 0.010 260)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
              {editItemId ? "Edit Checksheet Point" : "Add Checksheet Point"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label style={labelStyle}>Description *</Label>
              <Input
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g. Check machine lubrication levels"
                className="mt-1"
                style={inputStyle}
                data-ocid="logbook.input"
              />
            </div>
            <div>
              <Label style={labelStyle}>Category</Label>
              <Select
                value={itemForm.category}
                onValueChange={(v) =>
                  setItemForm((p) => ({ ...p, category: v }))
                }
              >
                <SelectTrigger
                  className="mt-1"
                  style={inputStyle}
                  data-ocid="logbook.input"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: "oklch(0.22 0.025 255)",
                    border: "1px solid oklch(0.34 0.030 252)",
                  }}
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowItemDialog(false)}
              data-ocid="logbook.cancel_button"
              style={{
                background: "transparent",
                borderColor: "oklch(0.34 0.030 252)",
                color: "oklch(0.68 0.010 260)",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveItem}
              data-ocid="logbook.submit_button"
              style={{
                background: accentBg,
                color: accentColor,
                border: `1px solid ${accentBorder}`,
              }}
            >
              {editItemId ? "Save Changes" : "Add Point"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Entry Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!viewEntry}
        onOpenChange={(open) => !open && setViewEntry(null)}
      >
        <DialogContent
          data-ocid="logbook.dialog"
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{
            background: "oklch(0.19 0.020 255)",
            border: "1px solid oklch(0.34 0.030 252)",
            color: "oklch(0.88 0.010 260)",
          }}
        >
          {viewEntry && (
            <>
              <DialogHeader>
                <DialogTitle
                  className="flex items-center gap-2"
                  style={{ color: "oklch(0.88 0.010 260)" }}
                >
                  <BookOpen
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                  Logbook — {viewEntry.date}
                </DialogTitle>
              </DialogHeader>

              {/* Meta */}
              <div
                className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-lg"
                style={{ background: "oklch(0.165 0.022 252)" }}
              >
                <div>
                  <p style={{ ...labelStyle, fontSize: "10px" }}>Operator</p>
                  <p
                    className="text-sm font-semibold mt-0.5"
                    style={{ color: "oklch(0.88 0.010 260)" }}
                  >
                    {viewEntry.operatorName}
                  </p>
                </div>
                <div>
                  <p style={{ ...labelStyle, fontSize: "10px" }}>
                    Submitted At
                  </p>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "oklch(0.78 0.010 260)" }}
                  >
                    {new Date(viewEntry.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Checksheet Items */}
              {viewEntry.items.length > 0 && (
                <div className="mt-4">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Checksheet
                  </h4>
                  <div className="space-y-2">
                    {viewEntry.items.map((item, i) => {
                      const sc =
                        ITEM_STATUS_COLORS[item.status] ||
                        ITEM_STATUS_COLORS.NA;
                      return (
                        <div
                          key={item.checkItemId}
                          className="flex items-start gap-3 p-2.5 rounded-lg"
                          style={{
                            background: "oklch(0.165 0.022 252)",
                            border: "1px solid oklch(0.28 0.025 252)",
                          }}
                        >
                          <span
                            className="text-xs w-5 text-right shrink-0 mt-0.5"
                            style={{ color: "oklch(0.48 0.010 260)" }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm"
                              style={{ color: "oklch(0.85 0.010 260)" }}
                            >
                              {item.description}
                            </p>
                            {item.remark && (
                              <p
                                className="text-xs mt-0.5 italic"
                                style={{ color: "oklch(0.58 0.010 260)" }}
                              >
                                {item.remark}
                              </p>
                            )}
                          </div>
                          {item.photoDataUrl && (
                            <img
                              src={item.photoDataUrl}
                              alt=""
                              className="w-10 h-10 rounded object-cover shrink-0"
                            />
                          )}
                          <div
                            className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                            style={{
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                            }}
                          >
                            {item.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activities */}
              {viewEntry.activities && viewEntry.activities.length > 0 && (
                <div className="mt-4">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Additional Work Done
                  </h4>
                  <div className="space-y-2">
                    {viewEntry.activities.map((act, i) => (
                      <div
                        key={`view-act-${i}-${act.description.slice(0, 8)}`}
                        className="p-2.5 rounded-lg"
                        style={{
                          background: "oklch(0.165 0.022 252)",
                          border: "1px solid oklch(0.28 0.025 252)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-sm flex-1"
                            style={{ color: "oklch(0.85 0.010 260)" }}
                          >
                            {i + 1}. {act.description}
                          </p>
                          <Badge
                            style={{
                              background:
                                act.status === "Completed"
                                  ? "oklch(0.28 0.07 145 / 0.3)"
                                  : act.status === "In Progress"
                                    ? "oklch(0.30 0.08 55 / 0.3)"
                                    : "oklch(0.25 0.015 260 / 0.4)",
                              color:
                                act.status === "Completed"
                                  ? "oklch(0.78 0.13 145)"
                                  : act.status === "In Progress"
                                    ? "oklch(0.78 0.16 55)"
                                    : "oklch(0.58 0.010 260)",
                              border:
                                act.status === "Completed"
                                  ? "1px solid oklch(0.45 0.12 145 / 0.4)"
                                  : act.status === "In Progress"
                                    ? "1px solid oklch(0.52 0.14 55 / 0.4)"
                                    : "1px solid oklch(0.34 0.015 260 / 0.4)",
                              fontSize: "10px",
                            }}
                          >
                            {act.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 mt-1">
                          {act.timeSpent && (
                            <p
                              className="text-xs"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              ⏱ {act.timeSpent} hrs
                            </p>
                          )}
                          {act.remarks && (
                            <p
                              className="text-xs italic"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              {act.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Remarks */}
              {viewEntry.generalRemarks && (
                <div className="mt-4">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    General Remarks
                  </h4>
                  <p
                    className="text-sm p-3 rounded-lg"
                    style={{
                      background: "oklch(0.165 0.022 252)",
                      border: "1px solid oklch(0.28 0.025 252)",
                      color: "oklch(0.80 0.010 260)",
                      lineHeight: "1.6",
                    }}
                  >
                    {viewEntry.generalRemarks}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-5">
                <Button
                  onClick={() => printLogbookEntry(viewEntry)}
                  style={{
                    background: "oklch(0.28 0.07 145 / 0.25)",
                    color: "oklch(0.78 0.13 145)",
                    border: "1px solid oklch(0.45 0.12 145 / 0.4)",
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Print / PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewEntry(null)}
                  data-ocid="logbook.cancel_button"
                  style={{
                    background: "transparent",
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
