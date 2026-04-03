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
    electricityMeters,
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

    // Electricity - meter summary for KPI
    const safeReadings = Array.isArray(meterReadings) ? meterReadings : [];
    const safeMeters = Array.isArray(electricityMeters)
      ? electricityMeters
      : [];
    const kpiMeters = safeMeters.filter((m) => m.includeInKpi !== false);
    const electricitySummary = kpiMeters.map((meter) => {
      const mReadings = safeReadings
        .filter((r) => r.meterId === meter.id && isInMonth(r.date))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (mReadings.length === 0)
        return {
          name: meter.name,
          unit: meter.unit,
          firstDate: "-",
          firstReading: 0,
          lastDate: "-",
          lastReading: 0,
          consumption: 0,
          hasData: false,
        };
      const first = mReadings[0];
      const last = mReadings[mReadings.length - 1];
      const firstReading = first.endReading ?? first.startReading ?? 0;
      const lastReading = last.endReading ?? last.startReading ?? 0;
      const consumption = lastReading - firstReading;
      return {
        name: meter.name,
        unit: meter.unit,
        firstDate: first.date,
        firstReading,
        lastDate: last.date,
        lastReading,
        consumption,
        hasData: true,
      };
    });
    const totalElectricityConsumption = electricitySummary.reduce(
      (s, m) => s + (m.hasData ? m.consumption : 0),
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
      const secUptime =
        secCount > 0
          ? (
              (Number(secMtbf) /
                (Number(secMttr === "N/A" ? 0 : secMttr) + Number(secMtbf))) *
              100
            ).toFixed(1)
          : "100.0";
      const secHoursFormatted = secHours.toFixed(1);
      return {
        sec,
        secCount,
        secBdPct,
        secMttr,
        secMtbf,
        tgt,
        secUptime,
        secHoursFormatted,
      };
    });

    // Additional calculations for enhanced KPI report
    const lowStockSpares = safeSpares.filter(
      (s) => s.qtyInStock <= s.minStockLevel,
    ).length;
    const totalInventoryValue = safeSpares.reduce(
      (sum, s) => sum + s.qtyInStock * (s.costPerUnit || 0),
      0,
    );
    const inProcessTasks = safeTasks.filter(
      (t) => t.status === "in-process",
    ).length;
    const totalPredScheduled = safePredict.filter((p) => {
      const d = new Date(p.date);
      return d >= monthStart && d <= monthEnd;
    }).length;
    const pmChartData = MONTH_LABELS.map((ml, idx) => {
      const mNum = BigInt(idx + 1);
      const pl = pmPlans.filter((p) => p.month === mNum).length;
      const ac = pmRecords.filter((r) => {
        const d = new Date(Number(r.completedDate));
        return (
          d.getMonth() === idx &&
          (r.status === "completed" || r.status === "pending-approval")
        );
      }).length;
      return { label: ml, planned: pl, actual: ac };
    });

    // SVG helper functions
    function svgProgressBar(
      value: number,
      max: number,
      color: string,
      width = 340,
      height = 22,
    ): string {
      const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
      const fillW = Math.max(0, (pct / 100) * (width - 2));
      const label = `${pct.toFixed(1)}%`;
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="4" fill="#e8edf4" stroke="#c8d0dc" stroke-width="0.5"/>
  <rect x="1" y="1" width="${fillW}" height="${height - 2}" rx="4" fill="${color}"/>
  <text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${pct > 45 ? "#fff" : "#333"}" font-family="Arial,sans-serif">${label}</text>
</svg>`;
    }

    function svgDonut(pct: number, color: string, size = 70): string {
      const r = (size - 12) / 2;
      const cx = size / 2;
      const cy = size / 2;
      const circ = 2 * Math.PI * r;
      const dash = (Math.min(100, pct) / 100) * circ;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e0e8f0" stroke-width="8"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
    stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}"
    stroke-dashoffset="${(circ / 4).toFixed(1)}" stroke-linecap="round"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${size < 60 ? 9 : 11}" font-weight="700" fill="${color}" font-family="Arial,sans-serif">${pct.toFixed(1)}%</text>
</svg>`;
    }

    function svgBarChart(
      data: { label: string; value: number; color: string }[],
      width = 340,
      height = 100,
    ): string {
      if (data.length === 0) return "";
      const maxVal = Math.max(...data.map((d) => d.value), 1);
      const barW = Math.floor((width - 20) / data.length) - 4;
      const chartH = height - 28;
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${data
    .map((d, i) => {
      const x = 10 + i * (barW + 4);
      const barH = Math.max(2, (d.value / maxVal) * chartH);
      const y = chartH - barH + 4;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${d.color}"/>
  <text x="${x + barW / 2}" y="${y - 2}" text-anchor="middle" font-size="8" fill="#333" font-family="Arial,sans-serif" font-weight="700">${d.value}</text>
  <text x="${x + barW / 2}" y="${height - 4}" text-anchor="middle" font-size="7.5" fill="#666" font-family="Arial,sans-serif">${d.label}</text>`;
    })
    .join("\n  ")}
</svg>`;
    }

    function svgGroupedBarChart(
      data: { label: string; planned: number; actual: number }[],
      width = 520,
      height = 120,
    ): string {
      if (data.length === 0) return "";
      const maxVal = Math.max(...data.flatMap((d) => [d.planned, d.actual]), 1);
      const slotW = Math.floor((width - 20) / data.length);
      const barW = Math.max(4, Math.floor(slotW * 0.35));
      const chartH = height - 30;
      const today = new Date();
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <line x1="10" y1="${chartH + 4}" x2="${width - 10}" y2="${chartH + 4}" stroke="#ccc" stroke-width="0.5"/>
  ${data
    .map((d, i) => {
      const slotX = 10 + i * slotW;
      const cx = slotX + slotW / 2;
      const isFuture = i > today.getMonth();
      const planH = isFuture ? 0 : Math.max(2, (d.planned / maxVal) * chartH);
      const actH = isFuture
        ? 0
        : Math.max(d.actual > 0 ? 2 : 0, (d.actual / maxVal) * chartH);
      const planY = chartH - planH + 4;
      const actY = chartH - actH + 4;
      return `<rect x="${cx - barW - 1}" y="${planY}" width="${barW}" height="${planH}" rx="1" fill="#3b82f6" opacity="0.85"/>
  <rect x="${cx + 1}" y="${actY}" width="${barW}" height="${actH}" rx="1" fill="#22c55e" opacity="0.85"/>
  ${!isFuture && d.planned > 0 ? `<text x="${cx - barW / 2 - 1}" y="${planY - 2}" text-anchor="middle" font-size="7" fill="#3b82f6" font-family="Arial,sans-serif">${d.planned}</text>` : ""}
  ${!isFuture && d.actual > 0 ? `<text x="${cx + barW / 2 + 1}" y="${actY - 2}" text-anchor="middle" font-size="7" fill="#22c55e" font-family="Arial,sans-serif">${d.actual}</text>` : ""}
  <text x="${cx}" y="${height - 6}" text-anchor="middle" font-size="7" fill="#555" font-family="Arial,sans-serif">${d.label}</text>`;
    })
    .join("\n  ")}
  <rect x="${width - 110}" y="4" width="8" height="8" fill="#3b82f6" rx="1"/>
  <text x="${width - 99}" y="12" font-size="8" fill="#3b82f6" font-family="Arial,sans-serif">Planned</text>
  <rect x="${width - 55}" y="4" width="8" height="8" fill="#22c55e" rx="1"/>
  <text x="${width - 44}" y="12" font-size="8" fill="#22c55e" font-family="Arial,sans-serif">Actual</text>
</svg>`;
    }

    const genDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    } as Intl.DateTimeFormatOptions);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Monthly KPI Report — ${monthLabel} ${year}</title>
<style>
@page { size: A4; margin: 10mm 10mm 12mm 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a2e; background: #f4f6fa; }
@media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
.cover { background: linear-gradient(135deg, #0d2137, #1a3a5c, #2d6a9f); color: white; padding: 20px 24px 18px; border-radius: 8px; margin-bottom: 18px; }
.cover-brand { font-size: 9px; letter-spacing: 3px; opacity: 0.7; text-transform: uppercase; margin-bottom: 4px; }
.cover-title { font-size: 22px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
.cover-month { font-size: 14px; font-weight: 600; color: #f6c90e; margin-top: 4px; }
.cover-date { font-size: 8.5px; opacity: 0.6; margin-top: 5px; }
.cover-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 14px; }
.cs-item { background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px 6px; text-align: center; border: 1px solid rgba(255,255,255,0.15); }
.cs-val { font-size: 16px; font-weight: 800; color: #f6c90e; line-height: 1; }
.cs-lbl { font-size: 7.5px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.sec-wrap { margin-bottom: 16px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.sec-hdr { color: white; padding: 8px 14px; display: flex; align-items: center; gap: 10px; }
.sec-num { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.25); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.sec-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; }
.sec-body { background: #fff; padding: 12px 14px; border: 1px solid rgba(0,0,0,0.07); border-top: none; }
.hdr-red { background: linear-gradient(135deg, #c0392b, #e74c3c); }
.hdr-blue { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); }
.hdr-green { background: linear-gradient(135deg, #1e8449, #27ae60); }
.hdr-teal { background: linear-gradient(135deg, #0e7490, #0891b2); }
.hdr-purple { background: linear-gradient(135deg, #6b21a8, #9333ea); }
.hdr-amber { background: linear-gradient(135deg, #b45309, #d97706); }
.hdr-cyan { background: linear-gradient(135deg, #0e7490, #06b6d4); }
.hdr-indigo { background: linear-gradient(135deg, #3730a3, #4f46e5); }
.hdr-olive { background: linear-gradient(135deg, #3d5a1a, #65a30d); }
.hdr-orange { background: linear-gradient(135deg, #c2410c, #ea580c); }
.kpi-grid { display: grid; gap: 8px; }
.kpi-grid-4 { grid-template-columns: repeat(4, 1fr); }
.kpi-grid-6 { grid-template-columns: repeat(6, 1fr); }
.kpi-grid-3 { grid-template-columns: repeat(3, 1fr); }
.kpi-grid-2 { grid-template-columns: repeat(2, 1fr); }
.kpi-grid-5 { grid-template-columns: repeat(5, 1fr); }
.kpi-card { border-radius: 6px; padding: 9px 10px 8px; border: 1px solid #e0e8f0; }
.kpi-sub { font-size: 7.5px; color: #999; margin-top: 2px; }
.kpi-lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
.kpi-val { font-size: 21px; font-weight: 800; line-height: 1.1; margin-top: 2px; }
.m-blue { background: #eff6ff; border-left: 3px solid #2563eb; }
.m-blue .kpi-lbl { color: #1e40af; }
.m-blue .kpi-val { color: #1d4ed8; }
.m-green { background: #f0fdf4; border-left: 3px solid #16a34a; }
.m-green .kpi-lbl { color: #166534; }
.m-green .kpi-val { color: #15803d; }
.m-red { background: #fef2f2; border-left: 3px solid #dc2626; }
.m-red .kpi-lbl { color: #991b1b; }
.m-red .kpi-val { color: #b91c1c; }
.m-amber { background: #fffbeb; border-left: 3px solid #d97706; }
.m-amber .kpi-lbl { color: #92400e; }
.m-amber .kpi-val { color: #b45309; }
.m-teal { background: #f0fdfa; border-left: 3px solid #0d9488; }
.m-teal .kpi-lbl { color: #134e4a; }
.m-teal .kpi-val { color: #0f766e; }
.m-purple { background: #faf5ff; border-left: 3px solid #9333ea; }
.m-purple .kpi-lbl { color: #581c87; }
.m-purple .kpi-val { color: #7e22ce; }
.m-gray { background: #f9fafb; border-left: 3px solid #6b7280; }
.m-gray .kpi-lbl { color: #374151; }
.m-gray .kpi-val { color: #4b5563; }
.m-indigo { background: #eef2ff; border-left: 3px solid #4f46e5; }
.m-indigo .kpi-lbl { color: #312e81; }
.m-indigo .kpi-val { color: #4338ca; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; }
th { color: #fff; padding: 6px 8px; text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
td { padding: 5px 8px; border-bottom: 1px solid #e8eef8; vertical-align: middle; }
tr:nth-child(even) td { background: #f8faff; }
.th-red { background: #b91c1c; }
.th-blue { background: #1e40af; }
.th-green { background: #166534; }
.th-teal { background: #0f766e; }
.th-purple { background: #6d28d9; }
.th-amber { background: #b45309; }
.th-cyan { background: #0e7490; }
.th-indigo { background: #3730a3; }
.th-olive { background: #3d5a1a; }
.badge-ok { background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 10px; font-size: 8px; font-weight: 700; }
.badge-low { background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 10px; font-size: 8px; font-weight: 700; }
.badge-tgt-ok { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 700; }
.badge-tgt-bad { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 700; }
.infobox { background: #eff6ff; border-left: 3px solid #2563eb; border-radius: 4px; padding: 8px 12px; margin-top: 10px; font-size: 9.5px; color: #1e40af; }
.chart-row { display: flex; align-items: flex-start; gap: 14px; margin-top: 10px; }
.chart-col { flex: 1; }
.donut-item { text-align: center; }
.donut-lbl { font-size: 8px; color: #555; margin-top: 3px; font-weight: 600; text-transform: uppercase; }
.footer { margin-top: 18px; border-top: 3px solid #1a3a5c; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #666; }
.footer-left { font-weight: 700; color: #1a3a5c; }
.footer-right { text-align: right; }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-brand">Plant Maintenance Management System</div>
  <div class="cover-title">Monthly KPI Report</div>
  <div class="cover-month">${monthLabel} ${year}</div>
  <div class="cover-date">Generated: ${genDate}</div>
  <div class="cover-stats">
    <div class="cs-item"><div class="cs-val">${totalBdCount}</div><div class="cs-lbl">BD Count</div></div>
    <div class="cs-item"><div class="cs-val">${uptime}%</div><div class="cs-lbl">Uptime</div></div>
    <div class="cs-item"><div class="cs-val">${pmPct}%</div><div class="cs-lbl">PM Done</div></div>
    <div class="cs-item"><div class="cs-val">${kaizenSubmitted}</div><div class="cs-lbl">Kaizens</div></div>
    <div class="cs-item"><div class="cs-val">&#8377;${(totalCost / 1000).toFixed(1)}k</div><div class="cs-lbl">Maint Cost</div></div>
    <div class="cs-item"><div class="cs-val">${unplannedPct}%</div><div class="cs-lbl">Unplanned</div></div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-red"><span class="sec-num">1</span><span class="sec-title">Breakdown Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-6">
      <div class="kpi-card m-red"><div class="kpi-lbl">BD Count</div><div class="kpi-val">${totalBdCount}</div><div class="kpi-sub">breakdowns this month</div></div>
      <div class="kpi-card m-red"><div class="kpi-lbl">BD Hours</div><div class="kpi-val">${totalBdHours.toFixed(1)}</div><div class="kpi-sub">total hours lost</div></div>
      <div class="kpi-card m-amber"><div class="kpi-lbl">BD%</div><div class="kpi-val">${bdPct}%</div><div class="kpi-sub">of available hours</div></div>
      <div class="kpi-card m-green"><div class="kpi-lbl">Uptime%</div><div class="kpi-val">${uptime}%</div><div class="kpi-sub">plant availability</div></div>
      <div class="kpi-card m-blue"><div class="kpi-lbl">MTTR (h)</div><div class="kpi-val">${mttr}</div><div class="kpi-sub">mean time to repair</div></div>
      <div class="kpi-card m-teal"><div class="kpi-lbl">MTBF (h)</div><div class="kpi-val">${mtbf}</div><div class="kpi-sub">mean time between</div></div>
    </div>
    <div class="chart-row">
      <div class="chart-col">
        <div style="font-size:9px;font-weight:700;color:#555;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">BD% vs Threshold</div>
        ${svgProgressBar(Number.parseFloat(bdPct), 100, "#dc2626", 260, 20)}
        <div style="margin-top:6px;font-size:9px;font-weight:700;color:#555;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Uptime %</div>
        ${svgProgressBar(Number.parseFloat(uptime), 100, "#16a34a", 260, 20)}
        <div style="margin-top:6px;font-size:9px;font-weight:700;color:#555;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">BD Hours vs Available</div>
        ${svgProgressBar(totalBdHours, maxAvailHrs, "#f59e0b", 260, 20)}
      </div>
      <div style="display:flex;gap:16px;align-items:center;padding-left:10px;padding-top:4px;">
        <div class="donut-item">${svgDonut(Number.parseFloat(uptime), "#16a34a", 72)}<div class="donut-lbl">Uptime</div></div>
        <div class="donut-item">${svgDonut(Math.min(100, Number.parseFloat(bdPct) > 0 ? 100 - Number.parseFloat(bdPct) : 100), "#0d9488", 72)}<div class="donut-lbl">Avail.</div></div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:8.5px;color:#666;">Available Working Hours: <strong>${maxAvailHrs.toFixed(0)} h</strong> (highest section value)</div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-blue"><span class="sec-num">2</span><span class="sec-title">Analysis — Section KPIs</span></div>
  <div class="sec-body">
    <table>
      <thead><tr>
        <th class="th-blue">Section</th>
        <th class="th-blue">BD Count</th>
        <th class="th-blue">BD Hours</th>
        <th class="th-blue">BD%</th>
        <th class="th-blue">MTTR (h)</th>
        <th class="th-blue">MTBF (h)</th>
        <th class="th-blue">Uptime%</th>
        <th class="th-blue">Target BD%</th>
        <th class="th-blue">Target Uptime%</th>
        <th class="th-blue">Status</th>
      </tr></thead>
      <tbody>
        ${sectionRows
          .map((s) => {
            const bdOk = s.tgt?.bdPct
              ? Number.parseFloat(s.secBdPct) <=
                Number.parseFloat(String(s.tgt.bdPct))
              : true;
            const upOk = s.tgt?.uptime
              ? Number.parseFloat(s.secUptime) >=
                Number.parseFloat(String(s.tgt.uptime))
              : true;
            const overall = bdOk && upOk;
            return `<tr>
            <td><strong>${s.sec}</strong></td>
            <td style="text-align:center">${s.secCount}</td>
            <td style="text-align:center">${s.secHoursFormatted}</td>
            <td><span class="${Number.parseFloat(s.secBdPct) > (s.tgt?.bdPct ? Number.parseFloat(String(s.tgt.bdPct)) : 999) ? "badge-tgt-bad" : "badge-tgt-ok"}">${s.secBdPct}%</span></td>
            <td>${s.secMttr}</td>
            <td>${s.secMtbf}</td>
            <td><span class="${Number.parseFloat(s.secUptime) < (s.tgt?.uptime ? Number.parseFloat(String(s.tgt.uptime)) : 0) ? "badge-tgt-bad" : "badge-tgt-ok"}">${s.secUptime}%</span></td>
            <td>${s.tgt?.bdPct ?? "—"}%</td>
            <td>${s.tgt?.uptime ?? "—"}%</td>
            <td><span class="${overall ? "badge-ok" : "badge-low"}">${overall ? "✓ ON TARGET" : "⚠ OFF TARGET"}</span></td>
          </tr>
          <tr style="background:#fafcff">
            <td colspan="10" style="padding:4px 8px 6px 12px">
              <div style="font-size:8px;color:#666;margin-bottom:2px;font-weight:600;">BD% Progress</div>
              ${svgProgressBar(Number.parseFloat(s.secBdPct), 100, "#dc2626", 480, 16)}
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-green"><span class="sec-num">3</span><span class="sec-title">Preventive Maintenance Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-4">
      <div class="kpi-card m-green"><div class="kpi-lbl">Planned PM</div><div class="kpi-val">${plannedPM}</div><div class="kpi-sub">machines scheduled</div></div>
      <div class="kpi-card m-green"><div class="kpi-lbl">Completed PM</div><div class="kpi-val">${completedPM}</div><div class="kpi-sub">executed this month</div></div>
      <div class="kpi-card m-blue"><div class="kpi-lbl">Completion %</div><div class="kpi-val">${pmPct}%</div><div class="kpi-sub">of planned</div></div>
      <div class="kpi-card m-amber"><div class="kpi-lbl">Pending Approvals</div><div class="kpi-val">${pendingPMApprovals}</div><div class="kpi-sub">awaiting admin review</div></div>
    </div>
    <div style="margin-top:12px;">
      <div style="font-size:9px;font-weight:700;color:#166534;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">PM Completion Rate</div>
      ${svgProgressBar(completedPM, Math.max(plannedPM, 1), "#16a34a", 520, 22)}
    </div>
    <div style="margin-top:12px;">
      <div style="font-size:9px;font-weight:700;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">PM Planned vs Actual — Monthly Trend (${year})</div>
      ${svgGroupedBarChart(pmChartData, 520, 110)}
    </div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-teal"><span class="sec-num">4</span><span class="sec-title">Predictive Maintenance Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-4">
      <div class="kpi-card m-teal"><div class="kpi-lbl">Scheduled</div><div class="kpi-val">${totalPredScheduled}</div><div class="kpi-sub">this month</div></div>
      <div class="kpi-card m-green"><div class="kpi-lbl">Completed</div><div class="kpi-val">${monthPredComplete}</div><div class="kpi-sub">readings submitted</div></div>
      <div class="kpi-card m-amber"><div class="kpi-lbl">Pending Approval</div><div class="kpi-val">${monthPredPending}</div><div class="kpi-sub">awaiting admin</div></div>
      <div class="kpi-card m-blue"><div class="kpi-lbl">Completion %</div><div class="kpi-val">${totalPredScheduled > 0 ? ((monthPredComplete / totalPredScheduled) * 100).toFixed(1) : "0.0"}%</div><div class="kpi-sub">of scheduled</div></div>
    </div>
    <div style="margin-top:10px;">
      <div style="font-size:9px;font-weight:700;color:#0f766e;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Completion Rate</div>
      ${svgProgressBar(monthPredComplete, Math.max(totalPredScheduled, 1), "#0d9488", 400, 20)}
    </div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-purple"><span class="sec-num">5</span><span class="sec-title">Tasks / Planner Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-5">
      <div class="kpi-card m-gray"><div class="kpi-lbl">Total Tasks</div><div class="kpi-val">${totalTasks}</div><div class="kpi-sub">all tasks</div></div>
      <div class="kpi-card m-green"><div class="kpi-lbl">Completed</div><div class="kpi-val">${completedTasks}</div><div class="kpi-sub">done</div></div>
      <div class="kpi-card m-blue"><div class="kpi-lbl">In Process</div><div class="kpi-val">${inProcessTasks}</div><div class="kpi-sub">active</div></div>
      <div class="kpi-card m-amber"><div class="kpi-lbl">Pending</div><div class="kpi-val">${pendingTasks}</div><div class="kpi-sub">not started / hold</div></div>
      <div class="kpi-card m-red"><div class="kpi-lbl">High Priority</div><div class="kpi-val">${highPriTasks}</div><div class="kpi-sub">urgent tasks</div></div>
    </div>
    <div class="chart-row">
      <div>
        <div style="font-size:9px;font-weight:700;color:#6d28d9;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Completion Rate</div>
        ${svgProgressBar(completedTasks, Math.max(totalTasks, 1), "#9333ea", 300, 20)}
      </div>
      <div style="flex:1;">
        ${svgBarChart(
          [
            { label: "Done", value: completedTasks, color: "#22c55e" },
            { label: "In Proc.", value: inProcessTasks, color: "#3b82f6" },
            { label: "Pending", value: pendingTasks, color: "#f59e0b" },
            { label: "Hi-Pri", value: highPriTasks, color: "#ef4444" },
          ],
          220,
          90,
        )}
      </div>
    </div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-amber"><span class="sec-num">6</span><span class="sec-title">Kaizen &amp; Improvement Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-3">
      <div class="kpi-card m-gray"><div class="kpi-lbl">Submitted</div><div class="kpi-val">${kaizenSubmitted}</div><div class="kpi-sub">total this month</div></div>
      <div class="kpi-card m-green"><div class="kpi-lbl">Approved</div><div class="kpi-val">${kaizenApproved}</div><div class="kpi-sub">approved / closed</div></div>
      <div class="kpi-card m-amber"><div class="kpi-lbl">Pending</div><div class="kpi-val">${kaizenPending}</div><div class="kpi-sub">awaiting approval</div></div>
    </div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-orange"><span class="sec-num">7</span><span class="sec-title">Unplanned Maintenance Ratio</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-3" style="margin-bottom:10px;">
      <div class="kpi-card m-red"><div class="kpi-lbl">Unplanned Ratio</div><div class="kpi-val">${unplannedPct}%</div><div class="kpi-sub">breakdown vs planned</div></div>
      <div class="kpi-card m-gray"><div class="kpi-lbl">BD Count (Month)</div><div class="kpi-val">${totalBdCount}</div><div class="kpi-sub">total breakdowns</div></div>
      <div class="kpi-card m-blue"><div class="kpi-lbl">Planned PM + Predictive</div><div class="kpi-val">${totalPlanned}</div><div class="kpi-sub">total planned activities</div></div>
    </div>
    <div class="infobox" style="background:#fff7ed;border-left-color:#ea580c;">
      <strong>Formula:</strong> Unplanned Ratio = BD Count <strong>(${totalBdCount})</strong> &divide; Total Planned PM+Predictive <strong>(${totalPlanned})</strong> &times; 100 = <strong>${unplannedPct}%</strong>
    </div>
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-cyan"><span class="sec-num">8</span><span class="sec-title">Electricity Consumption &mdash; ${monthLabel} ${year}</span></div>
  <div class="sec-body">
    ${
      electricitySummary.length === 0
        ? '<p style="color:#888;font-style:italic;font-size:10px;">No meters configured or selected for KPI report.</p>'
        : `<table>
          <thead><tr>
            <th class="th-cyan">Meter Name</th>
            <th class="th-cyan">1st Reading Date</th>
            <th class="th-cyan">1st Reading</th>
            <th class="th-cyan">Last Reading Date</th>
            <th class="th-cyan">Last Reading</th>
            <th class="th-cyan">Monthly Consumption</th>
            <th class="th-cyan">Unit</th>
          </tr></thead>
          <tbody>
            ${electricitySummary
              .map(
                (m) => `<tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.firstDate}</td>
              <td>${m.hasData ? m.firstReading : "—"}</td>
              <td>${m.lastDate}</td>
              <td>${m.hasData ? m.lastReading : "—"}</td>
              <td><strong>${m.hasData ? m.consumption.toFixed(2) : "—"}</strong></td>
              <td>${m.unit}</td>
            </tr>`,
              )
              .join("")}
            <tr style="background:#e0f2fe;font-weight:800;">
              <td colspan="5" style="text-align:right;color:#0e7490;font-size:10px;">Total Consumption:</td>
              <td style="color:#0e7490;font-size:12px;">${totalElectricityConsumption.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>`
    }
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-indigo"><span class="sec-num">9</span><span class="sec-title">Spares / Stock Summary</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-3" style="margin-bottom:10px;">
      <div class="kpi-card m-indigo"><div class="kpi-lbl">Total Spare Items</div><div class="kpi-val">${safeSpares.length}</div><div class="kpi-sub">in spare master list</div></div>
      <div class="kpi-card m-red"><div class="kpi-lbl">Low Stock Items</div><div class="kpi-val">${lowStockSpares}</div><div class="kpi-sub">at or below min level</div></div>
      <div class="kpi-card" style="background:#ecfdf5;border-left:3px solid #059669;border-radius:6px;padding:9px 10px 8px;border:1px solid #e0e8f0;"><div class="kpi-lbl" style="font-size:8px;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;color:#065f46;">Total Inventory Value</div><div class="kpi-val" style="font-size:21px;font-weight:800;line-height:1.1;margin-top:2px;color:#059669;">&#8377;${totalInventoryValue.toLocaleString()}</div><div class="kpi-sub" style="font-size:7.5px;color:#999;margin-top:2px;">stock qty &times; cost per unit</div></div>
    </div>
    ${
      safeSpares.length === 0
        ? '<p style="color:#888;font-style:italic;font-size:10px;">No spares in master list.</p>'
        : `<table>
          <thead><tr>
            <th class="th-indigo">Part Name</th>
            <th class="th-indigo">Specification</th>
            <th class="th-indigo">Qty in Stock</th>
            <th class="th-indigo">Min Level</th>
            <th class="th-indigo">Unit</th>
            <th class="th-indigo">Cost / Unit</th>
            <th class="th-indigo">Stock Value</th>
            <th class="th-indigo">Machine / Section</th>
            <th class="th-indigo">Status</th>
          </tr></thead>
          <tbody>
            ${safeSpares
              .map(
                (s) => `<tr>
              <td><strong>${s.partName}</strong></td>
              <td>${s.partSpec || "—"}</td>
              <td style="text-align:center;font-weight:700;">${s.qtyInStock}</td>
              <td style="text-align:center;">${s.minStockLevel}</td>
              <td>${s.unit}</td>
              <td>&#8377;${s.costPerUnit}</td>
              <td style="text-align:right;font-weight:700;color:#059669;">&#8377;${(s.qtyInStock * (s.costPerUnit || 0)).toLocaleString()}</td>
              <td>${s.applicableMachineSection || "—"}</td>
              <td><span class="${s.qtyInStock <= s.minStockLevel ? "badge-low" : "badge-ok"}">${s.qtyInStock <= s.minStockLevel ? "&#9888; LOW STOCK" : "&#10003; OK"}</span></td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
    }
  </div>
</div>

<div class="sec-wrap">
  <div class="sec-hdr hdr-olive"><span class="sec-num">10</span><span class="sec-title">Maintenance Cost &mdash; ${monthLabel} ${year}</span></div>
  <div class="sec-body">
    <div class="kpi-grid kpi-grid-2" style="margin-bottom:10px;">
      <div class="kpi-card" style="background:#f7fee7;border-left:3px solid #65a30d;border-radius:6px;padding:9px 10px 8px;border:1px solid #e0e8f0;"><div class="kpi-lbl" style="font-size:8px;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;color:#3f6212;">Total Maintenance Cost</div><div class="kpi-val" style="font-size:21px;font-weight:800;line-height:1.1;margin-top:2px;color:#4d7c0f;">&#8377;${totalCost.toLocaleString()}</div><div class="kpi-sub" style="font-size:7.5px;color:#999;margin-top:2px;">all spare usage this month</div></div>
      <div class="kpi-card m-gray"><div class="kpi-lbl">Spare Entries</div><div class="kpi-val">${allSpareUsage.length}</div><div class="kpi-sub">activities with spares used</div></div>
    </div>
    ${
      allSpareUsage.length === 0
        ? '<p style="color:#888;font-style:italic;font-size:10px;">No spare usage recorded for this month.</p>'
        : `<table>
          <thead><tr>
            <th class="th-olive">Date</th>
            <th class="th-olive">Work Type</th>
            <th class="th-olive">Machine</th>
            <th class="th-olive">Spare Name</th>
            <th class="th-olive">Qty</th>
            <th class="th-olive">Cost (&#8377;)</th>
          </tr></thead>
          <tbody>
            ${allSpareUsage
              .map(
                (r) => `<tr>
              <td>${r.date}</td>
              <td>${r.type}</td>
              <td>${r.machine}</td>
              <td>${r.name}</td>
              <td style="text-align:center;">${r.qty}</td>
              <td style="text-align:right;font-weight:700;">&#8377;${r.cost.toLocaleString()}</td>
            </tr>`,
              )
              .join("")}
            <tr style="background:#ecfccb;font-weight:800;">
              <td colspan="5" style="text-align:right;color:#3f6212;font-size:10px;">Total Cost:</td>
              <td style="text-align:right;color:#3f6212;font-size:13px;">&#8377;${totalCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>`
    }
  </div>
</div>

<div class="footer">
  <div class="footer-left">
    <div>Plant Maintenance Management System</div>
    <div style="font-weight:400;color:#888;font-size:8.5px;margin-top:2px;">Monthly KPI Report &mdash; ${monthLabel} ${year}</div>
  </div>
  <div class="footer-right">
    <div>Generated: ${genDate}</div>
    <div style="color:#aaa;font-size:8px;margin-top:2px;">PMMS &mdash; Confidential</div>
  </div>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=1100,height=850");
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
              const pendingPredictive = (
                Array.isArray(predictiveRecords) ? predictiveRecords : []
              ).filter((r) => r.status === "pending-approval").length;
              const total =
                pendingPM +
                pendingBD +
                pendingKaizen +
                pendingTaskStatus +
                pendingPredictive;
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                      {
                        label: "Predictive",
                        count: pendingPredictive,
                        page: "predictive" as const,
                        color: "oklch(0.72 0.15 175)",
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
