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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Gauge,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { PredictivePlan, PredictiveRecord } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

const EMPTY_PLAN = {
  machineId: "",
  scheduledDate: new Date().toISOString().split("T")[0],
  frequency: "Monthly" as PredictivePlan["frequency"],
  parameters: "",
  notes: "",
};

export default function PredictivePage() {
  const {
    user,
    logout,
    navigate,
    machines,
    predictivePlans,
    predictiveRecords,
    addPredictivePlan,
    updatePredictivePlan,
    deletePredictivePlan,
    submitPredictiveRecord,
    approvePredictiveRecord,
    spareItems,
    addPMSpareUsage,
  } = useApp();

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");
  const [planForm, setPlanForm] = useState({ ...EMPTY_PLAN });
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [pdmSpareRows, setPdmSpareRows] = useState<
    Array<{
      spareName: string;
      partSpec: string;
      qty: number;
      unit: string;
      cost: number;
    }>
  >([]);
  const [readingForm, setReadingForm] = useState<{
    date: string;
    readings: Record<string, string>;
    remarks: string;
  }>({
    date: new Date().toISOString().split("T")[0],
    readings: {},
    remarks: "",
  });

  const selectedPlan = useMemo(
    () => predictivePlans.find((p) => p.id === selectedPlanId),
    [predictivePlans, selectedPlanId],
  );

  // Check if already submitted in current period (same month+year)
  const isAlreadySubmittedForPeriod = useMemo(() => {
    if (!selectedPlan) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return predictiveRecords.some((r) => {
      if (r.planId !== selectedPlan.id) return false;
      const sub = new Date(r.submittedAt);
      return (
        sub.getMonth() === currentMonth && sub.getFullYear() === currentYear
      );
    });
  }, [selectedPlan, predictiveRecords]);

  function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planForm.machineId) {
      toast.error("Select a machine");
      return;
    }
    const machine = machines.find((m) => m.id === planForm.machineId);
    const params = planForm.parameters
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (params.length === 0) {
      toast.error("Enter at least one parameter");
      return;
    }
    if (editPlanId) {
      updatePredictivePlan(editPlanId, {
        machineId: planForm.machineId,
        machineName: machine?.name ?? planForm.machineId,
        scheduledDate: planForm.scheduledDate,
        frequency: planForm.frequency,
        parameters: params,
        notes: planForm.notes,
      });
      toast.success("Plan updated");
    } else {
      const plan: PredictivePlan = {
        id: `pdm-plan-${Date.now()}`,
        machineId: planForm.machineId,
        machineName: machine?.name ?? planForm.machineId,
        scheduledDate: planForm.scheduledDate,
        frequency: planForm.frequency,
        parameters: params,
        notes: planForm.notes,
        createdAt: Date.now(),
      };
      addPredictivePlan(plan);
      toast.success("Plan added");
    }
    setShowPlanForm(false);
    setPlanForm({ ...EMPTY_PLAN });
    setEditPlanId(null);
  }

  function handleSubmitReading(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) {
      toast.error("Select a plan");
      return;
    }
    const record: PredictiveRecord = {
      id: `pdm-rec-${Date.now()}`,
      planId: selectedPlan.id,
      machineId: selectedPlan.machineId,
      machineName: selectedPlan.machineName,
      date: readingForm.date,
      readings: readingForm.readings,
      remarks: readingForm.remarks,
      operatorName: user?.name ?? "",
      operatorUsername: user?.username ?? "",
      status: "pending-approval",
      submittedAt: Date.now(),
    };
    submitPredictiveRecord(record);
    if (pdmSpareRows.length > 0 && selectedPlan) {
      addPMSpareUsage({
        id: `pdm-spare-${Date.now()}`,
        machineId: selectedPlan.machineId,
        machineName: selectedPlan.machineName,
        date: readingForm.date,
        spareUsed: pdmSpareRows,
        submittedBy: user?.name ?? "",
        submittedByUsername: user?.username ?? "",
        workType: "Predictive",
      });
    }
    setPdmSpareRows([]);
    toast.success("Reading submitted");
    setReadingForm({
      date: new Date().toISOString().split("T")[0],
      readings: {},
      remarks: "",
    });
  }

  function handleExport() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const data = predictiveRecords.map((r) => ({
      Date: r.date,
      Machine: r.machineName,
      Readings: JSON.stringify(r.readings),
      Remarks: r.remarks,
      "Submitted By": r.operatorName,
      Status: r.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data),
      "PDM Records",
    );
    XLSX.writeFile(
      wb,
      `PDM_Records_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  function handleDownloadPDMTemplate() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const wb = XLSX.utils.book_new();

    // Plans sheet
    const plansData = [
      {
        MachineID: machines[0]?.id ?? "MACHINE-001",
        MachineName: machines[0]?.name ?? "Compressor A",
        ScheduledDate: new Date().toISOString().split("T")[0],
        Frequency: "Monthly",
        Parameters:
          "Vibration (mm/s), Temperature (°C), Oil Level, Pressure (bar)",
        Notes: "Monthly predictive maintenance check",
      },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(plansData),
      "Plans",
    );

    // Records sheet
    const recordsData = [
      {
        Date: new Date().toISOString().split("T")[0],
        MachineName: machines[0]?.name ?? "Compressor A",
        PlanID: "",
        "Vibration (mm/s)": 2.5,
        "Temperature (°C)": 45,
        "Oil Level": "Normal",
        "Pressure (bar)": 6.2,
        Remarks: "All parameters within normal range",
      },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(recordsData),
      "Records",
    );

    XLSX.writeFile(wb, "PDM_Import_Template.xlsx");
  }

  function handleImportPlans(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !XLSX) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        let planCount = 0;
        let recCount = 0;

        // Import Plans sheet
        const plansSheet = wb.Sheets.Plans;
        if (plansSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(plansSheet);
          for (const row of rows) {
            const machineName = String(row.MachineName ?? "").trim();
            const machineId =
              String(row.MachineID ?? "").trim() ||
              machines.find(
                (m) => m.name.toLowerCase() === machineName.toLowerCase(),
              )?.id ||
              `machine-${machineName}`;
            const params = String(row.Parameters ?? "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            if (!machineName || params.length === 0) continue;
            const plan: PredictivePlan = {
              id: `pdm-plan-import-${Date.now()}-${planCount}`,
              machineId,
              machineName,
              scheduledDate:
                String(row.ScheduledDate ?? "").trim() ||
                new Date().toISOString().split("T")[0],
              frequency:
                (row.Frequency as PredictivePlan["frequency"]) || "Monthly",
              parameters: params,
              notes: String(row.Notes ?? "").trim(),
              createdAt: Date.now(),
            };
            addPredictivePlan(plan);
            planCount++;
          }
        }

        // Import Records sheet
        const recsSheet = wb.Sheets.Records;
        if (recsSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(recsSheet);
          for (const row of rows) {
            const machineName = String(row.MachineName ?? "").trim();
            const date = String(row.Date ?? "").trim();
            if (!machineName || !date) continue;
            // Build readings from extra columns
            const skipCols = new Set(["Date", "MachineName", "PlanID"]);
            const readings: Record<string, string> = {};
            for (const key of Object.keys(row)) {
              if (!skipCols.has(key)) {
                readings[key] = String(row[key]);
              }
            }
            const planId = String(row.PlanID ?? "").trim();
            const matchPlan = predictivePlans.find(
              (p) =>
                p.machineName.toLowerCase() === machineName.toLowerCase() ||
                (planId && p.id === planId),
            );
            const record: PredictiveRecord = {
              id: `pdm-rec-import-${Date.now()}-${recCount}`,
              planId: matchPlan?.id ?? planId ?? "",
              machineId: matchPlan?.machineId ?? machineName,
              machineName,
              date,
              readings,
              remarks: String(row.Remarks ?? "").trim(),
              operatorName: user?.name ?? "",
              operatorUsername: user?.username ?? "",
              status: "completed",
              submittedAt: Date.now(),
            };
            submitPredictiveRecord(record);
            recCount++;
          }
        }

        toast.success(`Imported: ${planCount} plans, ${recCount} records`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
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
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportPlans}
      />
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
                  background: "oklch(0.50 0.065 232 / 0.15)",
                  border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                }}
              >
                <Gauge
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.150 232)" }}
                />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Predictive{" "}
                <span style={{ color: "oklch(0.65 0.150 232)" }}>
                  Maintenance
                </span>
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
                data-ocid="predictive.export.button"
                style={{
                  background: "oklch(0.30 0.060 145 / 0.25)",
                  color: "oklch(0.75 0.13 145)",
                  border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export
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
                data-ocid="predictive.logout.button"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-24 md:pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              style={{
                background: "oklch(0.22 0.022 252)",
                border: "1px solid oklch(0.34 0.030 252)",
              }}
            >
              <TabsTrigger
                value="plans"
                data-ocid="predictive.tab"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Predictive Plans
              </TabsTrigger>
              <TabsTrigger
                value="readings"
                data-ocid="predictive.tab"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Submit Readings
              </TabsTrigger>
              <TabsTrigger
                value="records"
                data-ocid="predictive.tab"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Records
              </TabsTrigger>
            </TabsList>

            {/* Plans Tab */}
            <TabsContent value="plans" className="mt-4">
              {user?.role === "admin" && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Button
                    onClick={() => {
                      setPlanForm({ ...EMPTY_PLAN });
                      setEditPlanId(null);
                      setShowPlanForm(true);
                    }}
                    data-ocid="predictive.open_modal_button"
                    style={{
                      background: "oklch(0.50 0.065 232 / 0.20)",
                      color: "oklch(0.65 0.150 232)",
                      border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add New Plan
                  </Button>
                  <Button
                    onClick={handleDownloadPDMTemplate}
                    data-ocid="predictive.secondary_button"
                    style={{
                      background: "oklch(0.30 0.050 252 / 0.25)",
                      color: "oklch(0.68 0.010 260)",
                      border: "1px solid oklch(0.40 0.030 252 / 0.5)",
                      fontSize: "13px",
                    }}
                  >
                    <FileDown className="w-4 h-4 mr-2" /> Download Template
                  </Button>
                  <Button
                    onClick={() => importRef.current?.click()}
                    data-ocid="predictive.upload_button"
                    style={{
                      background: "oklch(0.30 0.065 232 / 0.20)",
                      color: "oklch(0.65 0.150 232)",
                      border: "1px solid oklch(0.50 0.065 232 / 0.35)",
                      fontSize: "13px",
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Import Excel
                  </Button>
                </div>
              )}
              {predictivePlans.length === 0 ? (
                <div
                  data-ocid="predictive.empty_state"
                  className="industrial-card p-12 text-center"
                >
                  <Gauge
                    className="w-10 h-10 mx-auto mb-3"
                    style={{ color: "oklch(0.45 0.010 260)" }}
                  />
                  <p style={{ color: "oklch(0.68 0.010 260)" }}>
                    No predictive plans yet. Admin can add plans.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="industrial-card overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow
                          style={{ borderColor: "oklch(0.34 0.030 252)" }}
                        >
                          {[
                            "Machine",
                            "Scheduled Date",
                            "Frequency",
                            "Parameters",
                            "Notes",
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
                        {predictivePlans.map((p, idx) => (
                          <TableRow
                            key={p.id}
                            data-ocid={`predictive.row.${idx + 1}`}
                            style={{ borderColor: "oklch(0.28 0.025 252)" }}
                          >
                            <TableCell
                              className="font-semibold text-sm"
                              style={{ color: "oklch(0.80 0.180 55)" }}
                            >
                              {p.machineName}
                            </TableCell>
                            <TableCell
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {p.scheduledDate}
                            </TableCell>
                            <TableCell>
                              <Badge
                                style={{
                                  background: "oklch(0.50 0.065 232 / 0.15)",
                                  color: "oklch(0.65 0.150 232)",
                                  fontSize: "11px",
                                }}
                              >
                                {p.frequency}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-xs max-w-[200px]"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {p.parameters.join(", ")}
                            </TableCell>
                            <TableCell
                              className="text-xs"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              {p.notes}
                            </TableCell>
                            <TableCell>
                              {user?.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPlanId(p.id);
                                    setActiveTab("readings");
                                  }}
                                  data-ocid={`predictive.submit_button.${idx + 1}`}
                                  style={{
                                    fontSize: "11px",
                                    borderColor: "oklch(0.34 0.030 252)",
                                    color: "oklch(0.68 0.010 260)",
                                    height: "26px",
                                    padding: "0 8px",
                                  }}
                                >
                                  Submit Reading
                                </Button>
                              )}
                              {user?.role === "admin" && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setPlanForm({
                                        machineId: p.machineId,
                                        scheduledDate: p.scheduledDate,
                                        frequency: p.frequency,
                                        parameters: p.parameters.join(", "),
                                        notes: p.notes,
                                      });
                                      setEditPlanId(p.id);
                                      setShowPlanForm(true);
                                    }}
                                    data-ocid={`predictive.edit_button.${idx + 1}`}
                                    style={{
                                      fontSize: "11px",
                                      borderColor: "oklch(0.34 0.030 252)",
                                      color: "oklch(0.68 0.010 260)",
                                      height: "26px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => deletePredictivePlan(p.id)}
                                    data-ocid={`predictive.delete_button.${idx + 1}`}
                                    style={{
                                      fontSize: "11px",
                                      background: "oklch(0.40 0.150 25 / 0.15)",
                                      color: "oklch(0.72 0.170 25)",
                                      border:
                                        "1px solid oklch(0.55 0.15 25 / 0.3)",
                                      height: "26px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            {/* Submit Readings Tab */}
            <TabsContent value="readings" className="mt-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="industrial-card p-5 max-w-2xl"
              >
                <h3
                  className="text-base font-bold mb-4"
                  style={{
                    fontFamily: "BricolageGrotesque, sans-serif",
                    color: "oklch(0.88 0.010 260)",
                  }}
                >
                  Submit Predictive Reading
                </h3>
                <form onSubmit={handleSubmitReading} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Select Plan *
                    </Label>
                    <Select
                      value={selectedPlanId || "none"}
                      onValueChange={(v) => {
                        setSelectedPlanId(v === "none" ? "" : v);
                        setReadingForm({
                          date: new Date().toISOString().split("T")[0],
                          readings: {},
                          remarks: "",
                        });
                      }}
                    >
                      <SelectTrigger
                        data-ocid="predictive.select"
                        style={{ ...inputStyle }}
                      >
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          background: "oklch(0.22 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
                      >
                        <SelectItem
                          value="none"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          -- Select Plan --
                        </SelectItem>
                        {predictivePlans.map((p) => {
                          const nowInner = new Date();
                          const alreadyDone = predictiveRecords.some((r) => {
                            if (r.planId !== p.id) return false;
                            const sub = new Date(r.submittedAt);
                            return (
                              sub.getMonth() === nowInner.getMonth() &&
                              sub.getFullYear() === nowInner.getFullYear()
                            );
                          });
                          return (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              style={{ color: "oklch(0.88 0.010 260)" }}
                            >
                              {p.machineName} — {p.scheduledDate}
                              {alreadyDone ? " ✓ Submitted" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={readingForm.date}
                      onChange={(e) =>
                        setReadingForm((f) => ({ ...f, date: e.target.value }))
                      }
                      data-ocid="predictive.input"
                      style={{ ...inputStyle }}
                    />
                  </div>
                  {selectedPlan && (
                    <div className="space-y-3">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        Enter Readings for each parameter:
                      </p>
                      {selectedPlan.parameters.map((param) => (
                        <div key={param} className="space-y-1.5">
                          <Label
                            className="text-xs"
                            style={{ color: "oklch(0.65 0.010 260)" }}
                          >
                            {param}
                          </Label>
                          <Input
                            value={readingForm.readings[param] ?? ""}
                            onChange={(e) =>
                              setReadingForm((f) => ({
                                ...f,
                                readings: {
                                  ...f.readings,
                                  [param]: e.target.value,
                                },
                              }))
                            }
                            placeholder={`Value for ${param}`}
                            data-ocid="predictive.input"
                            style={{ ...inputStyle }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.010 260)" }}
                    >
                      Remarks
                    </Label>
                    <Textarea
                      value={readingForm.remarks}
                      onChange={(e) =>
                        setReadingForm((f) => ({
                          ...f,
                          remarks: e.target.value,
                        }))
                      }
                      rows={2}
                      data-ocid="predictive.textarea"
                      style={{ ...inputStyle }}
                    />
                  </div>
                  {/* Spares Used */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        className="text-xs"
                        style={{ color: "oklch(0.65 0.010 260)" }}
                      >
                        Spares Used (Optional)
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setPdmSpareRows((prev) => [
                            ...prev,
                            {
                              spareName: "",
                              partSpec: "",
                              qty: 1,
                              unit: "Nos",
                              cost: 0,
                            },
                          ])
                        }
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: "oklch(0.48 0.13 200 / 0.15)",
                          color: "oklch(0.70 0.14 200)",
                          border: "1px solid oklch(0.48 0.13 200 / 0.35)",
                        }}
                      >
                        + Add Spare
                      </button>
                    </div>
                    {pdmSpareRows.map((row, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: user-added spare row
                        key={i}
                        className="grid grid-cols-12 gap-1 items-center"
                      >
                        <div className="col-span-4">
                          <input
                            list={`pdm-spare-names-${i}`}
                            value={row.spareName}
                            onChange={(e) => {
                              const val = e.target.value;
                              const found = spareItems.find(
                                (s) => s.partName === val,
                              );
                              setPdmSpareRows((prev) =>
                                prev.map((r, j) =>
                                  j === i
                                    ? {
                                        ...r,
                                        spareName: val,
                                        partSpec: found?.partSpec ?? r.partSpec,
                                        unit: found?.unit ?? r.unit,
                                        cost: found
                                          ? found.costPerUnit * r.qty
                                          : r.cost,
                                      }
                                    : r,
                                ),
                              );
                            }}
                            placeholder="Part name"
                            className="w-full px-2 py-1 text-xs rounded border"
                            style={{ ...inputStyle }}
                          />
                          <datalist id={`pdm-spare-names-${i}`}>
                            {spareItems.map((s) => (
                              <option key={s.id} value={s.partName} />
                            ))}
                          </datalist>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min={0}
                            value={row.qty}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              const found = spareItems.find(
                                (s) => s.partName === row.spareName,
                              );
                              setPdmSpareRows((prev) =>
                                prev.map((r, j) =>
                                  j === i
                                    ? {
                                        ...r,
                                        qty,
                                        cost: found
                                          ? found.costPerUnit * qty
                                          : r.cost,
                                      }
                                    : r,
                                ),
                              );
                            }}
                            placeholder="Qty"
                            className="w-full px-2 py-1 text-xs rounded border"
                            style={{ ...inputStyle }}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            value={row.unit}
                            onChange={(e) =>
                              setPdmSpareRows((prev) =>
                                prev.map((r, j) =>
                                  j === i ? { ...r, unit: e.target.value } : r,
                                ),
                              )
                            }
                            placeholder="Unit"
                            className="w-full px-2 py-1 text-xs rounded border"
                            style={{ ...inputStyle }}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            value={row.cost}
                            onChange={(e) =>
                              setPdmSpareRows((prev) =>
                                prev.map((r, j) =>
                                  j === i
                                    ? { ...r, cost: Number(e.target.value) }
                                    : r,
                                ),
                              )
                            }
                            placeholder="Cost ₹"
                            className="w-full px-2 py-1 text-xs rounded border"
                            style={{ ...inputStyle }}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setPdmSpareRows((prev) =>
                                prev.filter((_, j) => j !== i),
                              )
                            }
                            style={{ color: "oklch(0.78 0.17 27)" }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isAlreadySubmittedForPeriod && user?.role !== "admin" && (
                    <div
                      className="flex items-center gap-2 p-3 rounded"
                      style={{
                        background: "oklch(0.30 0.090 145 / 0.15)",
                        border: "1px solid oklch(0.52 0.12 145 / 0.3)",
                        color: "oklch(0.75 0.130 145)",
                        fontSize: "13px",
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        This schedule has already been submitted. Please wait
                        for the next schedule or admin rescheduling.
                      </span>
                    </div>
                  )}
                  <Button
                    type="submit"
                    data-ocid="predictive.submit_button"
                    disabled={
                      isAlreadySubmittedForPeriod && user?.role !== "admin"
                    }
                    style={{
                      background:
                        isAlreadySubmittedForPeriod && user?.role !== "admin"
                          ? "oklch(0.30 0.010 260 / 0.20)"
                          : "oklch(0.50 0.065 232 / 0.20)",
                      color:
                        isAlreadySubmittedForPeriod && user?.role !== "admin"
                          ? "oklch(0.45 0.010 260)"
                          : "oklch(0.65 0.150 232)",
                      border:
                        isAlreadySubmittedForPeriod && user?.role !== "admin"
                          ? "1px solid oklch(0.35 0.010 260 / 0.3)"
                          : "1px solid oklch(0.50 0.065 232 / 0.4)",
                      cursor:
                        isAlreadySubmittedForPeriod && user?.role !== "admin"
                          ? "not-allowed"
                          : undefined,
                    }}
                  >
                    Submit Reading
                  </Button>
                </form>
              </motion.div>
            </TabsContent>

            {/* Records Tab */}
            <TabsContent value="records" className="mt-4">
              {predictiveRecords.length === 0 ? (
                <div
                  data-ocid="predictive.empty_state"
                  className="industrial-card p-12 text-center"
                >
                  <p style={{ color: "oklch(0.68 0.010 260)" }}>
                    No readings submitted yet.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="industrial-card overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow
                          style={{ borderColor: "oklch(0.34 0.030 252)" }}
                        >
                          {[
                            "Date",
                            "Machine",
                            "Readings",
                            "Remarks",
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
                        {[...predictiveRecords]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((r, idx) => (
                            <TableRow
                              key={r.id}
                              data-ocid={`predictive.row.${idx + 1}`}
                              style={{ borderColor: "oklch(0.28 0.025 252)" }}
                            >
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {r.date}
                              </TableCell>
                              <TableCell
                                className="font-semibold text-sm"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {r.machineName}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {Object.entries(r.readings)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" | ")}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.55 0.010 260)" }}
                              >
                                {r.remarks}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {r.operatorName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  style={{
                                    background:
                                      r.status === "completed"
                                        ? "oklch(0.30 0.090 145 / 0.25)"
                                        : r.status === "rejected"
                                          ? "oklch(0.35 0.120 27 / 0.25)"
                                          : "oklch(0.35 0.090 55 / 0.25)",
                                    color:
                                      r.status === "completed"
                                        ? "oklch(0.75 0.130 145)"
                                        : r.status === "rejected"
                                          ? "oklch(0.78 0.17 27)"
                                          : "oklch(0.80 0.180 55)",
                                    fontWeight: "bold",
                                    fontSize: "11px",
                                  }}
                                >
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user?.role === "admin" && (
                                  <div className="flex gap-1 flex-wrap">
                                    {r.status === "pending-approval" && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          approvePredictiveRecord(r.id)
                                        }
                                        data-ocid={`predictive.confirm_button.${idx + 1}`}
                                        style={{
                                          fontSize: "11px",
                                          background:
                                            "oklch(0.30 0.090 145 / 0.2)",
                                          color: "oklch(0.75 0.130 145)",
                                          border:
                                            "1px solid oklch(0.52 0.12 145 / 0.4)",
                                          height: "26px",
                                          padding: "0 8px",
                                        }}
                                      >
                                        <CheckCircle2 className="w-3 h-3 mr-1" />{" "}
                                        Approve
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPlanId(r.planId);
                                        setReadingForm({
                                          date: r.date,
                                          readings: { ...r.readings },
                                          remarks: r.remarks,
                                        });
                                      }}
                                      data-ocid={`predictive.edit_button.${idx + 1}`}
                                      style={{
                                        fontSize: "11px",
                                        background:
                                          "oklch(0.35 0.090 55 / 0.15)",
                                        color: "oklch(0.80 0.180 55)",
                                        border:
                                          "1px solid oklch(0.55 0.12 55 / 0.3)",
                                        height: "26px",
                                        padding: "0 8px",
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Add/Edit Plan Dialog */}
        <Dialog open={showPlanForm} onOpenChange={setShowPlanForm}>
          <DialogContent
            className="max-w-lg max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="predictive.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  color: "oklch(0.88 0.010 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {editPlanId ? "Edit" : "Add"} Predictive Plan
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSavePlan} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Machine *
                </Label>
                <Select
                  value={planForm.machineId || "none"}
                  onValueChange={(v) =>
                    setPlanForm((f) => ({
                      ...f,
                      machineId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="predictive.select"
                    style={{ ...inputStyle }}
                  >
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.22 0.022 252)",
                      borderColor: "oklch(0.34 0.030 252)",
                    }}
                  >
                    <SelectItem
                      value="none"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      -- Select Machine --
                    </SelectItem>
                    {machines
                      .filter((m) => m.id)
                      .map((m) => (
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Scheduled Date
                  </Label>
                  <Input
                    type="date"
                    value={planForm.scheduledDate}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        scheduledDate: e.target.value,
                      }))
                    }
                    data-ocid="predictive.input"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Frequency
                  </Label>
                  <Select
                    value={planForm.frequency}
                    onValueChange={(v) =>
                      setPlanForm((f) => ({
                        ...f,
                        frequency: v as PredictivePlan["frequency"],
                      }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="predictive.select"
                      style={{ ...inputStyle }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "oklch(0.22 0.022 252)",
                        borderColor: "oklch(0.34 0.030 252)",
                      }}
                    >
                      {["Monthly", "Quarterly", "Half-Yearly", "Yearly"].map(
                        (f) => (
                          <SelectItem
                            key={f}
                            value={f}
                            style={{ color: "oklch(0.88 0.010 260)" }}
                          >
                            {f}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Reading Parameters (comma-separated)
                </Label>
                <Textarea
                  value={planForm.parameters}
                  onChange={(e) =>
                    setPlanForm((f) => ({ ...f, parameters: e.target.value }))
                  }
                  placeholder="Vibration (mm/s), Temperature (\u00b0C), Oil Level, Pressure (bar)"
                  rows={2}
                  data-ocid="predictive.textarea"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Notes
                </Label>
                <Textarea
                  value={planForm.notes}
                  onChange={(e) =>
                    setPlanForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  data-ocid="predictive.textarea"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPlanForm(false)}
                  data-ocid="predictive.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-ocid="predictive.submit_button"
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.20)",
                    color: "oklch(0.65 0.150 232)",
                    border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                  }}
                >
                  Save Plan
                </Button>
              </div>
            </form>
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
