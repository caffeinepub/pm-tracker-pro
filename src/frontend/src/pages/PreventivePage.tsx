import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Download,
  Edit2,
  History,
  LogOut,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ChecklistItem, ChecklistTemplate } from "../backend";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { MachineExtended, PMPlanExtended } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const EMPTY_MACHINE: Omit<MachineExtended, never> = {
  id: "",
  name: "",
  department: "",
  location: "",
  machineType: "",
  section: "",
  availableWorkingHours: undefined,
};

const SECTION_OPTIONS = ["Powder Coating", "Machine Shop", "Utility"] as const;

export default function PreventivePage() {
  const {
    user,
    logout,
    navigate,
    machines,
    pmPlans,
    pmRecords,
    checklistTemplates,
    addMachine,
    updateMachine,
    deleteMachine,
    addPMPlan,
    updatePMPlan,
    deletePMPlan,
    updateChecklistTemplates,
    approveRecord,
    rejectRecord,
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMachine, setNewMachine] = useState({ ...EMPTY_MACHINE });
  const [editingTemplates, setEditingTemplates] = useState<
    Record<string, ChecklistTemplate>
  >({});
  const [editCell, setEditCell] = useState<{
    machineId: string;
    month: number;
    plan: PMPlanExtended | null;
  } | null>(null);
  const [editEnabled, setEditEnabled] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editFrequency, setEditFrequency] = useState("Monthly");
  const [pmApprovalId, setPmApprovalId] = useState<string | null>(null);
  const [addToHistory, setAddToHistory] = useState(false);
  const [historyRemarks, setHistoryRemarks] = useState("");
  const [editMachineId, setEditMachineId] = useState<string | null>(null);
  const [editMachineForm, setEditMachineForm] = useState<
    Partial<MachineExtended>
  >({});

  const XLSX = (window as any).XLSX;

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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

  function openCellEdit(machineId: string, month: number) {
    const plan =
      pmPlans.find(
        (p) => p.machineId === machineId && Number(p.month) === month,
      ) || null;
    setEditCell({ machineId, month, plan });
    setEditEnabled(!!plan);
    setEditDate(plan?.scheduledDate ?? "");
    setEditFrequency(plan?.frequency ?? "Monthly");
  }

  function saveCellEdit() {
    if (!editCell) return;
    const { machineId, month, plan } = editCell;
    if (!editEnabled) {
      if (plan) deletePMPlan(machineId, BigInt(month));
    } else {
      if (plan) {
        updatePMPlan(machineId, BigInt(month), {
          frequency: editFrequency,
          scheduledDate: editDate || undefined,
        });
      } else {
        addPMPlan({
          machineId,
          month: BigInt(month),
          frequency: editFrequency,
          checklistTemplateId: "",
          scheduledDate: editDate || undefined,
        } as PMPlanExtended);
      }
    }
    setEditCell(null);
    toast.success("PM Plan updated");
  }

  const handleAddMachine = () => {
    if (!newMachine.id || !newMachine.name) {
      toast.error("Machine ID and Name are required.");
      return;
    }
    addMachine({ ...newMachine });
    setNewMachine({ ...EMPTY_MACHINE });
    setShowAddForm(false);
    toast.success(`Machine '${newMachine.name}' added`);
  };

  const handleExportRecords = () => {
    const rows = [
      [
        "Record ID",
        "Machine ID",
        "Operator",
        "Status",
        "Completed Date",
        "Items Count",
      ],
      ...pmRecords.map((r) => [
        r.id,
        r.machineId,
        r.operatorName,
        r.status,
        new Date(Number(r.completedDate)).toLocaleString("en-IN"),
        String(r.checklistResults.length),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Records");
    XLSX.writeFile(
      wb,
      `pm_records_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Records exported as Excel");
  };

  const pendingApprovals = pmRecords.filter(
    (r) => r.status === "pending-approval",
  );

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
              <Settings
                className="w-5 h-5"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Preventive{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>
                  Maintenance
                </span>
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
              {pendingApprovals.length > 0 && (
                <Badge
                  style={{
                    background: "oklch(0.62 0.220 25 / 0.20)",
                    color: "oklch(0.75 0.200 25)",
                    border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                  }}
                >
                  {pendingApprovals.length} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
                data-ocid="preventive.logout.button"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20 md:pb-6">
          <Tabs defaultValue="machines" data-ocid="preventive.panel">
            <TabsList
              className="mb-6 flex flex-wrap gap-1 h-auto p-1 w-full"
              style={{ background: "oklch(0.22 0.022 252)" }}
            >
              {[
                { value: "machines", icon: Database, label: "Machines" },
                {
                  value: "checklists",
                  icon: ClipboardList,
                  label: "Checklists",
                },
                { value: "records", icon: Activity, label: "PM Records" },
                {
                  value: "approvals",
                  icon: Clock,
                  label: "PM Approvals",
                  badge: pendingApprovals.length,
                },
                { value: "yearly-plan", icon: Calendar, label: "Yearly Plan" },
              ].map(({ value, icon: Icon, label, badge }) => (
                <TabsTrigger
                  key={value}
                  data-ocid="preventive.tab"
                  value={value}
                  className="flex items-center gap-1.5 text-xs relative"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                  {badge && badge > 0 && (
                    <Badge
                      className="ml-1 h-4 px-1 text-[10px] font-bold"
                      style={{
                        background: "oklch(0.62 0.220 25)",
                        color: "white",
                      }}
                    >
                      {badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* MACHINES TAB */}
            <TabsContent value="machines">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2
                      className="text-base font-semibold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      Machine Master
                    </h2>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      {machines.length} machine(s) in system
                    </p>
                  </div>
                  <Button
                    data-ocid="preventive.primary_button"
                    size="sm"
                    onClick={() => setShowAddForm((v) => !v)}
                    style={{
                      background: "oklch(0.70 0.188 55)",
                      color: "oklch(0.10 0.010 55)",
                    }}
                  >
                    {showAddForm ? (
                      <>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Machine
                      </>
                    )}
                  </Button>
                </div>

                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="industrial-card p-5 mb-4"
                  >
                    <h3 className="text-sm font-semibold mb-3">
                      Add New Machine
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(
                        [
                          ["id", "Machine ID", "CNC-006"],
                          ["name", "Machine Name", "CNC Milling"],
                          ["department", "Department", "Production"],
                          ["location", "Location", "Shop Floor A"],
                          ["machineType", "Type", "CNC"],
                        ] as [keyof typeof newMachine, string, string][]
                      ).map(([key, label, placeholder]) => (
                        <div key={key}>
                          <Label
                            className="text-xs mb-1"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {label}
                          </Label>
                          <Input
                            data-ocid="preventive.input"
                            placeholder={placeholder}
                            value={String(newMachine[key] ?? "")}
                            onChange={(e) =>
                              setNewMachine((p) => ({
                                ...p,
                                [key]: e.target.value,
                              }))
                            }
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
                          Section
                        </Label>
                        <Select
                          value={newMachine.section ?? ""}
                          onValueChange={(v) =>
                            setNewMachine((p) => ({
                              ...p,
                              section: v as MachineExtended["section"],
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-sm"
                            style={{
                              background: "oklch(0.20 0.022 252)",
                              borderColor: "oklch(0.34 0.030 252)",
                            }}
                          >
                            <SelectValue placeholder="Section" />
                          </SelectTrigger>
                          <SelectContent
                            style={{ background: "oklch(0.22 0.022 252)" }}
                          >
                            {SECTION_OPTIONS.map((s) => (
                              <SelectItem key={s || "none"} value={s}>
                                {s || "(unassigned)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          className="text-xs mb-1"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          Avail. Hours/Year
                        </Label>
                        <Input
                          type="number"
                          data-ocid="preventive.input"
                          placeholder="2000"
                          value={newMachine.availableWorkingHours ?? ""}
                          onChange={(e) =>
                            setNewMachine((p) => ({
                              ...p,
                              availableWorkingHours:
                                Number(e.target.value) || undefined,
                            }))
                          }
                          className="h-8 text-sm"
                          style={{
                            background: "oklch(0.20 0.022 252)",
                            borderColor: "oklch(0.34 0.030 252)",
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      data-ocid="preventive.save_button"
                      size="sm"
                      className="mt-3"
                      onClick={handleAddMachine}
                      style={{
                        background: "oklch(0.70 0.188 55)",
                        color: "oklch(0.10 0.010 55)",
                      }}
                    >
                      Save Machine
                    </Button>
                  </motion.div>
                )}

                <div className="industrial-card overflow-hidden">
                  {machines.length === 0 ? (
                    <div
                      className="p-10 text-center"
                      data-ocid="machines.empty_state"
                    >
                      <Database
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: "oklch(0.45 0.010 260)" }}
                      />
                      <p
                        className="text-sm"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        No machines yet. Add machines or upload CSV from Admin
                        Panel.
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
                              "ID",
                              "Name",
                              "Department",
                              "Location",
                              "Type",
                              "Section",
                              "Avail. Hrs",
                              "Actions",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {machines.map((m, idx) => (
                            <TableRow
                              key={m.id}
                              data-ocid={`machines.row.${idx + 1}`}
                              style={{ borderColor: "oklch(0.28 0.025 252)" }}
                            >
                              <TableCell
                                className="text-xs font-mono"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {m.id}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {m.name}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {m.department}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {m.location}
                              </TableCell>
                              <TableCell className="text-xs">
                                {m.machineType}
                              </TableCell>
                              <TableCell className="text-xs">
                                {m.section ? (
                                  <Badge
                                    style={{
                                      background:
                                        "oklch(0.50 0.065 232 / 0.15)",
                                      color: "oklch(0.65 0.150 232)",
                                      border:
                                        "1px solid oklch(0.50 0.065 232 / 0.4)",
                                    }}
                                  >
                                    {m.section}
                                  </Badge>
                                ) : (
                                  <span
                                    style={{ color: "oklch(0.45 0.010 260)" }}
                                  >
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {m.availableWorkingHours ?? "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    data-ocid={`machines.edit_button.${idx + 1}`}
                                    onClick={() => {
                                      setEditMachineId(m.id);
                                      setEditMachineForm({ ...m });
                                    }}
                                    className="p-1.5 rounded"
                                    style={{ color: "oklch(0.65 0.150 232)" }}
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    data-ocid={`machines.delete_button.${idx + 1}`}
                                    onClick={() => {
                                      deleteMachine(m.id);
                                      toast.success(
                                        `Machine '${m.name}' deleted`,
                                      );
                                    }}
                                    className="p-1.5 rounded"
                                    style={{ color: "oklch(0.72 0.200 25)" }}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* CHECKLISTS TAB */}
            <TabsContent value="checklists">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-base font-semibold"
                    style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                  >
                    Checklist Templates ({checklistTemplates.length})
                  </h2>
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Edit items inline, then click Save
                  </span>
                </div>
                <div className="grid gap-4">
                  {checklistTemplates.length === 0 ? (
                    <div
                      className="industrial-card p-10 text-center"
                      data-ocid="checklists.empty_state"
                    >
                      <ClipboardList
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: "oklch(0.45 0.010 260)" }}
                      />
                      <p
                        className="text-sm"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        No checklist templates. Upload from Admin Panel → Upload
                        tab.
                      </p>
                    </div>
                  ) : (
                    checklistTemplates.map((tmpl, tIdx) => {
                      const editing = editingTemplates[tmpl.id] ?? tmpl;
                      const setEditing = (updated: ChecklistTemplate) =>
                        setEditingTemplates((prev) => ({
                          ...prev,
                          [tmpl.id]: updated,
                        }));
                      return (
                        <div
                          key={tmpl.id}
                          data-ocid={`checklists.item.${tIdx + 1}`}
                          className="industrial-card p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm font-semibold">
                                {tmpl.id}
                              </span>
                              <span
                                className="ml-2 text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: "oklch(0.50 0.065 232 / 0.2)",
                                  color: "oklch(0.70 0.065 232)",
                                }}
                              >
                                {tmpl.machineType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {editing.items.length} items
                              </span>
                              <Button
                                data-ocid={`checklists.save_button.${tIdx + 1}`}
                                size="sm"
                                onClick={() => {
                                  updateChecklistTemplates([editing]);
                                  setEditingTemplates((prev) => {
                                    const next = { ...prev };
                                    delete next[tmpl.id];
                                    return next;
                                  });
                                  toast.success("Checklist saved");
                                }}
                                className="h-7 text-xs px-3"
                                style={{
                                  background: "oklch(0.55 0.188 145)",
                                  color: "white",
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 mb-3">
                            {editing.items.map(
                              (item: ChecklistItem, iIdx: number) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{
                                      background: "oklch(0.34 0.034 253)",
                                      color: "oklch(0.68 0.010 260)",
                                    }}
                                  >
                                    {iIdx + 1}
                                  </span>
                                  <Input
                                    data-ocid={`checklists.input.${tIdx + 1}`}
                                    value={item.description}
                                    onChange={(e) => {
                                      const updated = {
                                        ...editing,
                                        items: editing.items.map((it, i) =>
                                          i === iIdx
                                            ? {
                                                ...it,
                                                description: e.target.value,
                                              }
                                            : it,
                                        ),
                                      };
                                      setEditing(updated);
                                    }}
                                    className="flex-1 h-7 text-xs"
                                    style={{
                                      background: "oklch(0.20 0.022 252)",
                                      borderColor: "oklch(0.34 0.030 252)",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = {
                                        ...editing,
                                        items: editing.items.filter(
                                          (_, i) => i !== iIdx,
                                        ),
                                      };
                                      setEditing(updated);
                                    }}
                                    className="p-1 rounded hover:opacity-80"
                                    style={{ color: "oklch(0.72 0.200 25)" }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newItem = {
                                id: `item-${Date.now()}`,
                                description: "",
                                itemType: "visual",
                              };
                              setEditing({
                                ...editing,
                                items: [...editing.items, newItem],
                              });
                            }}
                            className="h-7 text-xs"
                            style={{
                              borderColor: "oklch(0.34 0.030 252)",
                              color: "oklch(0.68 0.010 260)",
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* RECORDS TAB */}
            <TabsContent value="records">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2
                      className="text-base font-semibold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      PM Records
                    </h2>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      {pmRecords.length} total record(s)
                    </p>
                  </div>
                  <Button
                    data-ocid="preventive.primary_button"
                    size="sm"
                    onClick={handleExportRecords}
                    style={{
                      background: "oklch(0.60 0.155 145)",
                      color: "oklch(0.10 0.060 145)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                  </Button>
                </div>
                <div className="industrial-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow
                        style={{ borderColor: "oklch(0.34 0.030 252)" }}
                      >
                        {[
                          "Record ID",
                          "Machine",
                          "Operator",
                          "Status",
                          "Date",
                          "Items",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="text-xs font-semibold"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pmRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8"
                            data-ocid="records.empty_state"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            No PM records yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pmRecords.map((r, idx) => (
                          <TableRow
                            key={r.id}
                            data-ocid={`records.row.${idx + 1}`}
                            style={{ borderColor: "oklch(0.34 0.030 252)" }}
                          >
                            <TableCell
                              className="text-xs font-mono"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {r.id.slice(0, 12)}…
                            </TableCell>
                            <TableCell
                              className="text-sm font-semibold"
                              style={{ color: "oklch(0.80 0.180 55)" }}
                            >
                              {r.machineId}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.operatorName}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === "completed" ? "status-completed" : r.status === "rejected" ? "status-rejected" : "status-pending"}`}
                              >
                                {r.status}
                              </span>
                            </TableCell>
                            <TableCell
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {new Date(
                                Number(r.completedDate),
                              ).toLocaleDateString("en-IN")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.checklistResults.length}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </TabsContent>

            {/* PM APPROVALS TAB */}
            <TabsContent value="approvals">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="industrial-card p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock
                    className="w-5 h-5"
                    style={{ color: "oklch(0.80 0.180 55)" }}
                  />
                  <h2
                    className="text-lg font-bold"
                    style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                  >
                    Preventive Approvals
                  </h2>
                  <Badge
                    style={{
                      background: "oklch(0.62 0.220 25 / 0.20)",
                      color: "oklch(0.75 0.200 25)",
                      border: "1px solid oklch(0.62 0.220 25 / 0.4)",
                    }}
                  >
                    {pendingApprovals.length} pending
                  </Badge>
                </div>
                {pendingApprovals.length === 0 ? (
                  <div
                    data-ocid="approvals.empty_state"
                    className="text-center py-16"
                  >
                    <CheckCircle2
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: "oklch(0.75 0.130 145)" }}
                    />
                    <p className="font-semibold">No Pending Approvals</p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      All submitted checklists have been reviewed.
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
                            "Operator",
                            "Submitted Date",
                            "Items",
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
                        {pendingApprovals.map((r, idx) => {
                          const machine = machines.find(
                            (m) => m.id === r.machineId,
                          );
                          return (
                            <TableRow
                              key={r.id}
                              data-ocid={`approvals.row.${idx + 1}`}
                              style={{ borderColor: "oklch(0.34 0.030 252)" }}
                            >
                              <TableCell
                                className="font-semibold"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {machine?.name ?? r.machineId}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.operatorName}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {new Date(
                                  Number(r.completedDate),
                                ).toLocaleDateString("en-IN")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.checklistResults.length}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    data-ocid={`approvals.confirm_button.${idx + 1}`}
                                    onClick={() => {
                                      setPmApprovalId(r.id);
                                      setAddToHistory(false);
                                      setHistoryRemarks("");
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
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
                                    data-ocid={`approvals.delete_button.${idx + 1}`}
                                    onClick={() => {
                                      rejectRecord(r.id);
                                      toast.error(
                                        `PM Rejected for ${machine?.name ?? r.machineId}`,
                                      );
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                    style={{
                                      background: "oklch(0.45 0.180 27 / 0.20)",
                                      border:
                                        "1px solid oklch(0.52 0.170 27 / 0.5)",
                                      color: "oklch(0.75 0.170 27)",
                                    }}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />{" "}
                                    Reject
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

              {/* PM Approval History Dialog */}
              <Dialog
                open={!!pmApprovalId}
                onOpenChange={(o) => !o && setPmApprovalId(null)}
              >
                <DialogContent
                  className="max-w-sm"
                  style={{
                    background: "oklch(0.22 0.022 252)",
                    border: "1px solid oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                  data-ocid="pm_approval.dialog"
                >
                  <DialogHeader>
                    <DialogTitle
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      Approve PM Record
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="add-hist"
                        checked={addToHistory}
                        onCheckedChange={(v) => setAddToHistory(!!v)}
                        data-ocid="pm_approval.checkbox"
                      />
                      <Label
                        htmlFor="add-hist"
                        className="cursor-pointer text-sm"
                      >
                        Major changes done? Add to History Card?
                      </Label>
                    </div>
                    {addToHistory && (
                      <div>
                        <Label
                          className="text-xs"
                          style={{ color: "oklch(0.65 0.010 260)" }}
                        >
                          History Remarks
                        </Label>
                        <Textarea
                          value={historyRemarks}
                          onChange={(e) => setHistoryRemarks(e.target.value)}
                          rows={2}
                          data-ocid="pm_approval.textarea"
                          style={{
                            background: "oklch(0.19 0.020 255)",
                            borderColor: "oklch(0.34 0.030 252)",
                          }}
                        />
                      </div>
                    )}
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setPmApprovalId(null)}
                        data-ocid="pm_approval.cancel_button"
                        style={{
                          borderColor: "oklch(0.34 0.030 252)",
                          color: "oklch(0.68 0.010 260)",
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          approveRecord(
                            pmApprovalId!,
                            addToHistory,
                            historyRemarks,
                          );
                          toast.success("PM record approved!");
                          setPmApprovalId(null);
                        }}
                        data-ocid="pm_approval.confirm_button"
                        style={{
                          background: "oklch(0.45 0.120 145 / 0.25)",
                          color: "oklch(0.75 0.130 145)",
                          border: "1px solid oklch(0.52 0.120 145 / 0.5)",
                        }}
                      >
                        Confirm Approval
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* YEARLY PLAN TAB */}
            <TabsContent value="yearly-plan">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calendar
                      className="w-5 h-5"
                      style={{ color: "oklch(0.70 0.188 55)" }}
                    />{" "}
                    Yearly PM Plan — {currentYear}
                  </h2>
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    Click any cell to edit
                  </span>
                </div>
                <div
                  className="overflow-x-auto rounded-lg border"
                  style={{ borderColor: "oklch(0.34 0.030 252)" }}
                >
                  <table
                    className="w-full text-sm border-collapse"
                    style={{ minWidth: "900px" }}
                  >
                    <thead>
                      <tr style={{ background: "oklch(0.22 0.022 252)" }}>
                        <th
                          className="py-3 px-3 text-left font-semibold sticky left-0 z-10"
                          style={{
                            background: "oklch(0.22 0.022 252)",
                            color: "oklch(0.70 0.010 260)",
                            borderBottom: "1px solid oklch(0.34 0.030 252)",
                            minWidth: "160px",
                          }}
                        >
                          Machine
                        </th>
                        {MONTHS.map((m, i) => (
                          <th
                            key={m}
                            className="py-3 px-2 text-center font-semibold"
                            style={{
                              background:
                                i + 1 === currentMonth
                                  ? "oklch(0.26 0.040 252)"
                                  : "oklch(0.22 0.022 252)",
                              color:
                                i + 1 === currentMonth
                                  ? "oklch(0.70 0.188 55)"
                                  : "oklch(0.70 0.010 260)",
                              borderBottom: "1px solid oklch(0.34 0.030 252)",
                              borderLeft: "1px solid oklch(0.28 0.025 252)",
                              minWidth: "80px",
                            }}
                          >
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {machines.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="py-8 text-center text-sm"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            No machines found. Add machines first.
                          </td>
                        </tr>
                      ) : (
                        machines.map((machine, rowIdx) => (
                          <tr
                            key={machine.id}
                            data-ocid={`yearly.row.${rowIdx + 1}`}
                            style={{
                              borderBottom: "1px solid oklch(0.28 0.025 252)",
                            }}
                          >
                            <td
                              className="py-2 px-3 font-medium sticky left-0 z-10"
                              style={{
                                background: "oklch(0.19 0.020 255)",
                                color: "oklch(0.85 0.010 260)",
                                borderRight: "1px solid oklch(0.28 0.025 252)",
                              }}
                            >
                              <div className="font-semibold text-xs">
                                {machine.name}
                              </div>
                              <div
                                className="text-xs mt-0.5"
                                style={{ color: "oklch(0.55 0.010 260)" }}
                              >
                                {machine.department}
                              </div>
                            </td>
                            {MONTHS.map((m, i) => {
                              const month = i + 1;
                              const plan = pmPlans.find(
                                (p) =>
                                  p.machineId === machine.id &&
                                  Number(p.month) === month,
                              );
                              return (
                                <td
                                  key={m}
                                  className="py-2 px-1 text-center cursor-pointer"
                                  data-ocid={`yearly.item.${rowIdx + 1}`}
                                  style={{
                                    background:
                                      month === currentMonth
                                        ? "oklch(0.21 0.028 252)"
                                        : "oklch(0.185 0.018 255)",
                                    borderLeft:
                                      "1px solid oklch(0.28 0.025 252)",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="w-full min-h-[40px] flex flex-col items-center justify-center"
                                    onClick={() =>
                                      openCellEdit(machine.id, month)
                                    }
                                  >
                                    {plan ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span
                                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                                          style={{
                                            background: "oklch(0.32 0.12 145)",
                                            color: "oklch(0.88 0.10 145)",
                                          }}
                                        >
                                          {plan.frequency.charAt(0)}
                                        </span>
                                        {plan.scheduledDate && (
                                          <span
                                            className="text-[10px]"
                                            style={{
                                              color: "oklch(0.60 0.010 260)",
                                            }}
                                          >
                                            {new Date(
                                              `${plan.scheduledDate}T00:00:00`,
                                            ).getDate()}{" "}
                                            {m}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span
                                        style={{
                                          color: "oklch(0.38 0.010 260)",
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cell Edit Dialog */}
                <Dialog
                  open={!!editCell}
                  onOpenChange={(o) => !o && setEditCell(null)}
                >
                  <DialogContent
                    className="max-w-sm"
                    style={{
                      background: "oklch(0.22 0.022 252)",
                      border: "1px solid oklch(0.34 0.030 252)",
                      color: "oklch(0.88 0.010 260)",
                    }}
                    data-ocid="yearly_plan.dialog"
                  >
                    <DialogHeader>
                      <DialogTitle
                        style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                      >
                        Edit PM Plan — {editCell?.machineId} /{" "}
                        {editCell && MONTHS[editCell.month - 1]}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="plan-enabled"
                          checked={editEnabled}
                          onCheckedChange={(v) => setEditEnabled(!!v)}
                          data-ocid="yearly_plan.checkbox"
                        />
                        <Label
                          htmlFor="plan-enabled"
                          className="cursor-pointer text-sm"
                        >
                          Plan scheduled for this month
                        </Label>
                      </div>
                      {editEnabled && (
                        <>
                          <div>
                            <Label
                              className="text-xs"
                              style={{ color: "oklch(0.65 0.010 260)" }}
                            >
                              Frequency
                            </Label>
                            <Select
                              value={editFrequency}
                              onValueChange={setEditFrequency}
                            >
                              <SelectTrigger
                                data-ocid="yearly_plan.select"
                                style={{
                                  background: "oklch(0.19 0.020 255)",
                                  borderColor: "oklch(0.34 0.030 252)",
                                }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent
                                style={{ background: "oklch(0.22 0.022 252)" }}
                              >
                                {[
                                  "Monthly",
                                  "Quarterly",
                                  "Fortnightly",
                                  "Weekly",
                                  "Bi-Monthly",
                                ].map((f) => (
                                  <SelectItem key={f} value={f}>
                                    {f}
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
                              Scheduled Date (optional)
                            </Label>
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              data-ocid="yearly_plan.input"
                              style={{
                                background: "oklch(0.19 0.020 255)",
                                borderColor: "oklch(0.34 0.030 252)",
                              }}
                            />
                          </div>
                        </>
                      )}
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setEditCell(null)}
                          data-ocid="yearly_plan.cancel_button"
                          style={{
                            borderColor: "oklch(0.34 0.030 252)",
                            color: "oklch(0.68 0.010 260)",
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveCellEdit}
                          data-ocid="yearly_plan.save_button"
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
              </motion.div>
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
      <Dialog
        open={!!editMachineId}
        onOpenChange={(o) => {
          if (!o) {
            setEditMachineId(null);
            setEditMachineForm({});
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
          data-ocid="machines.dialog"
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Edit Machine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["name", "Machine Name"],
                  ["department", "Department"],
                  ["location", "Location"],
                  ["machineType", "Type"],
                ] as [keyof MachineExtended, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <Label
                    className="text-xs mb-1"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    {label}
                  </Label>
                  <Input
                    value={String(editMachineForm[key] ?? "")}
                    onChange={(e) =>
                      setEditMachineForm((f) => ({
                        ...f,
                        [key]: e.target.value,
                      }))
                    }
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
                  Section
                </Label>
                <Select
                  value={editMachineForm.section ?? ""}
                  onValueChange={(v) =>
                    setEditMachineForm((f) => ({
                      ...f,
                      section: v as MachineExtended["section"],
                    }))
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    style={{
                      background: "oklch(0.20 0.022 252)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent
                    style={{ background: "oklch(0.22 0.022 252)" }}
                  >
                    {SECTION_OPTIONS.map((s) => (
                      <SelectItem key={s || "none"} value={s}>
                        {s || "None"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs mb-1"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Available Hours/Year
                </Label>
                <Input
                  type="number"
                  value={editMachineForm.availableWorkingHours ?? ""}
                  onChange={(e) =>
                    setEditMachineForm((f) => ({
                      ...f,
                      availableWorkingHours:
                        Number(e.target.value) || undefined,
                    }))
                  }
                  className="h-8 text-sm"
                  style={{
                    background: "oklch(0.20 0.022 252)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditMachineId(null);
                  setEditMachineForm({});
                }}
                data-ocid="machines.cancel_button"
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editMachineId) {
                    updateMachine(editMachineId, editMachineForm);
                    toast.success("Machine updated");
                    setEditMachineId(null);
                    setEditMachineForm({});
                  }
                }}
                data-ocid="machines.save_button"
                style={{
                  background: "oklch(0.70 0.188 55)",
                  color: "oklch(0.10 0.010 55)",
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
