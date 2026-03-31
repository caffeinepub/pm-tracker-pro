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
  Activity,
  AlertTriangle,
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cpu,
  Download,
  FileText,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Package,
  PrinterIcon,
  Settings,
  Shield,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { BDTargets } from "../context/AppContext";
import { useApp } from "../context/AppContext";
import { exportAllDataToExcel } from "../lib/exportExcel";

const SECTIONS = ["Powder Coating", "Machine Shop", "Utility"] as const;
const MONTH_LABELS = [
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

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  index,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  colorClass: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`${colorClass} rounded-xl p-4 flex items-start justify-between`}
    >
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "oklch(0.75 0.008 260 / 0.85)" }}
        >
          {title}
        </p>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{
            fontFamily: "BricolageGrotesque, sans-serif",
            color: "oklch(0.96 0.004 260)",
          }}
        >
          {value}
        </p>
        {subtitle && (
          <p
            className="text-xs mt-1"
            style={{ color: "oklch(0.75 0.008 260 / 0.7)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="p-2 rounded-lg"
        style={{ background: "oklch(1 0 0 / 0.10)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "oklch(0.96 0.004 260)" }} />
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="industrial-card p-3 text-sm">
        <p
          className="font-semibold mb-2"
          style={{ color: "oklch(0.80 0.180 55)" }}
        >
          {label}
        </p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: p.color }}
            />
            <span style={{ color: "oklch(0.68 0.010 260)" }}>{p.name}:</span>
            <span
              className="font-bold"
              style={{ color: "oklch(0.96 0.004 260)" }}
            >
              {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function SectionHeader({
  icon: Icon,
  title,
  children,
}: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 rounded-lg"
          style={{
            background: "oklch(0.70 0.188 55 / 0.12)",
            border: "1px solid oklch(0.70 0.188 55 / 0.3)",
          }}
        >
          <Icon className="w-4 h-4" style={{ color: "oklch(0.80 0.180 55)" }} />
        </div>
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

const XLSX = (window as any).XLSX;

export default function DashboardPage() {
  const {
    user,
    machines,
    pmPlans,
    pmRecords,
    checklistTemplates,
    isMachineCompleted,
    getTemplateForMachine,
    navigate,
    approveRecord,
    rejectRecord,
    breakdownRecords,
    sectionHoursConfigs,
    prioritizedMachineIds,
    taskRecords,
    bdTargets,
    updateBDTargets,
    pmSpareUsage,
    kaizenRecords,
    predictiveRecords,
    meterReadings,
    spareItems,
  } = useApp();

  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [showIssueSlip, setShowIssueSlip] = useState(false);
  const [issueSlipDate, setIssueSlipDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [targetForm, setTargetForm] = useState<BDTargets>({ ...bdTargets });
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const [kpiMonth, setKpiMonth] = useState(new Date().getMonth() + 1);
  const [kpiYear, setKpiYear] = useState(new Date().getFullYear());

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthBig = BigInt(currentMonth);
  const currentYear = new Date().getFullYear();

  // ---- Preventive Maintenance KPIs ----
  const totalPlannedThisMonth = useMemo(
    () => pmPlans.filter((p) => p.month === currentMonthBig).length,
    [pmPlans, currentMonthBig],
  );

  const pmCompletedThisMonth = useMemo(() => {
    const start = new Date(currentYear, currentMonth - 1, 1).getTime();
    const end = new Date(currentYear, currentMonth, 0, 23, 59, 59).getTime();
    return pmRecords.filter(
      (r) =>
        r.status === "completed" &&
        Number(r.completedDate) >= start &&
        Number(r.completedDate) <= end,
    ).length;
  }, [pmRecords, currentMonth, currentYear]);

  const pmCompletionPct =
    totalPlannedThisMonth > 0
      ? Math.round((pmCompletedThisMonth / totalPlannedThisMonth) * 100)
      : 0;

  const prevPendingApprovals = useMemo(
    () => pmRecords.filter((r) => r.status === "pending-approval"),
    [pmRecords],
  );

  const pendingBreakdownApprovals = useMemo(
    () => breakdownRecords.filter((r) => r.status === "pending-approval"),
    [breakdownRecords],
  );

  // PM Plan vs Actual chart data
  const chartData = useMemo(() => {
    return MONTH_LABELS.map((month, idx) => {
      const monthNum = BigInt(idx + 1);
      const planned = pmPlans.filter((p) => p.month === monthNum).length;
      const actual = pmRecords.filter((r) => {
        const d = new Date(Number(r.completedDate));
        return (
          d.getMonth() === idx &&
          (r.status === "completed" || r.status === "pending-approval")
        );
      }).length;
      return { month, planned, actual };
    });
  }, [pmPlans, pmRecords]);

  // ---- Overall Plant Breakdown KPIs ----
  const overallBdData = useMemo(() => {
    const dashboardAvailHrs = Math.max(
      ...sectionHoursConfigs.map(
        (cfg) => cfg.availableProductionHrs - cfg.powerOff,
      ),
      1,
    );
    const approvedBds = breakdownRecords.filter(
      (r) => r.status === "approved-breakdown",
    );
    const totalBdCount = approvedBds.length;
    const totalBdHours = approvedBds.reduce(
      (s, r) => s + r.durationMinutes / 60,
      0,
    );
    const overallBdPct =
      dashboardAvailHrs > 0 ? (totalBdHours / dashboardAvailHrs) * 100 : 0;
    const overallMttr = totalBdCount > 0 ? totalBdHours / totalBdCount : 0;
    const overallMtbf =
      totalBdCount > 0
        ? (dashboardAvailHrs - totalBdHours) / totalBdCount
        : dashboardAvailHrs;
    const overallUptime =
      overallMttr + overallMtbf > 0
        ? (overallMtbf / (overallMttr + overallMtbf)) * 100
        : 100;
    const currentMonthIdx = new Date().getMonth();
    const monthlyData = MONTH_LABELS.map((month, idx) => {
      if (idx > currentMonthIdx) return { month, bdPct: null };
      const monthBds = approvedBds.filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });
      const mHours = monthBds.reduce((s, r) => s + r.durationMinutes / 60, 0);
      const bdPct =
        dashboardAvailHrs > 0 ? (mHours / dashboardAvailHrs) * 100 : 0;
      return { month, bdPct: Math.round(bdPct * 10) / 10 };
    });
    return {
      totalBdCount,
      totalBdHours,
      overallBdPct,
      overallMttr,
      overallMtbf,
      overallUptime,
      monthlyData,
      dashboardAvailHrs,
    };
  }, [breakdownRecords, sectionHoursConfigs, currentYear]);

  // ---- Planner KPIs ----
  const tasksPending = useMemo(
    () =>
      taskRecords.filter((t) =>
        ["not-started", "in-process", "hold"].includes(t.status),
      ).length,
    [taskRecords],
  );
  const tasksCompleted = useMemo(
    () => taskRecords.filter((t) => t.status === "complete").length,
    [taskRecords],
  );
  const tasksHighPriority = useMemo(
    () =>
      taskRecords.filter(
        (t) =>
          t.priority === "high" && !["complete", "canceled"].includes(t.status),
      ).length,
    [taskRecords],
  );

  // Today's machines
  const todayMachines = useMemo(() => {
    return machines.filter((m) =>
      pmPlans.some((p) => p.machineId === m.id && p.month === currentMonthBig),
    );
  }, [machines, pmPlans, currentMonthBig]);

  const handleMachineClick = (machineId: string) => {
    const machine = machines.find((m) => m.id === machineId);
    const template = machine ? getTemplateForMachine(machine) : undefined;
    if (!template) {
      toast.error("No checklist template found for this machine.");
      return;
    }
    navigate("checklist", { machineId });
  };

  const handleDownloadReport = () => {
    exportAllDataToExcel(machines, pmPlans, pmRecords, checklistTemplates);
    toast.success("Report downloaded!");
  };

  const handleSaveTargets = () => {
    updateBDTargets(targetForm);
    toast.success("Targets updated");
    setShowTargetDialog(false);
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function generateKPIReport(month: number, year: number) {
    const monthLabel = MONTH_LABELS[month - 1];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const isInMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    };

    // PM Data
    const plannedPM = pmPlans.filter((p) => p.month === BigInt(month)).length;
    const completedPM = pmRecords.filter((r) => {
      const d = new Date(Number(r.completedDate));
      return (
        d >= monthStart &&
        d <= monthEnd &&
        (r.status === "completed" || r.status === "pending-approval")
      );
    }).length;
    const pmPct =
      plannedPM > 0 ? ((completedPM / plannedPM) * 100).toFixed(1) : "0.0";
    const pendingPMApprovals = pmRecords.filter(
      (r) => r.status === "pending-approval",
    ).length;

    // Breakdown Data
    const monthBDs = breakdownRecords.filter(
      (r) => r.status === "approved-breakdown" && isInMonth(r.date),
    );
    const totalBdCount = monthBDs.length;
    const totalBdHours = monthBDs.reduce(
      (s, r) => s + r.durationMinutes / 60,
      0,
    );
    const maxAvailHrs = Math.max(
      ...sectionHoursConfigs.map((c) => c.availableProductionHrs - c.powerOff),
      1,
    );
    const bdPct =
      maxAvailHrs > 0 ? ((totalBdHours / maxAvailHrs) * 100).toFixed(1) : "0.0";
    const mttr =
      totalBdCount > 0 ? (totalBdHours / totalBdCount).toFixed(2) : "N/A";
    const mtbf =
      totalBdCount > 0
        ? ((maxAvailHrs - totalBdHours) / totalBdCount).toFixed(1)
        : maxAvailHrs.toFixed(1);
    const uptime =
      Number.parseFloat(mttr) + Number.parseFloat(mtbf || "0") > 0
        ? (
            (Number.parseFloat(mtbf || "0") /
              (Number.parseFloat(mttr || "0") +
                Number.parseFloat(mtbf || "0"))) *
            100
          ).toFixed(1)
        : "100.0";

    // Predictive Data
    const safePredict = Array.isArray(predictiveRecords)
      ? predictiveRecords
      : [];
    const monthPredComplete = safePredict.filter(
      (r) => r.status === "completed" && isInMonth(r.date),
    ).length;
    const monthPredPending = safePredict.filter(
      (r) => r.status === "pending-approval" && isInMonth(r.date),
    ).length;

    // Tasks
    const safeTasks = Array.isArray(taskRecords) ? taskRecords : [];
    const totalTasks = safeTasks.length;
    const completedTasks = safeTasks.filter(
      (t) => t.status === "complete",
    ).length;
    const pendingTasks = safeTasks.filter((t) =>
      ["not-started", "in-process", "hold"].includes(t.status),
    ).length;
    const highPriTasks = safeTasks.filter(
      (t) =>
        t.priority === "high" && !["complete", "canceled"].includes(t.status),
    ).length;

    // Unplanned %
    const totalPlanned =
      plannedPM +
      safePredict.filter((p) => {
        const d = new Date(p.date);
        return d >= monthStart && d <= monthEnd;
      }).length;
    const unplannedPct =
      totalPlanned > 0
        ? ((totalBdCount / totalPlanned) * 100).toFixed(1)
        : "0.0";

    // Kaizen
    const safeKaizen = Array.isArray(kaizenRecords) ? kaizenRecords : [];
    const monthKaizen = safeKaizen.filter((k) =>
      isInMonth(new Date(k.submittedAt).toISOString().split("T")[0]),
    );
    const kaizenSubmitted = monthKaizen.length;
    const kaizenApproved = monthKaizen.filter(
      (k) => k.status === "Approved" || k.status === "Closed",
    ).length;
    const kaizenPending = monthKaizen.filter(
      (k) => k.status === "Pending Approval",
    ).length;

    // Spares
    const safeSpares = Array.isArray(spareItems) ? spareItems : [];

    // Cost
    const allSpareUsage = [
      ...breakdownRecords
        .filter((r) => isInMonth(r.date) && r.spareUsed)
        .flatMap((r) =>
          (r.spareUsed || []).map((s) => ({
            date: r.date,
            type: "Breakdown",
            machine: r.machineName,
            name: s.spareName,
            qty: s.qty,
            cost: s.cost,
          })),
        ),
      ...(Array.isArray(pmSpareUsage) ? pmSpareUsage : [])
        .filter((p) => isInMonth(p.date))
        .flatMap((p) =>
          p.spareUsed.map((s) => ({
            date: p.date,
            type: p.workType,
            machine: p.machineName,
            name: s.spareName,
            qty: s.qty,
            cost: s.cost,
          })),
        ),
    ];
    const totalCost = allSpareUsage.reduce((s, r) => s + r.cost, 0);

    // Electricity
    const safeReadings = Array.isArray(meterReadings) ? meterReadings : [];
    const monthReadings = safeReadings.filter((r) => isInMonth(r.date));
    const totalConsumption = monthReadings.reduce(
      (s, r) => s + (r.consumption || 0),
      0,
    );

    // Section KPIs
    const sectionRows = SECTIONS.map((sec) => {
      const secMachines = machines
        .filter((m) => m.section === sec)
        .map((m) => m.id);
      const secBDs = monthBDs.filter((r) => secMachines.includes(r.machineId));
      const secCount = secBDs.length;
      const secHours = secBDs.reduce((s, r) => s + r.durationMinutes / 60, 0);
      const cfg = sectionHoursConfigs.find((c) => c.section === sec);
      const avail = cfg
        ? cfg.availableProductionHrs - cfg.powerOff
        : maxAvailHrs;
      const secBdPct =
        avail > 0 ? ((secHours / avail) * 100).toFixed(1) : "0.0";
      const secMttr = secCount > 0 ? (secHours / secCount).toFixed(2) : "N/A";
      const secMtbf =
        secCount > 0
          ? ((avail - secHours) / secCount).toFixed(1)
          : avail.toFixed(1);
      const tgt = bdTargets[sec as keyof typeof bdTargets];
      return { sec, secCount, secBdPct, secMttr, secMtbf, tgt };
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Monthly KPI Report — ${monthLabel} ${year}</title>
<style>
@page { size: A4; margin: 12mm 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: #fff; }
h1 { font-size: 16px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
h2 { font-size: 12px; font-weight: 700; margin: 12px 0 5px; border-bottom: 2px solid #111; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
h3 { font-size: 10px; text-align: center; color: #555; margin-bottom: 3px; }
.header-box { border: 2px solid #111; padding: 10px; margin-bottom: 12px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
.kpi-card { border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; }
.kpi-label { font-size: 8.5px; color: #777; text-transform: uppercase; letter-spacing: 0.4px; }
.kpi-value { font-size: 16px; font-weight: 700; margin-top: 1px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
th { background: #1a1a1a; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: middle; }
tr:nth-child(even) td { background: #f9f9f9; }
.footer { margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 9px; color: #888; }
.section-title { font-size: 11px; font-weight: 600; color: #333; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header-box">
  <h3>Plant Maintenance Management System</h3>
  <h1>Monthly KPI Report — ${monthLabel} ${year}</h1>
  <p style="text-align:center;font-size:9px;color:#666;margin-top:4px;">Generated on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
</div>

<h2>1. PM Summary</h2>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Planned PM</div><div class="kpi-value">${plannedPM}</div></div>
  <div class="kpi-card"><div class="kpi-label">Completed PM</div><div class="kpi-value">${completedPM}</div></div>
  <div class="kpi-card"><div class="kpi-label">Completion %</div><div class="kpi-value">${pmPct}%</div></div>
  <div class="kpi-card"><div class="kpi-label">Pending Approvals</div><div class="kpi-value">${pendingPMApprovals}</div></div>
</div>

<h2>2. Breakdown Summary</h2>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">BD Count</div><div class="kpi-value">${totalBdCount}</div></div>
  <div class="kpi-card"><div class="kpi-label">BD Hours</div><div class="kpi-value">${totalBdHours.toFixed(1)}h</div></div>
  <div class="kpi-card"><div class="kpi-label">BD%</div><div class="kpi-value">${bdPct}%</div></div>
  <div class="kpi-card"><div class="kpi-label">Uptime%</div><div class="kpi-value">${uptime}%</div></div>
  <div class="kpi-card"><div class="kpi-label">MTTR (hrs)</div><div class="kpi-value">${mttr}</div></div>
  <div class="kpi-card"><div class="kpi-label">MTBF (hrs)</div><div class="kpi-value">${mtbf}</div></div>
  <div class="kpi-card"><div class="kpi-label">Avail. Hrs</div><div class="kpi-value">${maxAvailHrs.toFixed(0)}</div></div>
</div>

<h2>3. Section KPIs</h2>
<table>
  <thead><tr><th>Section</th><th>BD Count</th><th>BD%</th><th>MTTR (h)</th><th>MTBF (h)</th><th>Target BD%</th><th>Target Uptime%</th></tr></thead>
  <tbody>
    ${sectionRows
      .map(
        (s) => `<tr>
      <td><strong>${s.sec}</strong></td>
      <td>${s.secCount}</td>
      <td>${s.secBdPct}%</td>
      <td>${s.secMttr}</td>
      <td>${s.secMtbf}</td>
      <td>${s.tgt?.bdPct ?? "—"}%</td>
      <td>${s.tgt?.uptime ?? "—"}%</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>

<h2>4. Predictive Maintenance Summary</h2>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-value">${monthPredComplete}</div></div>
  <div class="kpi-card"><div class="kpi-label">Pending Approval</div><div class="kpi-value">${monthPredPending}</div></div>
</div>

<h2>5. Task / Planner Summary</h2>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Total Tasks</div><div class="kpi-value">${totalTasks}</div></div>
  <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-value">${completedTasks}</div></div>
  <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-value">${pendingTasks}</div></div>
  <div class="kpi-card"><div class="kpi-label">High Priority</div><div class="kpi-value">${highPriTasks}</div></div>
</div>

<h2>6. Unplanned Maintenance %</h2>
<p style="font-size:11px;margin-bottom:8px;">
  Formula: Breakdown Count (${totalBdCount}) ÷ Total Planned (PM + Predictive = ${totalPlanned}) × 100
  = <strong>${unplannedPct}%</strong>
</p>

<h2>7. Kaizen Summary</h2>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi-card"><div class="kpi-label">Submitted</div><div class="kpi-value">${kaizenSubmitted}</div></div>
  <div class="kpi-card"><div class="kpi-label">Approved</div><div class="kpi-value">${kaizenApproved}</div></div>
  <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-value">${kaizenPending}</div></div>
</div>

<h2>8. Stock of Spares</h2>
${
  safeSpares.length === 0
    ? '<p style="color:#888;font-style:italic;">No spares in master list.</p>'
    : `
<table>
  <thead><tr><th>Part Name</th><th>Specification</th><th>Qty in Stock</th><th>Min Level</th><th>Unit</th><th>Cost/Unit</th><th>Status</th></tr></thead>
  <tbody>
    ${safeSpares
      .map(
        (s) => `<tr>
      <td>${s.partName}</td>
      <td>${s.partSpec || "—"}</td>
      <td>${s.qtyInStock}</td>
      <td>${s.minStockLevel}</td>
      <td>${s.unit}</td>
      <td>₹${s.costPerUnit}</td>
      <td style="font-weight:700;color:${s.qtyInStock <= s.minStockLevel ? "#c0392b" : "#27ae60"}">${s.qtyInStock <= s.minStockLevel ? "LOW STOCK" : "OK"}</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>`
}

<h2>9. Maintenance Cost (${monthLabel} ${year})</h2>
${
  allSpareUsage.length === 0
    ? '<p style="color:#888;font-style:italic;">No spare usage recorded for this month.</p>'
    : `
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Machine</th><th>Spare Name</th><th>Qty</th><th>Cost (₹)</th></tr></thead>
  <tbody>
    ${allSpareUsage
      .map(
        (r) => `<tr>
      <td>${r.date}</td><td>${r.type}</td><td>${r.machine}</td><td>${r.name}</td><td>${r.qty}</td><td>₹${r.cost.toLocaleString()}</td>
    </tr>`,
      )
      .join("")}
    <tr style="font-weight:700;background:#f0f0f0"><td colspan="5" style="text-align:right;">Total Cost:</td><td>₹${totalCost.toLocaleString()}</td></tr>
  </tbody>
</table>`
}

<h2>10. Electricity Consumption (${monthLabel} ${year})</h2>
${
  monthReadings.length === 0
    ? '<p style="color:#888;font-style:italic;">No electricity readings for this month.</p>'
    : `
<table>
  <thead><tr><th>Date</th><th>Meter</th><th>Reading</th><th>Consumption</th><th>Entered By</th></tr></thead>
  <tbody>
    ${monthReadings
      .map(
        (r) => `<tr>
      <td>${r.date}</td><td>${r.meterName}</td><td>${r.endReading ?? r.startReading}</td><td>${(r.consumption || 0).toFixed(2)} ${""}</td><td>${r.enteredBy}</td>
    </tr>`,
      )
      .join("")}
    <tr style="font-weight:700;background:#f0f0f0"><td colspan="3" style="text-align:right;">Total Consumption:</td><td>${totalConsumption.toFixed(2)}</td><td></td></tr>
  </tbody>
</table>`
}

<div class="footer">
  <p>Plant Maintenance Management System — Monthly KPI Report — ${monthLabel} ${year}</p>
  <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
</div>
</body></html>`;

    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) {
      toast.error("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 800);
  }

  return (
    <>
      <MorningPopup />
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        {/* Hero Band */}
        <div
          className="relative h-28 md:h-36 flex items-center"
          style={{
            backgroundImage:
              "url('/assets/generated/factory-bg.dim_1920x600.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0.165 0.022 252 / 0.72)" }}
          />
          <div className="relative max-w-7xl mx-auto px-4 w-full">
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-1"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                >
                  Plant Maintenance Management System
                </p>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Dashboard
                </h1>
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.60 0.010 260)" }}
                >
                  {todayLabel}
                </p>
              </div>
              <Button
                data-ocid="dashboard.download_button"
                size="sm"
                onClick={handleDownloadReport}
                className="hidden md:flex items-center gap-1.5"
                style={{
                  background: "oklch(0.70 0.188 55 / 0.18)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                <Download className="w-3.5 h-3.5" /> Download Report
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 space-y-8">
          {/* ===== CONSOLIDATED PENDING APPROVALS (admin only) ===== */}
          {user?.role === "admin" &&
            (() => {
              const pendingPM = pmRecords.filter(
                (r) => r.status === "pending-approval",
              ).length;
              const pendingBD = breakdownRecords.filter(
                (r) => r.status === "pending-approval",
              ).length;
              const pendingKaizen = (
                Array.isArray(kaizenRecords) ? kaizenRecords : []
              ).filter((k) => k.status === "Pending Approval").length;
              const pendingTaskStatus = (
                Array.isArray(taskRecords) ? taskRecords : []
              ).filter((t) =>
                t.statusHistory?.some((h) => h.requiresApproval && !h.approved),
              ).length;
              const total =
                pendingPM + pendingBD + pendingKaizen + pendingTaskStatus;
              if (total === 0)
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-ocid="approvals.panel"
                    className="industrial-card p-4 flex items-center gap-3"
                    style={{ borderColor: "oklch(0.45 0.12 145 / 0.4)" }}
                  >
                    <CheckCircle2
                      className="w-5 h-5 shrink-0"
                      style={{ color: "oklch(0.75 0.13 145)" }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: "oklch(0.75 0.13 145)" }}
                    >
                      All approvals up to date ✓
                    </span>
                  </motion.div>
                );
              return (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-ocid="approvals.panel"
                  className="industrial-card p-4"
                  style={{
                    borderColor: "oklch(0.55 0.17 27 / 0.5)",
                    background: "oklch(0.20 0.025 252)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell
                        className="w-4 h-4"
                        style={{ color: "oklch(0.78 0.17 27)" }}
                      />
                      <h3
                        className="text-sm font-bold"
                        style={{ color: "oklch(0.78 0.17 27)" }}
                      >
                        Pending Approvals
                      </h3>
                      <Badge
                        style={{
                          background: "oklch(0.45 0.18 27 / 0.25)",
                          color: "oklch(0.78 0.17 27)",
                          border: "1px solid oklch(0.55 0.17 27 / 0.4)",
                          fontSize: "10px",
                        }}
                      >
                        {total} total
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        label: "PM Checklists",
                        count: pendingPM,
                        page: "preventive" as const,
                        color: "oklch(0.70 0.13 245)",
                      },
                      {
                        label: "Breakdown Slips",
                        count: pendingBD,
                        page: "breakdown-panel" as const,
                        color: "oklch(0.78 0.17 27)",
                      },
                      {
                        label: "Kaizen",
                        count: pendingKaizen,
                        page: "kaizen" as const,
                        color: "oklch(0.75 0.16 290)",
                      },
                      {
                        label: "Task Status",
                        count: pendingTaskStatus,
                        page: "task-list" as const,
                        color: "oklch(0.82 0.14 55)",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg p-3 flex items-center justify-between"
                        style={{
                          background: "oklch(0.165 0.022 252)",
                          border: `1px solid ${item.color}44`,
                        }}
                      >
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: "oklch(0.58 0.010 260)" }}
                          >
                            {item.label}
                          </p>
                          <p
                            className="text-xl font-bold mt-0.5"
                            style={{
                              color:
                                item.count > 0
                                  ? item.color
                                  : "oklch(0.55 0.010 260)",
                              fontFamily: "BricolageGrotesque, sans-serif",
                            }}
                          >
                            {item.count}
                          </p>
                        </div>
                        {item.count > 0 && (
                          <button
                            type="button"
                            onClick={() => navigate(item.page)}
                            data-ocid="approvals.secondary_button"
                            className="text-xs px-2 py-1 rounded font-semibold"
                            style={{
                              background: `${item.color}22`,
                              color: item.color,
                              border: `1px solid ${item.color}44`,
                            }}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

          {/* ===== SECTION 1: PREVENTIVE MAINTENANCE ===== */}
          <section data-ocid="dashboard.section">
            <SectionHeader icon={ClipboardCheck} title="Preventive Maintenance">
              <Button
                size="sm"
                data-ocid="dashboard.secondary_button"
                onClick={() => navigate("preventive")}
                style={{
                  background: "oklch(0.22 0.022 252)",
                  border: "1px solid oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                  fontSize: "12px",
                }}
              >
                View All PM
              </Button>
            </SectionHeader>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              <KPICard
                title="Planned This Month"
                value={totalPlannedThisMonth}
                subtitle="Machines"
                icon={Cpu}
                colorClass="kpi-steel-blue"
                index={0}
              />
              <KPICard
                title="Today's PM Plan"
                value={prioritizedMachineIds.length}
                subtitle="Prioritized"
                icon={BarChart2}
                colorClass="kpi-blue"
                index={1}
              />
              <KPICard
                title="PM Completed"
                value={pmCompletedThisMonth}
                subtitle="This month"
                icon={CheckCircle2}
                colorClass="kpi-green"
                index={2}
              />
              <KPICard
                title="Completion %"
                value={`${pmCompletionPct}%`}
                subtitle="Monthly rate"
                icon={Activity}
                colorClass="kpi-orange"
                index={3}
              />
              <div
                className="col-span-2 rounded-xl p-4 flex items-center justify-between"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.32 0.10 15), oklch(0.22 0.07 15))",
                  border: "1px solid oklch(0.50 0.15 20 / 0.5)",
                }}
              >
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "oklch(0.75 0.008 260 / 0.85)" }}
                  >
                    Preventive Approvals Pending
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{
                      fontFamily: "BricolageGrotesque, sans-serif",
                      color: "oklch(0.96 0.004 260)",
                    }}
                  >
                    {prevPendingApprovals.length}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.75 0.008 260 / 0.7)" }}
                  >
                    Awaiting review
                  </p>
                </div>
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "oklch(1 0 0 / 0.10)" }}
                >
                  <Clock
                    className="w-5 h-5"
                    style={{ color: "oklch(0.96 0.004 260)" }}
                  />
                </div>
              </div>
            </div>

            {/* PM Plan vs Actual Chart */}
            <div className="industrial-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                  >
                    Plan vs Actual
                  </h3>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    Monthly PM completion — {currentYear}
                  </p>
                </div>
                <BarChart2
                  className="w-5 h-5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.34 0.030 252 / 0.6)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "oklch(0.68 0.010 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.68 0.010 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      color: "oklch(0.68 0.010 260)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="planned"
                    name="Planned"
                    fill="oklch(0.50 0.065 232)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    fill="oklch(0.34 0.034 253)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Trend"
                    stroke="oklch(0.80 0.180 55)"
                    strokeWidth={2.5}
                    dot={{ fill: "oklch(0.80 0.180 55)", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Pending Approvals table (admin only) */}
            {user?.role === "admin" && prevPendingApprovals.length > 0 && (
              <div className="industrial-card p-4 mt-4">
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: "oklch(0.75 0.130 145)" }}
                >
                  Preventive Pending Approvals
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid oklch(0.34 0.030 252)",
                        }}
                      >
                        {["Machine", "Operator", "Date", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 font-semibold uppercase tracking-wider"
                            style={{ color: "oklch(0.50 0.010 260)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prevPendingApprovals.slice(0, 5).map((record, idx) => {
                        const machine = machines.find(
                          (m) => m.id === record.machineId,
                        );
                        return (
                          <tr
                            key={record.id}
                            data-ocid={`approvals.row.${idx + 1}`}
                            style={{
                              borderBottom:
                                idx < prevPendingApprovals.length - 1
                                  ? "1px solid oklch(0.28 0.020 252)"
                                  : undefined,
                            }}
                          >
                            <td className="px-3 py-2 font-medium">
                              {machine?.name ?? record.machineId}
                            </td>
                            <td
                              className="px-3 py-2"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {record.operatorName}
                            </td>
                            <td
                              className="px-3 py-2"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              {new Date(
                                Number(record.completedDate),
                              ).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  data-ocid={`approvals.confirm_button.${idx + 1}`}
                                  onClick={() => {
                                    approveRecord(record.id);
                                    toast.success("Approved");
                                  }}
                                  className="text-xs px-2 py-1 rounded font-semibold"
                                  style={{
                                    background: "oklch(0.45 0.12 145 / 0.20)",
                                    color: "oklch(0.75 0.13 145)",
                                    border:
                                      "1px solid oklch(0.52 0.12 145 / 0.4)",
                                  }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  type="button"
                                  data-ocid={`approvals.delete_button.${idx + 1}`}
                                  onClick={() => {
                                    rejectRecord(record.id);
                                    toast.info("Rejected");
                                  }}
                                  className="text-xs px-2 py-1 rounded font-semibold"
                                  style={{
                                    background: "oklch(0.45 0.18 27 / 0.20)",
                                    color: "oklch(0.78 0.17 27)",
                                    border:
                                      "1px solid oklch(0.55 0.17 27 / 0.4)",
                                  }}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ===== SECTION 2: BREAKDOWN ANALYSIS ===== */}
          <section data-ocid="dashboard.section">
            <SectionHeader icon={AlertTriangle} title="Breakdown Analysis">
              <div className="flex items-center gap-2">
                {pendingBreakdownApprovals.length > 0 && (
                  <Badge
                    data-ocid="breakdown.panel"
                    className="text-xs font-bold"
                    style={{
                      background: "oklch(0.45 0.18 27 / 0.20)",
                      color: "oklch(0.78 0.17 27)",
                      border: "1px solid oklch(0.55 0.17 27 / 0.4)",
                    }}
                  >
                    {pendingBreakdownApprovals.length} pending
                  </Badge>
                )}
                {user?.role === "admin" && (
                  <Button
                    size="sm"
                    data-ocid="dashboard.primary_button"
                    onClick={() => {
                      setTargetForm({ ...bdTargets });
                      setShowTargetDialog(true);
                    }}
                    style={{
                      background: "oklch(0.70 0.188 55 / 0.15)",
                      border: "1px solid oklch(0.70 0.188 55 / 0.35)",
                      color: "oklch(0.80 0.180 55)",
                      fontSize: "12px",
                    }}
                  >
                    <Target className="w-3 h-3 mr-1" /> Set Targets
                  </Button>
                )}
                <Button
                  size="sm"
                  data-ocid="dashboard.secondary_button"
                  onClick={() => navigate("breakdown-panel")}
                  style={{
                    background: "oklch(0.22 0.022 252)",
                    border: "1px solid oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                    fontSize: "12px",
                  }}
                >
                  View Records
                </Button>
              </div>
            </SectionHeader>

            {/* Overall Plant KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {[
                {
                  label: "BD Count",
                  value: String(overallBdData.totalBdCount),
                  good: overallBdData.totalBdCount === 0,
                  target: null,
                },
                {
                  label: "BD Hours",
                  value: `${overallBdData.totalBdHours.toFixed(1)}h`,
                  good: overallBdData.totalBdHours < 10,
                  target: null,
                },
                {
                  label: "BD%",
                  value: `${overallBdData.overallBdPct.toFixed(1)}%`,
                  good:
                    overallBdData.overallBdPct <=
                    (bdTargets.Overall?.bdPct ?? 5),
                  target: bdTargets.Overall?.bdPct,
                },
                {
                  label: "MTTR (h)",
                  value: overallBdData.overallMttr.toFixed(1),
                  good:
                    overallBdData.overallMttr <=
                    (bdTargets.Overall?.mttr ?? 60),
                  target: bdTargets.Overall?.mttr,
                },
                {
                  label: "MTBF (h)",
                  value: overallBdData.overallMtbf.toFixed(0),
                  good:
                    overallBdData.overallMtbf >=
                    (bdTargets.Overall?.mtbf ?? 500),
                  target: bdTargets.Overall?.mtbf,
                },
                {
                  label: "Uptime%",
                  value: `${overallBdData.overallUptime.toFixed(1)}%`,
                  good:
                    overallBdData.overallUptime >=
                    (bdTargets.Overall?.uptime ?? 95),
                  target: bdTargets.Overall?.uptime,
                },
              ].map((kpi, idx) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="industrial-card p-3"
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    {kpi.label}
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      color: kpi.good
                        ? "oklch(0.75 0.13 145)"
                        : "oklch(0.78 0.17 27)",
                      fontFamily: "BricolageGrotesque, sans-serif",
                    }}
                  >
                    {kpi.value}
                  </p>
                  {kpi.target !== null && kpi.target !== undefined && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "oklch(0.45 0.010 260)" }}
                    >
                      Target: {kpi.target}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Overall Plant BD% Monthly Trend */}
            <div className="industrial-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.75 0.008 260)" }}
                >
                  Overall Plant BD% — Monthly Trend ({new Date().getFullYear()})
                </h3>
                <Target
                  className="w-4 h-4"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart
                  data={overallBdData.monthlyData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.34 0.030 252 / 0.4)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "oklch(0.55 0.010 260)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.55 0.010 260)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="bdPct"
                    name="BD%"
                    fill="oklch(0.78 0.17 27)"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <ReferenceLine
                    y={bdTargets.Overall?.bdPct ?? 5}
                    stroke="oklch(0.80 0.180 55)"
                    strokeDasharray="5 3"
                    strokeWidth={2}
                    label={{
                      value: "Target",
                      fill: "oklch(0.80 0.180 55)",
                      fontSize: 10,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== SECTION 3: PLANNER ===== */}
          <section data-ocid="dashboard.section">
            <SectionHeader icon={ClipboardCheck} title="Planner">
              <Button
                size="sm"
                data-ocid="planner.open_modal_button"
                onClick={() => navigate("task-list")}
                style={{
                  background: "oklch(0.70 0.188 55 / 0.18)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                  color: "oklch(0.80 0.180 55)",
                  fontSize: "12px",
                }}
              >
                Open Task List
              </Button>
            </SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPICard
                title="Tasks Pending"
                value={tasksPending}
                subtitle="Not started / In process / Hold"
                icon={Clock}
                colorClass="kpi-orange"
                index={0}
              />
              <KPICard
                title="Tasks Completed"
                value={tasksCompleted}
                subtitle="Finished tasks"
                icon={CheckCircle2}
                colorClass="kpi-green"
                index={1}
              />
              <KPICard
                title="High Priority"
                value={tasksHighPriority}
                subtitle="Active high priority"
                icon={AlertTriangle}
                colorClass="kpi-steel-blue"
                index={2}
              />
            </div>

            {/* Mini task list preview */}
            {taskRecords.length > 0 && (
              <div className="industrial-card p-4 mt-4">
                <h3
                  className="text-xs font-semibold mb-3 uppercase tracking-wider"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  Recent Tasks
                </h3>
                <div className="space-y-2">
                  {taskRecords
                    .filter(
                      (t) =>
                        user?.role === "admin" ||
                        t.assignedTo === user?.username,
                    )
                    .slice(0, 4)
                    .map((task, idx) => {
                      const statusColors: Record<string, string> = {
                        complete: "oklch(0.75 0.13 145)",
                        "in-process": "oklch(0.70 0.13 245)",
                        hold: "oklch(0.82 0.14 55)",
                        canceled: "oklch(0.78 0.17 27)",
                        "not-started": "oklch(0.55 0.010 260)",
                      };
                      const priorityColors: Record<string, string> = {
                        high: "oklch(0.78 0.17 27)",
                        medium: "oklch(0.82 0.14 55)",
                        low: "oklch(0.75 0.13 145)",
                      };
                      return (
                        <div
                          key={task.id}
                          data-ocid={`planner.item.${idx + 1}`}
                          className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
                          style={{ borderColor: "oklch(0.28 0.020 252)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: priorityColors[task.priority],
                              }}
                            />
                            <span className="font-medium text-xs">
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              {task.assignedTo}
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color:
                                  statusColors[task.status] ??
                                  "oklch(0.68 0.010 260)",
                              }}
                            >
                              {task.status === "not-started"
                                ? "Not Started"
                                : task.status === "in-process"
                                  ? "In Process"
                                  : task.status.charAt(0).toUpperCase() +
                                    task.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>

          {/* ===== SECTION 4: QUICK ACTIONS ===== */}
          <section data-ocid="dashboard.section">
            <SectionHeader icon={LayoutGrid} title="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Breakdown Slip",
                  icon: AlertTriangle,
                  color: "oklch(0.78 0.17 27)",
                  bg: "oklch(0.45 0.18 27 / 0.12)",
                  border: "oklch(0.55 0.17 27 / 0.3)",
                  action: () => navigate("breakdown"),
                  ocid: "quickaction.breakdown_slip.button",
                },
                {
                  label: "Assign Today's Machines",
                  icon: Cpu,
                  color: "oklch(0.80 0.180 55)",
                  bg: "oklch(0.70 0.188 55 / 0.12)",
                  border: "oklch(0.70 0.188 55 / 0.3)",
                  action: () => navigate("admin", { tab: "plans" }),
                  ocid: "quickaction.assign_machines.button",
                  adminOnly: true,
                },
                {
                  label: "Upload Data",
                  icon: Download,
                  color: "oklch(0.68 0.010 260)",
                  bg: "oklch(0.34 0.030 252 / 0.3)",
                  border: "oklch(0.40 0.030 252)",
                  action: () => navigate("admin", { tab: "upload" }),
                  ocid: "quickaction.upload_data.button",
                  adminOnly: true,
                },
                {
                  label: "Breakdown Record",
                  icon: Shield,
                  color: "oklch(0.70 0.13 245)",
                  bg: "oklch(0.30 0.09 245 / 0.12)",
                  border: "oklch(0.44 0.13 245 / 0.3)",
                  action: () => navigate("breakdown-panel"),
                  ocid: "quickaction.breakdown_record.button",
                },
                {
                  label: "CAPA",
                  icon: Wrench,
                  color: "oklch(0.82 0.14 55)",
                  bg: "oklch(0.50 0.16 55 / 0.12)",
                  border: "oklch(0.55 0.14 55 / 0.3)",
                  action: () => navigate("capa"),
                  ocid: "quickaction.capa.button",
                },
                {
                  label: "History Card",
                  icon: Activity,
                  color: "oklch(0.75 0.13 145)",
                  bg: "oklch(0.45 0.12 145 / 0.12)",
                  border: "oklch(0.52 0.12 145 / 0.3)",
                  action: () => navigate("history"),
                  ocid: "quickaction.history_card.button",
                },
                {
                  label: "Task List",
                  icon: ClipboardCheck,
                  color: "oklch(0.70 0.13 245)",
                  bg: "oklch(0.30 0.09 245 / 0.12)",
                  border: "oklch(0.44 0.13 245 / 0.3)",
                  action: () => navigate("task-list"),
                  ocid: "quickaction.task_list.button",
                },
                {
                  label: "Kaizen",
                  icon: Lightbulb,
                  color: "oklch(0.75 0.16 290)",
                  bg: "oklch(0.45 0.12 290 / 0.12)",
                  border: "oklch(0.55 0.14 290 / 0.3)",
                  action: () => navigate("kaizen"),
                  ocid: "quickaction.kaizen.button",
                },
                {
                  label: "Material Issue Slip",
                  icon: FileText,
                  color: "oklch(0.80 0.13 35)",
                  bg: "oklch(0.45 0.12 35 / 0.12)",
                  border: "oklch(0.55 0.12 35 / 0.3)",
                  action: () => setShowIssueSlip(true),
                  ocid: "quickaction.material_issue.button",
                },
                {
                  label: "Monthly KPI Report",
                  icon: PrinterIcon,
                  color: "oklch(0.75 0.13 200)",
                  bg: "oklch(0.45 0.12 200 / 0.12)",
                  border: "oklch(0.55 0.12 200 / 0.3)",
                  action: () => setShowKPIDialog(true),
                  ocid: "quickaction.kpi_report.button",
                  adminOnly: true,
                },
              ]
                .filter((item) => !item.adminOnly || user?.role === "admin")
                .map((item) => (
                  <motion.button
                    key={item.label}
                    type="button"
                    whileHover={{ scale: 1.03, translateY: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={item.action}
                    className="industrial-card p-4 text-left flex items-center gap-3 cursor-pointer"
                    style={{
                      border: `1px solid ${item.border}`,
                      background: item.bg,
                    }}
                    data-ocid={item.ocid}
                  >
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{
                        background: item.bg,
                        border: `1px solid ${item.border}`,
                      }}
                    >
                      <item.icon
                        className="w-4 h-4"
                        style={{ color: item.color }}
                      />
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.85 0.008 260)" }}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                ))}
            </div>
          </section>

          {/* ===== SECTION 5: MAINTENANCE COST ===== */}
          <section data-ocid="dashboard.section">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{
                    background: "oklch(0.48 0.13 200 / 0.12)",
                    border: "1px solid oklch(0.48 0.13 200 / 0.3)",
                  }}
                >
                  <Package
                    className="w-4 h-4"
                    style={{ color: "oklch(0.70 0.14 200)" }}
                  />
                </div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Maintenance Cost{" "}
                  <span style={{ color: "oklch(0.70 0.14 200)" }}>
                    (Last 30 Days)
                  </span>
                </h2>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!XLSX) {
                    toast.error("XLSX not available");
                    return;
                  }
                  const costData = (() => {
                    const map: Record<string, number> = {};
                    for (const bd of breakdownRecords) {
                      if (bd.spareUsed) {
                        const cost = bd.spareUsed.reduce(
                          (s, r) => s + r.cost,
                          0,
                        );
                        if (cost > 0) map[bd.date] = (map[bd.date] || 0) + cost;
                      }
                    }
                    for (const pu of pmSpareUsage) {
                      const cost = pu.spareUsed.reduce((s, r) => s + r.cost, 0);
                      if (cost > 0) map[pu.date] = (map[pu.date] || 0) + cost;
                    }
                    return Object.entries(map)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, cost]) => ({
                        Date: date,
                        "Total Cost (₹)": cost,
                      }));
                  })();
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.json_to_sheet(costData);
                  XLSX.utils.book_append_sheet(wb, ws, "Cost");
                  XLSX.writeFile(
                    wb,
                    `MaintenanceCost_${new Date().toISOString().split("T")[0]}.xlsx`,
                  );
                }}
                data-ocid="cost_chart.export.button"
                style={{
                  background: "oklch(0.30 0.060 145 / 0.25)",
                  color: "oklch(0.75 0.13 145)",
                  border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                Export Excel
              </Button>
            </div>
            {(() => {
              const today = new Date();
              const days30 = Array.from({ length: 30 }, (_, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() - (29 - i));
                return d.toISOString().split("T")[0];
              });
              const costMap: Record<string, number> = {};
              for (const bd of breakdownRecords) {
                if (bd.spareUsed) {
                  const cost = bd.spareUsed.reduce((s, r) => s + r.cost, 0);
                  if (cost > 0)
                    costMap[bd.date] = (costMap[bd.date] || 0) + cost;
                }
              }
              for (const pu of pmSpareUsage) {
                const cost = pu.spareUsed.reduce((s, r) => s + r.cost, 0);
                if (cost > 0) costMap[pu.date] = (costMap[pu.date] || 0) + cost;
              }
              const chartData = days30.map((d) => ({
                date: d.slice(5), // MM-DD
                cost: costMap[d] || 0,
              }));
              const hasCostData = chartData.some((d) => d.cost > 0);
              return (
                <div className="industrial-card p-4">
                  {!hasCostData && (
                    <p
                      className="text-center text-sm py-8"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      No spare cost data yet. Record spares used in
                      breakdown/PM/predictive work.
                    </p>
                  )}
                  {hasCostData && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={chartData}
                        margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.28 0.022 252)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "oklch(0.55 0.010 260)" }}
                          interval={4}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "oklch(0.55 0.010 260)" }}
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "oklch(0.19 0.020 255)",
                            border: "1px solid oklch(0.34 0.030 252)",
                            borderRadius: "8px",
                          }}
                          labelStyle={{
                            color: "oklch(0.88 0.010 260)",
                            fontSize: "12px",
                          }}
                          itemStyle={{
                            color: "oklch(0.70 0.14 200)",
                            fontSize: "12px",
                          }}
                          formatter={(v: number) => [
                            `₹${v.toLocaleString()}`,
                            "Cost",
                          ]}
                        />
                        <Bar
                          dataKey="cost"
                          fill="oklch(0.48 0.13 200)"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })()}
          </section>

          {/* Today's PM Schedule (for operator) */}
          <section data-ocid="dashboard.section">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.12)",
                    border: "1px solid oklch(0.70 0.188 55 / 0.3)",
                  }}
                >
                  <Cpu
                    className="w-4 h-4"
                    style={{ color: "oklch(0.80 0.180 55)" }}
                  />
                </div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Today's Maintenance Schedule
                </h2>
              </div>
            </div>
            {prioritizedMachineIds.length === 0 && user?.role !== "admin" ? (
              <div
                data-ocid="schedule.empty_state"
                className="industrial-card p-8 text-center"
              >
                <CheckCircle2
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: "oklch(0.60 0.155 145)" }}
                />
                <p className="font-medium">No machines assigned for today.</p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Admin will assign priority machines for today's plan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(user?.role === "admin"
                  ? todayMachines
                  : todayMachines.filter((m) =>
                      prioritizedMachineIds.includes(m.id),
                    )
                ).map((machine, idx) => {
                  const completed = isMachineCompleted(machine.id);
                  const isPriority = prioritizedMachineIds.includes(machine.id);
                  return (
                    <motion.button
                      key={machine.id}
                      data-ocid={`schedule.item.${idx + 1}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMachineClick(machine.id)}
                      className="industrial-card p-4 text-left w-full"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{
                              background: completed
                                ? "oklch(0.45 0.120 145 / 0.25)"
                                : "oklch(0.70 0.188 55 / 0.15)",
                              color: completed
                                ? "oklch(0.75 0.130 145)"
                                : "oklch(0.80 0.180 55)",
                              border: `1px solid ${completed ? "oklch(0.52 0.120 145 / 0.4)" : "oklch(0.70 0.188 55 / 0.3)"}`,
                            }}
                          >
                            {machine.id.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              {machine.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              {machine.department}
                            </div>
                          </div>
                        </div>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: completed
                              ? "oklch(0.45 0.12 145 / 0.2)"
                              : "oklch(0.5 0.16 55 / 0.2)",
                            color: completed
                              ? "oklch(0.75 0.13 145)"
                              : "oklch(0.8 0.14 55)",
                            border: `1px solid ${completed ? "oklch(0.52 0.12 145 / 0.5)" : "oklch(0.55 0.14 55 / 0.5)"}`,
                          }}
                        >
                          {completed ? "Done" : "Pending"}
                        </span>
                      </div>
                      {isPriority && (
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "oklch(0.65 0.18 80 / 0.18)",
                            color: "oklch(0.82 0.18 80)",
                            border: "1px solid oklch(0.65 0.18 80 / 0.35)",
                          }}
                        >
                          ⭐ Priority
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>
        </main>

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

      {/* Set Targets Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
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
              Set Breakdown Targets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {SECTIONS.map((section) => (
              <div
                key={section}
                className="rounded-xl p-4"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  border: "1px solid oklch(0.34 0.030 252)",
                }}
              >
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                >
                  {section}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "bdPct", label: "Target BD% (max)" },
                    { key: "mttr", label: "Target MTTR (hrs, max)" },
                    { key: "mtbf", label: "Target MTBF (hrs, min)" },
                    { key: "uptime", label: "Target Uptime% (min)" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label
                        className="text-xs font-semibold mb-1 block"
                        style={{ color: "oklch(0.60 0.010 260)" }}
                      >
                        {label}
                      </Label>
                      <Input
                        data-ocid="targets.input"
                        type="number"
                        value={
                          targetForm[section as keyof BDTargets][
                            key as keyof (typeof targetForm)[keyof BDTargets]
                          ]
                        }
                        onChange={(e) =>
                          setTargetForm((prev) => ({
                            ...prev,
                            [section]: {
                              ...prev[section as keyof BDTargets],
                              [key]: Number(e.target.value),
                            },
                          }))
                        }
                        style={{
                          background: "oklch(0.165 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                data-ocid="targets.cancel_button"
                variant="outline"
                onClick={() => setShowTargetDialog(false)}
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                Cancel
              </Button>
              <Button
                data-ocid="targets.save_button"
                onClick={handleSaveTargets}
                style={{
                  background: "oklch(0.70 0.188 55 / 0.18)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                Save Targets
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly KPI Report Dialog */}
      <Dialog open={showKPIDialog} onOpenChange={setShowKPIDialog}>
        <DialogContent
          data-ocid="kpi_report.dialog"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
            maxWidth: "480px",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "BricolageGrotesque, sans-serif",
                color: "oklch(0.88 0.010 260)",
              }}
            >
              Generate Monthly KPI Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.60 0.010 260)" }}
                >
                  Month
                </Label>
                <select
                  value={kpiMonth}
                  onChange={(e) => setKpiMonth(Number(e.target.value))}
                  data-ocid="kpi_report.select"
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "oklch(0.165 0.022 252)",
                    border: "1px solid oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                >
                  {MONTH_LABELS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "oklch(0.60 0.010 260)" }}
                >
                  Year
                </Label>
                <select
                  value={kpiYear}
                  onChange={(e) => setKpiYear(Number(e.target.value))}
                  data-ocid="kpi_report.select"
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "oklch(0.165 0.022 252)",
                    border: "1px solid oklch(0.34 0.030 252)",
                    color: "oklch(0.88 0.010 260)",
                  }}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: "oklch(0.55 0.010 260)" }}>
              Generates a printable A4 PDF with all KPIs, graphs, summaries, and
              analytics for the selected month.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowKPIDialog(false)}
                data-ocid="kpi_report.cancel_button"
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.68 0.010 260)",
                }}
              >
                Cancel
              </Button>
              <Button
                data-ocid="kpi_report.confirm_button"
                onClick={() => {
                  setShowKPIDialog(false);
                  generateKPIReport(kpiMonth, kpiYear);
                }}
                style={{
                  background: "oklch(0.48 0.13 200 / 0.25)",
                  color: "oklch(0.70 0.14 200)",
                  border: "1px solid oklch(0.48 0.13 200 / 0.4)",
                }}
              >
                <PrinterIcon className="w-4 h-4 mr-2" /> Generate PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Issue Slip Dialog */}
      <Dialog open={showIssueSlip} onOpenChange={setShowIssueSlip}>
        <DialogContent
          data-ocid="issue_slip.dialog"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
            maxWidth: "700px",
            width: "95vw",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
              Material Issue Slip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label
                className="text-xs whitespace-nowrap"
                style={{ color: "oklch(0.65 0.010 260)" }}
              >
                Date:
              </Label>
              <input
                type="date"
                value={issueSlipDate}
                onChange={(e) => setIssueSlipDate(e.target.value)}
                data-ocid="issue_slip.input"
                className="px-2 py-1 text-xs rounded border"
                style={{
                  background: "oklch(0.165 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                  color: "oklch(0.88 0.010 260)",
                }}
              />
            </div>
            {(() => {
              const rows: Array<{
                date: string;
                workType: string;
                machine: string;
                spareName: string;
                qty: number;
                unit: string;
                cost: number;
                issuedBy: string;
              }> = [];
              for (const bd of breakdownRecords) {
                if (bd.date === issueSlipDate && bd.spareUsed) {
                  for (const s of bd.spareUsed) {
                    rows.push({
                      date: bd.date,
                      workType: "Breakdown",
                      machine: bd.machineName,
                      spareName: s.spareName,
                      qty: s.qty,
                      unit: s.unit,
                      cost: s.cost,
                      issuedBy: bd.operatorName,
                    });
                  }
                }
              }
              for (const pu of pmSpareUsage) {
                if (pu.date === issueSlipDate && pu.spareUsed.length > 0) {
                  for (const s of pu.spareUsed) {
                    rows.push({
                      date: pu.date,
                      workType: pu.workType,
                      machine: pu.machineName,
                      spareName: s.spareName,
                      qty: s.qty,
                      unit: s.unit,
                      cost: s.cost,
                      issuedBy: pu.submittedBy,
                    });
                  }
                }
              }
              const totalCost = rows.reduce((s, r) => s + r.cost, 0);
              return (
                <div>
                  {rows.length === 0 ? (
                    <p
                      className="text-center py-6 text-sm"
                      data-ocid="issue_slip.empty_state"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      No spare usage recorded for this date.
                    </p>
                  ) : (
                    <div
                      className="overflow-x-auto rounded-lg border"
                      style={{ borderColor: "oklch(0.28 0.022 252)" }}
                    >
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "oklch(0.22 0.022 252)" }}>
                            {[
                              "Work Type",
                              "Machine",
                              "Spare Name",
                              "Qty",
                              "Unit",
                              "Cost ₹",
                              "Issued By",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-2 py-2 font-semibold"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr
                              // biome-ignore lint/suspicious/noArrayIndexKey: daily slip rows
                              key={i}
                              data-ocid={`issue_slip.item.${i + 1}`}
                              style={{
                                borderTop: "1px solid oklch(0.28 0.022 252)",
                              }}
                            >
                              <td
                                className="px-2 py-1.5"
                                style={{ color: "oklch(0.80 0.010 260)" }}
                              >
                                {row.workType}
                              </td>
                              <td
                                className="px-2 py-1.5"
                                style={{ color: "oklch(0.80 0.010 260)" }}
                              >
                                {row.machine}
                              </td>
                              <td
                                className="px-2 py-1.5 font-medium"
                                style={{ color: "oklch(0.88 0.010 260)" }}
                              >
                                {row.spareName}
                              </td>
                              <td
                                className="px-2 py-1.5"
                                style={{ color: "oklch(0.88 0.010 260)" }}
                              >
                                {row.qty}
                              </td>
                              <td
                                className="px-2 py-1.5"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {row.unit}
                              </td>
                              <td
                                className="px-2 py-1.5 font-semibold"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                ₹{row.cost.toLocaleString()}
                              </td>
                              <td
                                className="px-2 py-1.5"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {row.issuedBy}
                              </td>
                            </tr>
                          ))}
                          <tr
                            style={{
                              borderTop: "2px solid oklch(0.34 0.030 252)",
                              background: "oklch(0.22 0.022 252)",
                            }}
                          >
                            <td
                              colSpan={5}
                              className="px-2 py-2 text-right font-bold text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Total Cost:
                            </td>
                            <td
                              className="px-2 py-2 font-bold"
                              style={{ color: "oklch(0.80 0.180 55)" }}
                            >
                              ₹{totalCost.toLocaleString()}
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {rows.length > 0 && (
                    <div className="flex gap-2 justify-end mt-3">
                      <Button
                        size="sm"
                        data-ocid="issue_slip.export.button"
                        onClick={() => {
                          if (!XLSX) {
                            toast.error("XLSX not available");
                            return;
                          }
                          const wb = XLSX.utils.book_new();
                          const ws = XLSX.utils.json_to_sheet(
                            rows.map((r) => ({
                              Date: r.date,
                              "Work Type": r.workType,
                              Machine: r.machine,
                              "Spare Name": r.spareName,
                              Qty: r.qty,
                              Unit: r.unit,
                              "Cost (₹)": r.cost,
                              "Issued By": r.issuedBy,
                            })),
                          );
                          XLSX.utils.book_append_sheet(wb, ws, "Issue Slip");
                          XLSX.writeFile(
                            wb,
                            `MaterialIssueSlip_${issueSlipDate}.xlsx`,
                          );
                        }}
                        style={{
                          background: "oklch(0.30 0.060 145 / 0.25)",
                          color: "oklch(0.75 0.13 145)",
                          border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                          fontSize: "12px",
                        }}
                      >
                        Download Excel
                      </Button>
                      <Button
                        size="sm"
                        data-ocid="issue_slip.print_button"
                        onClick={() => window.print()}
                        style={{
                          background: "oklch(0.48 0.13 200 / 0.20)",
                          color: "oklch(0.70 0.14 200)",
                          border: "1px solid oklch(0.48 0.13 200 / 0.4)",
                          fontSize: "12px",
                        }}
                      >
                        Print
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
