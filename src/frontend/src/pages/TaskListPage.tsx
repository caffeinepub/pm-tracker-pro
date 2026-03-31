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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ClipboardCheck,
  Download,
  Edit,
  LogOut,
  Plus,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import NotificationBell from "../components/NotificationBell";
import type { TaskRecord } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

function priorityColor(priority: string) {
  if (priority === "high")
    return {
      bg: "oklch(0.45 0.18 27 / 0.20)",
      color: "oklch(0.78 0.17 27)",
      border: "oklch(0.55 0.17 27 / 0.4)",
    };
  if (priority === "medium")
    return {
      bg: "oklch(0.50 0.16 55 / 0.20)",
      color: "oklch(0.82 0.14 55)",
      border: "oklch(0.55 0.14 55 / 0.4)",
    };
  return {
    bg: "oklch(0.45 0.12 145 / 0.20)",
    color: "oklch(0.75 0.13 145)",
    border: "oklch(0.52 0.12 145 / 0.4)",
  };
}

function statusColor(status: string) {
  if (status === "complete")
    return {
      bg: "oklch(0.45 0.12 145 / 0.20)",
      color: "oklch(0.75 0.13 145)",
      border: "oklch(0.52 0.12 145 / 0.4)",
    };
  if (status === "in-process")
    return {
      bg: "oklch(0.30 0.09 245 / 0.25)",
      color: "oklch(0.70 0.13 245)",
      border: "oklch(0.44 0.13 245 / 0.4)",
    };
  if (status === "hold")
    return {
      bg: "oklch(0.50 0.16 55 / 0.20)",
      color: "oklch(0.82 0.14 55)",
      border: "oklch(0.55 0.14 55 / 0.4)",
    };
  if (status === "canceled")
    return {
      bg: "oklch(0.45 0.18 27 / 0.20)",
      color: "oklch(0.78 0.17 27)",
      border: "oklch(0.55 0.17 27 / 0.4)",
    };
  // not-started
  return {
    bg: "oklch(0.30 0.015 260 / 0.25)",
    color: "oklch(0.68 0.010 260)",
    border: "oklch(0.40 0.015 260 / 0.4)",
  };
}

function statusLabel(status: string) {
  if (status === "not-started") return "Not Started";
  if (status === "in-process") return "In Process";
  if (status === "complete") return "Complete";
  if (status === "hold") return "Hold";
  if (status === "canceled") return "Canceled";
  return status;
}

const BLANK_TASK = {
  title: "",
  description: "",
  priority: "medium" as TaskRecord["priority"],
  assignedTo: "",
  dueDate: "",
  status: "not-started" as TaskRecord["status"],
};

