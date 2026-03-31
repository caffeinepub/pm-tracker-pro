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
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cpu,
  Download,
  LayoutGrid,
  Lightbulb,
  LogOut,
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

export default function DashboardPage() {
  const {
    user,
    logout,
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
  } = useApp();

  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetForm, setTargetForm] = useState<BDTargets>({ ...bdTargets });

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

  return (
    <>
      <MorningPopup />
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
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  background: "oklch(0.70 0.188 55 / 0.15)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                }}
              >
                <Settings
                  className="w-4 h-4"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                />
              </div>
              <span
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                PM{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>Tracker</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {[
                {
                  label: "Dashboard",
                  page: "dashboard" as const,
                  active: true,
                },
                {
                  label: "Preventive Maintenance",
                  page: "preventive" as const,
                },
                { label: "Breakdown", page: "breakdown-panel" as const },
                { label: "Analysis", page: "analysis" as const },
                { label: "Tasks", page: "task-list" as const },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  data-ocid="nav.link"
                  onClick={() => navigate(item.page)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={
                    item.active
                      ? {
                          background: "oklch(0.70 0.188 55 / 0.15)",
                          color: "oklch(0.80 0.180 55)",
                        }
                      : { color: "oklch(0.68 0.010 260)" }
                  }
                >
                  {item.label}
                </button>
              ))}
              {user?.role === "admin" && (
                <button
                  type="button"
                  data-ocid="nav.link"
                  onClick={() => navigate("admin")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Admin Panel
                </button>
              )}
            </nav>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div
                className="flex items-center gap-2 pl-3"
                style={{ borderLeft: "1px solid oklch(0.34 0.030 252)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.20)",
                    color: "oklch(0.80 0.180 55)",
                  }}
                >
                  {user?.name?.charAt(0) ?? "U"}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium leading-tight">
                    {user?.name}
                  </div>
                  <div
                    className="text-xs capitalize"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    {user?.role}
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="nav.button"
                  onClick={() => logout()}
                  className="ml-2 p-2 rounded-lg hover:bg-white/5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

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
    </>
  );
}
