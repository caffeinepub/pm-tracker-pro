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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  LogOut,
  Settings,
  Star,
  Upload,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
const XLSX = (window as any).XLSX;
import type { ChecklistTemplate } from "../backend";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type {
  AppUser,
  MachineExtended,
  PMPlanExtended,
  UserRecord,
} from "../context/AppContext";
import { useApp } from "../context/AppContext";
import { exportAllDataToExcel } from "../lib/exportExcel";

interface UsersTabProps {
  currentUser: AppUser | null;
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
}

function UsersTab({
  currentUser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
}: UsersTabProps) {
  const [users, setUsers] = useState(() => getUsers());
  const [showAdd, setShowAdd] = useState(false);
  const [editUsername, setEditUsername] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "operator" as "admin" | "operator",
  });
  const [editForm, setEditForm] = useState({
    password: "",
    name: "",
    role: "operator" as "admin" | "operator",
  });

  const refresh = () => setUsers(getUsers());

  const handleAdd = () => {
    if (!form.username || !form.password || !form.name) {
      toast.error("All fields required");
      return;
    }
    const ok = createUser(form.username, form.password, form.name, form.role);
    if (!ok) {
      toast.error("Username already exists");
      return;
    }
    toast.success(`User '${form.username}' created`);
    setForm({ username: "", password: "", name: "", role: "operator" });
    setShowAdd(false);
    refresh();
  };

  const handleEdit = () => {
    if (!editUsername) return;
    updateUser(editUsername, {
      password: editForm.password || undefined,
      name: editForm.name || undefined,
      role: editForm.role,
    });
    toast.success("User updated");
    setEditUsername(null);
    refresh();
  };

  const handleDelete = (username: string) => {
    if (username === currentUser?.username) {
      toast.error("Cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user '${username}'?`)) return;
    deleteUser(username);
    toast.success(`User '${username}' deleted`);
    refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
        >
          User Management
        </h2>
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          data-ocid="users.primary_button"
          style={{
            background: "oklch(0.70 0.188 55)",
            color: "oklch(0.10 0.010 55)",
          }}
        >
          {showAdd ? "Cancel" : "+ Add User"}
        </Button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="industrial-card p-4 mb-4"
        >
          <h3 className="text-sm font-semibold mb-3">New User</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                ["username", "Username", "text"],
                ["password", "Password", "password"],
                ["name", "Full Name", "text"],
              ] as [keyof typeof form, string, string][]
            ).map(([k, lbl, type]) => (
              <div key={k}>
                <Label
                  className="text-xs mb-1"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  {lbl}
                </Label>
                <Input
                  type={type}
                  placeholder={lbl}
                  value={String(form[k])}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                  data-ocid="users.input"
                  className="h-8 text-sm"
                  style={{
                    background: "oklch(0.20 0.022 252)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
              </div>
            ))}
            <div>
              <Label
                className="text-xs mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Role
              </Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as "admin" | "operator" }))
                }
              >
                <SelectTrigger
                  data-ocid="users.select"
                  className="h-8 text-sm"
                  style={{
                    background: "oklch(0.20 0.022 252)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.022 252)" }}>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            className="mt-3"
            onClick={handleAdd}
            data-ocid="users.save_button"
            style={{
              background: "oklch(0.70 0.188 55)",
              color: "oklch(0.10 0.010 55)",
            }}
          >
            Save User
          </Button>
        </motion.div>
      )}

      <div className="industrial-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid oklch(0.34 0.030 252)",
                background: "oklch(0.22 0.022 252)",
              }}
            >
              {["Username", "Full Name", "Role", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(users).map(([uname, udata], idx) => (
              <tr
                key={uname}
                data-ocid={`users.row.${idx + 1}`}
                style={{ borderBottom: "1px solid oklch(0.28 0.020 252)" }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td
                  className="px-4 py-3 font-mono text-xs"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                >
                  {uname}
                </td>
                <td className="px-4 py-3">{udata.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        udata.role === "admin"
                          ? "oklch(0.70 0.188 55 / 0.15)"
                          : "oklch(0.50 0.065 232 / 0.15)",
                      color:
                        udata.role === "admin"
                          ? "oklch(0.80 0.180 55)"
                          : "oklch(0.65 0.150 232)",
                    }}
                  >
                    {udata.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`users.edit_button.${idx + 1}`}
                      onClick={() => {
                        setEditUsername(uname);
                        setEditForm({
                          password: "",
                          name: udata.name,
                          role: udata.role,
                        });
                      }}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        background: "oklch(0.50 0.065 232 / 0.15)",
                        color: "oklch(0.65 0.150 232)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-ocid={`users.delete_button.${idx + 1}`}
                      onClick={() => handleDelete(uname)}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        background: "oklch(0.40 0.150 25 / 0.15)",
                        color: "oklch(0.72 0.170 25)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!editUsername}
        onOpenChange={(o) => !o && setEditUsername(null)}
      >
        <DialogContent
          className="max-w-sm"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.34 0.030 252)",
            color: "oklch(0.88 0.010 260)",
          }}
          data-ocid="users.dialog"
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Edit User — {editUsername}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(
              [
                ["name", "Full Name", "text"],
                ["password", "New Password (leave blank to keep)", "password"],
              ] as [string, string, string][]
            ).map(([k, lbl, type]) => (
              <div key={k}>
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  {lbl}
                </Label>
                <Input
                  type={type}
                  value={editForm[k as "name" | "password"]}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                  data-ocid="users.input"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
              </div>
            ))}
            <div>
              <Label
                className="text-xs"
                style={{ color: "oklch(0.65 0.010 260)" }}
              >
                Role
              </Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((f) => ({
                    ...f,
                    role: v as "admin" | "operator",
                  }))
                }
              >
                <SelectTrigger
                  data-ocid="users.select"
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.022 252)" }}>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleEdit}
              data-ocid="users.save_button"
              style={{
                background: "oklch(0.70 0.188 55)",
                color: "oklch(0.10 0.010 55)",
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

const VALID_ITEM_TYPES = [
  "visual",
  "measurement",
  "lubrication",
  "safety",
  "cleaning",
  "maintenance",
] as const;
const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export default function AdminPage() {
  const {
    user,
    logout,
    machines,
    pmPlans,
    pmRecords,
    checklistTemplates,
    addMachine,
    addPMPlan,
    updateChecklistTemplates,
    navigate,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    prioritizedMachineIds,
    setPrioritizedMachines,
  } = useApp();
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  const [yearlyPlanStatus, setYearlyPlanStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [yearlyPlanMsg, setYearlyPlanMsg] = useState("");
  const [checklistUploadStatus, setChecklistUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [checklistUploadMsg, setChecklistUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const yearlyPlanRef = useRef<HTMLInputElement>(null);
  const checklistUploadRef = useRef<HTMLInputElement>(null);

  if (user?.role !== "admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        <div className="text-center">
          <AlertTriangle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.63 0.22 27)" }}
          />
          <p className="text-lg font-semibold">Access Denied</p>
          <Button className="mt-4" onClick={() => navigate("dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("idle");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<
        string,
        string
      >[];
      if (jsonRows.length === 0)
        throw new Error("Excel file must have at least one data row.");
      let count = 0;
      for (const row of jsonRows) {
        const id = row.ID ?? row.id ?? "";
        const name = row.Name ?? row.name ?? "";
        if (!id || !name) continue;
        const machine: MachineExtended = {
          id: String(id),
          name: String(name),
          department: String(row.Department ?? row.department ?? "General"),
          location: String(row.Location ?? row.location ?? "Unknown"),
          machineType: String(
            row.MachineType ??
              row.machinetype ??
              row.Type ??
              row.type ??
              "General",
          ),
          section: (row.Section ??
            row.section ??
            "") as MachineExtended["section"],
          availableWorkingHours:
            (row.AvailableWorkingHours ?? row.availableworkinghours)
              ? Number(
                  row.AvailableWorkingHours ?? row.availableworkinghours,
                ) || undefined
              : undefined,
        };
        addMachine(machine);
        count++;
      }
      setUploadStatus("success");
      setUploadMsg(
        `✓ Successfully imported ${count} machine(s) from ${file.name}`,
      );
      toast.success(`${count} machines imported successfully`);
    } catch (err) {
      setUploadStatus("error");
      setUploadMsg(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      toast.error("Import failed. Please check the Excel format.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const rows = [
      [
        "ID",
        "Name",
        "Department",
        "Location",
        "MachineType",
        "Section",
        "AvailableWorkingHours",
      ],
      [
        "MC-001",
        "Example Machine",
        "Production",
        "Shop Floor",
        "CNC",
        "Machine Shop",
        "2000",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Machines");
    XLSX.writeFile(wb, "machines_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleExportExcel = () => {
    exportAllDataToExcel(machines, pmPlans, pmRecords, checklistTemplates);
    toast.success("Excel report downloaded!");
  };

  const handleYearlyPlanUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setYearlyPlanStatus("idle");
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) throw new Error("No data rows found.");
      let count = 0;
      for (const row of rows as Record<string, string>[]) {
        const machineId = String(
          row.MachineID ?? row.machineid ?? row["Machine ID"] ?? "",
        ).trim();
        const monthRaw = String(row.Month ?? row.month ?? "")
          .trim()
          .toLowerCase();
        const frequency =
          String(row.Frequency ?? row.frequency ?? "Monthly").trim() ||
          "Monthly";
        const scheduledDate = String(
          row.ScheduledDate ?? row["Scheduled Date"] ?? "",
        ).trim();
        if (!machineId || !monthRaw) continue;
        let month = Number.parseInt(monthRaw, 10);
        if (Number.isNaN(month)) month = MONTH_MAP[monthRaw.slice(0, 3)] ?? 0;
        if (month < 1 || month > 12) continue;
        addPMPlan({
          machineId,
          month: BigInt(month),
          frequency,
          checklistTemplateId: "",
          scheduledDate: scheduledDate || undefined,
        } as PMPlanExtended);
        count++;
      }
      setYearlyPlanStatus("success");
      setYearlyPlanMsg(`✓ Imported ${count} plan entries from ${file.name}`);
      toast.success(`${count} yearly plan entries imported`);
    } catch (err) {
      setYearlyPlanStatus("error");
      setYearlyPlanMsg(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      toast.error("Yearly plan import failed.");
    }
    if (yearlyPlanRef.current) yearlyPlanRef.current.value = "";
  };

  const handleDownloadYearlyPlanTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["MachineID", "Month", "Frequency", "ScheduledDate"],
      ["MC-001", "1", "Monthly", "2026-01-15"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "YearlyPlan");
    XLSX.writeFile(wb, "yearly_plan_template.xlsx");
    toast.success("Yearly plan template downloaded");
  };

  const handleChecklistUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChecklistUploadStatus("idle");
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const templates: ChecklistTemplate[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const items = (rows as Record<string, string>[])
          .filter((row) =>
            String(row.Description ?? row.description ?? "").trim(),
          )
          .map((row, idx) => {
            const rawType = String(row.Type ?? row.type ?? "visual")
              .trim()
              .toLowerCase();
            const itemType = VALID_ITEM_TYPES.includes(rawType as any)
              ? rawType
              : "visual";
            return {
              id: `item-${sheetName.toLowerCase().replace(/\s+/g, "-")}-${idx + 1}`,
              description: String(
                row.Description ?? row.description ?? "",
              ).trim(),
              itemType,
            };
          });
        templates.push({
          id: `tmpl-${sheetName.toLowerCase().replace(/\s+/g, "-")}`,
          machineType: sheetName,
          items,
        });
      }
      updateChecklistTemplates(templates);
      setChecklistUploadStatus("success");
      setChecklistUploadMsg(
        `✓ Imported ${templates.length} checklist template(s) from ${file.name}`,
      );
      toast.success(`${templates.length} checklist templates imported`);
    } catch (err) {
      setChecklistUploadStatus("error");
      setChecklistUploadMsg(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      toast.error("Checklist import failed.");
    }
    if (checklistUploadRef.current) checklistUploadRef.current.value = "";
  };

  const handleDownloadChecklistTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleRows = [
      ["No", "Description", "Type"],
      [1, "Check oil level", "lubrication"],
      [2, "Inspect drive belt", "visual"],
      [3, "Measure spindle vibration", "measurement"],
    ];
    for (const name of ["Machine_A", "Machine_B"]) {
      const ws = XLSX.utils.aoa_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    XLSX.writeFile(wb, "checklist_template.xlsx");
    toast.success("Checklist template downloaded");
  };

  const statusStyle = (s: "idle" | "success" | "error") => ({
    background:
      s === "success"
        ? "oklch(0.45 0.120 145 / 0.15)"
        : "oklch(0.45 0.180 27 / 0.15)",
    border: `1px solid ${s === "success" ? "oklch(0.52 0.120 145 / 0.5)" : "oklch(0.52 0.170 27 / 0.5)"}`,
    color: s === "success" ? "oklch(0.75 0.130 145)" : "oklch(0.75 0.170 27)",
  });

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
                data-ocid="admin.close_button"
                onClick={() => navigate("dashboard")}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                ←
              </button>
              <Settings
                className="w-5 h-5"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Admin{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>Panel</span>
              </span>
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
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                data-ocid="admin.export_button"
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  background: "oklch(0.70 0.188 55 / 0.15)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.35)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
              <button
                type="button"
                data-ocid="admin.logout.button"
                onClick={logout}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full pb-20 md:pb-0">
          <Tabs defaultValue="upload" data-ocid="admin.panel">
            <TabsList
              className="mb-6 grid grid-cols-2 w-full max-w-xs"
              style={{ background: "oklch(0.22 0.022 252)" }}
            >
              <TabsTrigger
                data-ocid="admin.tab"
                value="upload"
                className="flex items-center gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </TabsTrigger>
              <TabsTrigger
                data-ocid="admin.tab"
                value="users"
                className="flex items-center gap-1.5 text-xs"
              >
                <Users className="w-3.5 h-3.5" /> Users
              </TabsTrigger>
            </TabsList>

            {/* UPLOAD TAB */}
            <TabsContent value="upload">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl space-y-6"
              >
                {/* Machine CSV Upload */}
                <div className="industrial-card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Database
                      className="w-4 h-4"
                      style={{ color: "oklch(0.80 0.180 55)" }}
                    />
                    <h2
                      className="text-base font-semibold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      1. Import Machine Data
                    </h2>
                  </div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    Upload a CSV file with machine master data.
                  </p>
                  <p
                    className="text-xs mb-5 font-mono"
                    style={{
                      color: "oklch(0.55 0.010 260)",
                      background: "oklch(0.20 0.022 252)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      display: "inline-block",
                    }}
                  >
                    Columns: ID | Name | Department | Location | MachineType |
                    Section | AvailableWorkingHours
                  </p>
                  <button
                    type="button"
                    className="border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer w-full hover:opacity-80"
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      background: "oklch(0.20 0.022 252)",
                    }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileSpreadsheet
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    />
                    <p className="text-sm font-medium">
                      Click to browse CSV file
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      Supports: .xlsx/.xls — Section values: "Powder Coating",
                      "Machine Shop", "Utility"
                    </p>
                    <input
                      ref={fileRef}
                      data-ocid="admin.upload_button"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </button>
                  {uploadStatus !== "idle" && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
                      style={statusStyle(uploadStatus)}
                    >
                      {uploadStatus === "success" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}{" "}
                      {uploadMsg}
                    </div>
                  )}
                  <Button
                    data-ocid="admin.secondary_button"
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.68 0.010 260)",
                    }}
                  >
                    <Download className="w-4 h-4" /> Download CSV Template
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.34 0.030 252)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.50 0.010 260)" }}
                  >
                    EXCEL IMPORTS
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.34 0.030 252)" }}
                  />
                </div>

                {/* Yearly Plan Upload */}
                <div className="industrial-card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar
                      className="w-4 h-4"
                      style={{ color: "oklch(0.70 0.155 232)" }}
                    />
                    <h2
                      className="text-base font-semibold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      2. Upload Yearly Plan
                    </h2>
                  </div>
                  <p
                    className="text-xs mb-5 font-mono"
                    style={{
                      color: "oklch(0.55 0.010 260)",
                      background: "oklch(0.20 0.022 252)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      display: "inline-block",
                    }}
                  >
                    Columns: MachineID | Month (1-12) | Frequency |
                    ScheduledDate (YYYY-MM-DD)
                  </p>
                  <button
                    type="button"
                    className="border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer w-full hover:opacity-80"
                    style={{
                      borderColor: "oklch(0.40 0.070 232 / 0.6)",
                      background: "oklch(0.20 0.022 252)",
                    }}
                    onClick={() => yearlyPlanRef.current?.click()}
                  >
                    <FileSpreadsheet
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "oklch(0.70 0.155 232)" }}
                    />
                    <p className="text-sm font-medium">
                      Click to browse Excel file
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      Supports: .xlsx, .xls
                    </p>
                    <input
                      ref={yearlyPlanRef}
                      data-ocid="admin.upload_button"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleYearlyPlanUpload}
                      className="hidden"
                    />
                  </button>
                  {yearlyPlanStatus !== "idle" && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
                      style={statusStyle(yearlyPlanStatus)}
                    >
                      {yearlyPlanStatus === "success" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}{" "}
                      {yearlyPlanMsg}
                    </div>
                  )}
                  <Button
                    data-ocid="admin.secondary_button"
                    variant="outline"
                    onClick={handleDownloadYearlyPlanTemplate}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.68 0.010 260)",
                    }}
                  >
                    <Download className="w-4 h-4" /> Download Yearly Plan
                    Template
                  </Button>
                </div>

                {/* Checklist Upload */}
                <div className="industrial-card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList
                      className="w-4 h-4"
                      style={{ color: "oklch(0.65 0.140 145)" }}
                    />
                    <h2
                      className="text-base font-semibold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      3. Upload Checklist Templates
                    </h2>
                  </div>
                  <p
                    className="text-xs mb-5 font-mono"
                    style={{
                      color: "oklch(0.55 0.010 260)",
                      background: "oklch(0.20 0.022 252)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      display: "inline-block",
                    }}
                  >
                    Multi-sheet Excel: one sheet per machine. Columns per sheet:
                    No | Description | Type
                  </p>
                  <button
                    type="button"
                    className="border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer w-full hover:opacity-80"
                    style={{
                      borderColor: "oklch(0.40 0.090 145 / 0.6)",
                      background: "oklch(0.20 0.022 252)",
                    }}
                    onClick={() => checklistUploadRef.current?.click()}
                  >
                    <FileSpreadsheet
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "oklch(0.65 0.140 145)" }}
                    />
                    <p className="text-sm font-medium">
                      Click to browse Excel file
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      Supports: .xlsx, .xls — One sheet per machine
                    </p>
                    <input
                      ref={checklistUploadRef}
                      data-ocid="admin.upload_button"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleChecklistUpload}
                      className="hidden"
                    />
                  </button>
                  {checklistUploadStatus !== "idle" && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
                      style={statusStyle(checklistUploadStatus)}
                    >
                      {checklistUploadStatus === "success" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}{" "}
                      {checklistUploadMsg}
                    </div>
                  )}
                  <Button
                    data-ocid="admin.secondary_button"
                    variant="outline"
                    onClick={handleDownloadChecklistTemplate}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.68 0.010 260)",
                    }}
                  >
                    <Download className="w-4 h-4" /> Download Checklist Template
                  </Button>
                </div>
              </motion.div>

              {/* Today's Priority Machines */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl p-5 mt-4"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  border: "1px solid oklch(0.34 0.030 252)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Star
                    className="w-4 h-4"
                    style={{ color: "oklch(0.82 0.18 80)" }}
                  />
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.90 0.010 260)" }}
                  >
                    Today&apos;s Priority Machines
                  </h3>
                </div>
                <p
                  className="text-xs mb-3"
                  style={{ color: "oklch(0.60 0.010 260)" }}
                >
                  {prioritizedMachineIds.length} machine
                  {prioritizedMachineIds.length !== 1 ? "s" : ""} prioritized
                  for today
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(() => {
                    const todayMidnight = new Date();
                    todayMidnight.setHours(0, 0, 0, 0);
                    const completedTodayIds = new Set(
                      pmRecords
                        .filter(
                          (r) =>
                            Number(r.completedDate) >=
                              todayMidnight.getTime() &&
                            (r.status === "completed" ||
                              r.status === "pending-approval"),
                        )
                        .map((r) => r.machineId),
                    );
                    return machines
                      .filter((m) => !completedTodayIds.has(m.id))
                      .map((machine) => {
                        const isPrio = prioritizedMachineIds.includes(
                          machine.id,
                        );
                        return (
                          <label
                            key={machine.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                            style={{
                              background: isPrio
                                ? "oklch(0.65 0.18 80 / 0.12)"
                                : "oklch(0.22 0.018 255)",
                              border: `1px solid ${isPrio ? "oklch(0.65 0.18 80 / 0.40)" : "oklch(0.30 0.020 252)"}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={isPrio}
                              onChange={() => {
                                const newIds = isPrio
                                  ? prioritizedMachineIds.filter(
                                      (id) => id !== machine.id,
                                    )
                                  : [...prioritizedMachineIds, machine.id];
                                setPrioritizedMachines(newIds);
                              }}
                              style={{ accentColor: "oklch(0.75 0.18 80)" }}
                            />
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-xs font-medium truncate"
                                style={{ color: "oklch(0.88 0.010 260)" }}
                              >
                                {machine.name}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: "oklch(0.55 0.010 260)" }}
                              >
                                {machine.id} · {machine.department || "—"}
                              </div>
                            </div>
                            {isPrio && (
                              <Star
                                className="w-3.5 h-3.5 flex-shrink-0"
                                style={{ color: "oklch(0.82 0.18 80)" }}
                              />
                            )}
                          </label>
                        );
                      });
                  })()}
                  {machines.length === 0 && (
                    <p
                      className="text-xs text-center py-4"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      No machines configured yet. Upload a machine master first.
                    </p>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* USERS TAB */}
            <TabsContent value="users">
              <UsersTab
                currentUser={user}
                getUsers={getUsers}
                createUser={createUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
              />
            </TabsContent>
          </Tabs>
        </main>

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