export default function TaskListPage() {
  const {
    user,
    logout,
    navigate,
    taskRecords,
    addTask,
    updateTask,
    deleteTask,
    importTasks,
    getUsers,
  } = useApp();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [statusUpdateTask, setStatusUpdateTask] = useState<TaskRecord | null>(
    null,
  );
  const [assignDialog, setAssignDialog] = useState<TaskRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ ...BLANK_TASK });
  const [statusForm, setStatusForm] = useState({
    status: "not-started" as TaskRecord["status"],
    remark: "",
    photoDataUrl: "",
  });
  const [assignTarget, setAssignTarget] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const users = getUsers();
  const userList = Object.entries(users).map(([username, rec]) => ({
    username,
    name: rec.name,
    role: rec.role,
  }));

  const myTasks =
    user?.role === "admin"
      ? taskRecords
      : taskRecords.filter((t) => t.assignedTo === user?.username);

  const filteredTasks =
    filterStatus === "all"
      ? myTasks
      : myTasks.filter((t) => t.status === filterStatus);

  const handleAdd = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.assignedTo) {
      toast.error("Assign to a user");
      return;
    }
    const task: TaskRecord = {
      id: `task-${Date.now()}`,
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      assignedTo: form.assignedTo,
      assignedByUsername: user?.username ?? "admin",
      createdAt: Date.now(),
      dueDate: form.dueDate,
      statusHistory: [
        {
          status: form.status,
          changedBy: user?.username ?? "admin",
          timestamp: Date.now(),
        },
      ],
    };
    addTask(task);
    toast.success("Task added and assigned");
    setForm({ ...BLANK_TASK });
    setShowAddDialog(false);
  };

  const handleEdit = () => {
    if (!editingTask) return;
    updateTask(editingTask.id, {
      title: form.title,
      description: form.description,
      priority: form.priority,
      assignedTo: form.assignedTo,
      dueDate: form.dueDate,
      status: form.status,
    });
    toast.success("Task updated");
    setEditingTask(null);
  };

  const handleStatusUpdate = () => {
    if (!statusUpdateTask) return;
    updateTask(statusUpdateTask.id, {
      status: statusForm.status,
      lastUpdatedRemark: statusForm.remark,
      lastUpdatedPhoto: statusForm.photoDataUrl,
      statusHistory: [
        ...(statusUpdateTask.statusHistory ?? []),
        {
          status: statusForm.status,
          changedBy: user?.username ?? "",
          remark: statusForm.remark,
          timestamp: Date.now(),
        },
      ],
    });
    toast.success("Status updated");
    setStatusUpdateTask(null);
    setStatusForm({ status: "not-started", remark: "", photoDataUrl: "" });
  };

  const handleAssign = () => {
    if (!assignDialog || !assignTarget) return;
    updateTask(assignDialog.id, { assignedTo: assignTarget });
    toast.success(`Task assigned to ${assignTarget}`);
    setAssignDialog(null);
    setAssignTarget("");
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      [
        "ID",
        "Title",
        "Description",
        "Priority",
        "AssignedTo",
        "DueDate",
        "Status",
        "CreatedAt",
      ],
      ...taskRecords.map((t) => [
        t.id,
        t.title,
        t.description,
        t.priority,
        t.assignedTo,
        t.dueDate,
        t.status,
        new Date(t.createdAt).toLocaleDateString("en-IN"),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(
      wb,
      `Task_List_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Tasks exported");
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Title", "Description", "Priority", "AssignedTo", "DueDate", "Status"],
      [
        "Fix pump motor",
        "Check and replace bearings if needed",
        "high",
        "operator1",
        "2026-04-15",
        "not-started",
      ],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "Task_Template.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const records: TaskRecord[] = rows.map((row, idx) => ({
          id: `task-import-${Date.now()}-${idx}`,
          title: row.Title ?? "",
          description: row.Description ?? "",
          priority: (row.Priority as TaskRecord["priority"]) ?? "medium",
          status: (row.Status as TaskRecord["status"]) ?? "not-started",
          assignedTo: row.AssignedTo ?? "",
          assignedByUsername: user?.username ?? "admin",
          createdAt: Date.now(),
          dueDate: row.DueDate ?? "",
          statusHistory: [
            {
              status: row.Status ?? "not-started",
              changedBy: "import",
              timestamp: Date.now(),
            },
          ],
        }));
        importTasks(records);
        toast.success(`Imported ${records.length} tasks`);
      } catch {
        toast.error("Failed to import Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.165 0.022 252)" }}
    >
      {/* Header */}
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
              data-ocid="tasklist.back.button"
              onClick={() => navigate("dashboard")}
              className="p-2 rounded-lg hover:bg-white/5"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: "oklch(0.70 0.188 55 / 0.15)",
                border: "1px solid oklch(0.70 0.188 55 / 0.4)",
              }}
            >
              <ClipboardCheck
                className="w-4 h-4"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
            </div>
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Task <span style={{ color: "oklch(0.80 0.180 55)" }}>List</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user?.role === "admin" && (
              <>
                <Button
                  data-ocid="tasklist.import.button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "oklch(0.30 0.09 245 / 0.25)",
                    border: "1px solid oklch(0.44 0.13 245 / 0.4)",
                    color: "oklch(0.70 0.13 245)",
                  }}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Import
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button
                  data-ocid="tasklist.export.button"
                  size="sm"
                  onClick={handleExport}
                  style={{
                    background: "oklch(0.45 0.12 145 / 0.20)",
                    border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                    color: "oklch(0.75 0.13 145)",
                  }}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
                <Button
                  data-ocid="tasklist.secondary_button"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.20)",
                    border: "1px solid oklch(0.44 0.13 245 / 0.4)",
                    color: "oklch(0.70 0.13 245)",
                  }}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Template
                </Button>
                <Button
                  data-ocid="tasklist.add.button"
                  size="sm"
                  onClick={() => {
                    setForm({ ...BLANK_TASK });
                    setShowAddDialog(true);
                  }}
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.18)",
                    border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                    color: "oklch(0.80 0.180 55)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                </Button>
              </>
            )}
            <button
              type="button"
              data-ocid="tasklist.logout.button"
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-white/5"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24">
        {/* Filter */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span
            className="text-sm font-medium"
            style={{ color: "oklch(0.68 0.010 260)" }}
          >
            Filter:
          </span>
          {[
            "all",
            "not-started",
            "in-process",
            "complete",
            "hold",
            "canceled",
          ].map((s) => (
            <button
              key={s}
              type="button"
              data-ocid={"tasklist.filter.tab"}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={
                filterStatus === s
                  ? {
                      background: "oklch(0.70 0.188 55 / 0.18)",
                      color: "oklch(0.80 0.180 55)",
                      border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                    }
                  : {
                      background: "oklch(0.22 0.022 252)",
                      color: "oklch(0.55 0.010 260)",
                      border: "1px solid oklch(0.34 0.030 252)",
                    }
              }
            >
              {s === "all" ? "All" : statusLabel(s)}
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div
            data-ocid="tasklist.empty_state"
            className="industrial-card p-12 text-center"
          >
            <ClipboardCheck
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "oklch(0.55 0.010 260)" }}
            />
            <p
              className="font-medium"
              style={{ color: "oklch(0.75 0.008 260)" }}
            >
              No tasks found
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.010 260)" }}
            >
              {user?.role === "admin"
                ? "Create a task using the Add Task button above."
                : "No tasks assigned to you yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, idx) => {
              const pColor = priorityColor(task.priority);
              const sColor = statusColor(task.status);
              return (
                <motion.div
                  key={task.id}
                  data-ocid={`tasklist.item.${idx + 1}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="industrial-card p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">
                          {task.title}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: pColor.bg,
                            color: pColor.color,
                            border: `1px solid ${pColor.border}`,
                          }}
                        >
                          {task.priority.toUpperCase()}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: sColor.bg,
                            color: sColor.color,
                            border: `1px solid ${sColor.border}`,
                          }}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </div>
                      {task.description && (
                        <p
                          className="text-xs mb-2"
                          style={{ color: "oklch(0.65 0.010 260)" }}
                        >
                          {task.description}
                        </p>
                      )}
                      <div
                        className="flex items-center gap-4 text-xs"
                        style={{ color: "oklch(0.55 0.010 260)" }}
                      >
                        <span>
                          Assigned to:{" "}
                          <strong style={{ color: "oklch(0.75 0.010 260)" }}>
                            {task.assignedTo}
                          </strong>
                        </span>
                        {task.dueDate && (
                          <span>
                            Due:{" "}
                            <strong style={{ color: "oklch(0.80 0.14 55)" }}>
                              {task.dueDate}
                            </strong>
                          </span>
                        )}
                      </div>
                      {task.lastUpdatedRemark && (
                        <p
                          className="text-xs mt-1 italic"
                          style={{ color: "oklch(0.60 0.010 260)" }}
                        >
                          Remark: {task.lastUpdatedRemark}
                        </p>
                      )}
                      {(task as any).lastUpdatedPhoto && (
                        <img
                          src={(task as any).lastUpdatedPhoto}
                          alt="Status update"
                          style={{
                            maxHeight: "60px",
                            marginTop: "4px",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(user?.role !== "admin" ||
                        task.assignedTo === user?.username) && (
                        <Button
                          data-ocid={`tasklist.edit_button.${idx + 1}`}
                          size="sm"
                          onClick={() => {
                            setStatusUpdateTask(task);
                            setStatusForm({
                              status: task.status,
                              remark: "",
                              photoDataUrl: "",
                            });
                          }}
                          style={{
                            background: "oklch(0.30 0.09 245 / 0.25)",
                            border: "1px solid oklch(0.44 0.13 245 / 0.4)",
                            color: "oklch(0.70 0.13 245)",
                            fontSize: "11px",
                            height: "28px",
                            padding: "0 8px",
                          }}
                        >
                          Update Status
                        </Button>
                      )}
                      {user?.role === "admin" && (
                        <>
                          <button
                            type="button"
                            data-ocid={`tasklist.edit_button.${idx + 1}`}
                            onClick={() => {
                              setEditingTask(task);
                              setForm({
                                title: task.title,
                                description: task.description,
                                priority: task.priority,
                                assignedTo: task.assignedTo,
                                dueDate: task.dueDate,
                                status: task.status,
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            data-ocid={`tasklist.secondary_button.${idx + 1}`}
                            onClick={() => {
                              setAssignDialog(task);
                              setAssignTarget(task.assignedTo);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10"
                            style={{ color: "oklch(0.70 0.13 245)" }}
                            title="Reassign"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            data-ocid={`tasklist.delete_button.${idx + 1}`}
                            onClick={() => {
                              deleteTask(task.id);
                              toast.success("Task deleted");
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10"
                            style={{ color: "oklch(0.63 0.22 27)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Task Dialog */}
      <Dialog
        open={showAddDialog || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingTask(null);
          }
        }}
      >
        <DialogContent
          className="max-w-lg"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.34 0.030 252)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              {editingTask ? "Edit Task" : "Add New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className="text-xs font-semibold mb-1 block"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Title *
              </Label>
              <Input
                data-ocid="tasklist.input"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Task title"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  borderColor: "oklch(0.34 0.030 252)",
                }}
              />
            </div>
            <div>
              <Label
                className="text-xs font-semibold mb-1 block"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Description
              </Label>
              <Textarea
                data-ocid="tasklist.textarea"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Task description"
                rows={2}
                style={{
                  background: "oklch(0.19 0.020 255)",
                  borderColor: "oklch(0.34 0.030 252)",
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Priority
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      priority: v as TaskRecord["priority"],
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="tasklist.select"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Status
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as TaskRecord["status"],
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="tasklist.select"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-process">In Process</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Assign To *
                </Label>
                <Select
                  value={form.assignedTo || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      assignedTo: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="tasklist.select"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select User --</SelectItem>
                    {userList
                      .filter((u) => u.username)
                      .map((u) => (
                        <SelectItem key={u.username} value={u.username}>
                          {u.name} ({u.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Due Date
                </Label>
                <Input
                  data-ocid="tasklist.input"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                data-ocid="tasklist.cancel_button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingTask(null);
                }}
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                Cancel
              </Button>
              <Button
                data-ocid="tasklist.submit_button"
                onClick={editingTask ? handleEdit : handleAdd}
                style={{
                  background: "oklch(0.70 0.188 55 / 0.18)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                {editingTask ? "Save Changes" : "Add Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog (operator) */}
      <Dialog
        open={!!statusUpdateTask}
        onOpenChange={(open) => {
          if (!open) setStatusUpdateTask(null);
        }}
      >
        <DialogContent
          className="max-w-md"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.34 0.030 252)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Update Task Status
            </DialogTitle>
          </DialogHeader>
          {statusUpdateTask && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{statusUpdateTask.title}</p>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  New Status
                </Label>
                <Select
                  value={statusForm.status}
                  onValueChange={(v) =>
                    setStatusForm((f) => ({
                      ...f,
                      status: v as TaskRecord["status"],
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="tasklist.select"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-process">In Process</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Remark
                </Label>
                <Textarea
                  data-ocid="tasklist.textarea"
                  value={statusForm.remark}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, remark: e.target.value }))
                  }
                  placeholder="Optional remark..."
                  rows={2}
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
              </div>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Photo (optional)
                </Label>
                <input
                  data-ocid="tasklist.upload_button"
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setStatusForm((f) => ({
                        ...f,
                        photoDataUrl: (ev.target?.result as string) ?? "",
                      }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {statusForm.photoDataUrl && (
                  <img
                    src={statusForm.photoDataUrl}
                    alt="preview"
                    style={{
                      maxHeight: "80px",
                      marginTop: "6px",
                      borderRadius: "6px",
                    }}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  data-ocid="tasklist.cancel_button"
                  variant="outline"
                  onClick={() => setStatusUpdateTask(null)}
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  data-ocid="tasklist.confirm_button"
                  onClick={handleStatusUpdate}
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.18)",
                    border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                    color: "oklch(0.80 0.180 55)",
                  }}
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog
        open={!!assignDialog}
        onOpenChange={(open) => {
          if (!open) setAssignDialog(null);
        }}
      >
        <DialogContent
          className="max-w-sm"
          style={{
            background: "oklch(0.22 0.022 252)",
            border: "1px solid oklch(0.34 0.030 252)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Reassign Task
            </DialogTitle>
          </DialogHeader>
          {assignDialog && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{assignDialog.title}</p>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Assign To
                </Label>
                <Select
                  value={assignTarget || "none"}
                  onValueChange={(v) => setAssignTarget(v === "none" ? "" : v)}
                >
                  <SelectTrigger
                    data-ocid="tasklist.select"
                    style={{
                      background: "oklch(0.19 0.020 255)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select User --</SelectItem>
                    {userList
                      .filter((u) => u.username)
                      .map((u) => (
                        <SelectItem key={u.username} value={u.username}>
                          {u.name} ({u.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  data-ocid="tasklist.cancel_button"
                  variant="outline"
                  onClick={() => setAssignDialog(null)}
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  data-ocid="tasklist.confirm_button"
                  onClick={handleAssign}
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.18)",
                    border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                    color: "oklch(0.80 0.180 55)",
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer
        className="py-4 text-center text-xs"
        style={{
          color: "oklch(0.45 0.010 260)",
          borderTop: "1px solid oklch(0.28 0.020 252)",
        }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "oklch(0.70 0.188 55)" }}
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
