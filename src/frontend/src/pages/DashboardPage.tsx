import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  LayoutGrid,
  LogOut,
  Server,
  Settings,
  Shield,
  Wifi,
  Wrench,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import { useApp } from "../context/AppContext";
import { exportAllDataToExcel } from "../lib/exportExcel";

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
      className={`${colorClass} rounded-xl p-5 flex items-start justify-between`}
    >
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "oklch(0.75 0.008 260 / 0.85)" }}
        >
          {title}
        </p>
        <p
          className="text-4xl font-bold tracking-tight"
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
        className="p-2.5 rounded-lg"
        style={{ background: "oklch(1 0 0 / 0.10)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "oklch(0.96 0.004 260)" }} />
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
              {p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function formatStatusLabel(status: string): string {
  if (status === "pending-approval") return "Waiting Approval";
  if (status === "completed") return "Completed";
  if (status === "rejected") return "Rejected";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: string): string {
  if (status === "completed") return "status-completed";
  if (status === "rejected") return "status-rejected";
  return "status-pending";
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
    capaRecords,
    prioritizedMachineIds,
  } = useApp();

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthBig = BigInt(currentMonth);

  const todayPlans = useMemo(
    () => pmPlans.filter((p) => p.month === currentMonthBig),
    [pmPlans, currentMonthBig],
  );

  const todayMachines = useMemo(
    () => machines.filter((m) => todayPlans.some((p) => p.machineId === m.id)),
    [machines, todayPlans],
  );

  const sortedTodayMachines = useMemo(() => {
    return [...todayMachines].sort((a, b) => {
      const aPrio = prioritizedMachineIds.includes(a.id) ? 0 : 1;
      const bPrio = prioritizedMachineIds.includes(b.id) ? 0 : 1;
      return aPrio - bPrio;
    });
  }, [todayMachines, prioritizedMachineIds]);

  const completedCount = useMemo(
    () => todayMachines.filter((m) => isMachineCompleted(m.id)).length,
    [todayMachines, isMachineCompleted],
  );

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

  const completionPct =
    todayMachines.length > 0
      ? Math.round((completedCount / todayMachines.length) * 100)
      : 0;

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
    toast.success("Report downloaded! Check your downloads folder.");
  };

  const recentActivity = useMemo(
    () =>
      [...pmRecords]
        .sort((a, b) => Number(b.completedDate) - Number(a.completedDate))
        .slice(0, 5),
    [pmRecords],
  );

  const pendingApprovals = useMemo(
    () => pmRecords.filter((r) => r.status === "pending-approval"),
    [pmRecords],
  );

  const pendingBreakdownApprovals = useMemo(
    () => breakdownRecords.filter((r) => r.status === "pending-approval"),
    [breakdownRecords],
  );

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const pmRecordsToday = useMemo(
    () =>
      pmRecords.filter((r) => {
        const d = new Date(Number(r.completedDate));
        d.setHours(0, 0, 0, 0);
        return d.getTime() === todayMidnight;
      }).length,
    [pmRecords, todayMidnight],
  );

  const pendingThisMonth = useMemo(
    () => todayMachines.filter((m) => !isMachineCompleted(m.id)).length,
    [todayMachines, isMachineCompleted],
  );

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
              <button
                type="button"
                data-ocid="nav.link"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "oklch(0.70 0.188 55 / 0.15)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                Dashboard
              </button>
              <button
                type="button"
                data-ocid="nav.link"
                onClick={() => navigate("preventive")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                PM
              </button>
              <button
                type="button"
                data-ocid="nav.link"
                onClick={() => navigate("breakdown-panel")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Breakdown
              </button>
              <button
                type="button"
                data-ocid="nav.link"
                onClick={() => navigate("analysis")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Analysis
              </button>
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
                  onClick={() => {
                    logout();
                  }}
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
          className="relative h-36 md:h-44 flex items-center"
          style={{
            backgroundImage:
              "url('/assets/generated/factory-bg.dim_1920x600.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(11,18,32,0.92) 0%, rgba(11,18,32,0.75) 100%)",
            }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "oklch(0.80 0.180 55)" }}
              >
                {todayLabel}
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Welcome, {user?.name?.split(" ")[0]}! 👋
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "oklch(0.75 0.008 260)" }}
              >
                Here's your PM overview for today — {todayMachines.length}{" "}
                machines scheduled.
              </p>
            </motion.div>
          </div>
          <div className="absolute right-6 bottom-4 hidden md:flex items-center gap-2">
            <Shield
              className="w-4 h-4"
              style={{ color: "oklch(0.80 0.180 55 / 0.6)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.80 0.180 55 / 0.6)" }}
            >
              SYSTEM ACTIVE
            </span>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20 md:pb-0">
          {/* KPI + Chart grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
            {/* KPI cards 2x2 */}
            <div className="xl:col-span-1 grid grid-cols-2 gap-4">
              <KPICard
                title="Total Machines"
                value={machines.length}
                subtitle="In system"
                icon={Cpu}
                colorClass="kpi-steel-blue"
                index={0}
              />
              <KPICard
                title="Today Planned"
                value={todayMachines.length}
                subtitle={`Month ${MONTHS[currentMonth - 1]}`}
                icon={BarChart2}
                colorClass="kpi-blue"
                index={1}
              />
              <KPICard
                title="Completed"
                value={completedCount}
                subtitle="Today"
                icon={CheckCircle2}
                colorClass="kpi-green"
                index={2}
              />
              <KPICard
                title="PM Completion"
                value={`${completionPct}%`}
                subtitle="Monthly rate"
                icon={Clock}
                colorClass="kpi-orange"
                index={3}
              />
            </div>

            {/* Plan vs Actual Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="xl:col-span-2 industrial-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                  >
                    Plan vs Actual
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    Monthly PM completion — {new Date().getFullYear()}
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
            </motion.div>
          </div>

          {/* Module Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid
                className="w-4 h-4"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Report Breakdown",
                  icon: AlertTriangle,
                  color: "oklch(0.72 0.170 27)",
                  bg: "oklch(0.62 0.220 25 / 0.12)",
                  border: "oklch(0.62 0.220 25 / 0.3)",
                  page: "breakdown-panel" as const,
                },
                ...(user?.role === "admin"
                  ? [
                      {
                        label: "Breakdown",
                        icon: Shield,
                        color: "oklch(0.80 0.180 55)",
                        bg: "oklch(0.70 0.188 55 / 0.12)",
                        border: "oklch(0.70 0.188 55 / 0.3)",
                        page: "breakdown-panel" as const,
                      },
                      {
                        label: "Analysis",
                        icon: Activity,
                        color: "oklch(0.65 0.150 232)",
                        bg: "oklch(0.50 0.065 232 / 0.12)",
                        border: "oklch(0.50 0.065 232 / 0.3)",
                        page: "analysis" as const,
                      },
                      {
                        label: "PM Plans",
                        icon: BarChart2,
                        color: "oklch(0.75 0.130 145)",
                        bg: "oklch(0.45 0.120 145 / 0.12)",
                        border: "oklch(0.52 0.120 145 / 0.3)",
                        page: "preventive" as const,
                      },
                      {
                        label: "Approvals",
                        icon: CheckCircle2,
                        color: "oklch(0.82 0.16 60)",
                        bg: "oklch(0.55 0.15 60 / 0.12)",
                        border: "oklch(0.70 0.15 60 / 0.3)",
                        page: "preventive" as const,
                      },
                      {
                        label: "Upload Data",
                        icon: Download,
                        color: "oklch(0.68 0.010 260)",
                        bg: "oklch(0.34 0.030 252 / 0.3)",
                        border: "oklch(0.40 0.030 252)",
                        page: "admin" as const,
                      },
                    ]
                  : []),
              ].map((item) => (
                <motion.button
                  key={item.label}
                  type="button"
                  whileHover={{ scale: 1.03, translateY: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(item.page)}
                  className="industrial-card p-4 text-left flex items-center gap-3 cursor-pointer"
                  style={{
                    border: `1px solid ${item.border}`,
                    background: item.bg,
                  }}
                  data-ocid={`quickaction.${item.label.toLowerCase().replace(/\s+/g, "_")}.button`}
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
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </div>
                    <ChevronRight
                      className="w-3 h-3 mt-0.5"
                      style={{ color: "oklch(0.50 0.010 260)" }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Breakdown Analytics - New */}
          {(breakdownRecords.filter((r) => r.status === "approved-breakdown")
            .length > 0 ||
            user?.role === "admin") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Wrench
                  className="w-4 h-4"
                  style={{ color: "oklch(0.75 0.200 25)" }}
                />
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Breakdown Analytics
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  {
                    label: "Total Breakdowns",
                    value: breakdownRecords.filter(
                      (r) => r.status === "approved-breakdown",
                    ).length,
                    color: "oklch(0.72 0.170 27)",
                  },
                  {
                    label: "Open CAPAs",
                    value: capaRecords.filter((c) => c.status === "Open")
                      .length,
                    color: "oklch(0.75 0.170 55)",
                  },
                  {
                    label: "MTTR (avg min)",
                    value: (() => {
                      const bd = breakdownRecords.filter(
                        (r) =>
                          r.status === "approved-breakdown" &&
                          r.durationMinutes > 0,
                      );
                      return bd.length
                        ? Math.round(
                            bd.reduce((s, r) => s + r.durationMinutes, 0) /
                              bd.length,
                          )
                        : "-";
                    })(),
                    color: "oklch(0.65 0.150 232)",
                  },
                  {
                    label: "Uptime %",
                    value: (() => {
                      const totalMins = breakdownRecords
                        .filter((r) => r.status === "approved-breakdown")
                        .reduce((s, r) => s + r.durationMinutes, 0);
                      const totalAvail = 30 * 8 * 60;
                      return `${Math.max(0, Math.round((1 - totalMins / totalAvail) * 100))}%`;
                    })(),
                    color: "oklch(0.60 0.155 145)",
                  },
                ].map((item) => (
                  <div key={item.label} className="industrial-card p-3">
                    <div
                      className="text-xs mb-1"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-2xl font-bold"
                      style={{
                        color: item.color,
                        fontFamily: "BricolageGrotesque, sans-serif",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              {breakdownRecords.filter((r) => r.status === "approved-breakdown")
                .length > 0 ? (
                <div className="industrial-card p-5">
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: "oklch(0.75 0.008 260)" }}
                  >
                    Breakdowns per Machine
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={(() => {
                        const counts: Record<string, number> = {};
                        for (const r of breakdownRecords.filter(
                          (r) => r.status === "approved-breakdown",
                        )) {
                          counts[r.machineName] =
                            (counts[r.machineName] || 0) + 1;
                        }
                        return Object.entries(counts).map(([name, count]) => ({
                          name,
                          count,
                        }));
                      })()}
                      margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.34 0.030 252 / 0.6)"
                      />
                      <XAxis
                        dataKey="name"
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
                      <Bar
                        dataKey="count"
                        name="Breakdowns"
                        fill="oklch(0.62 0.220 25)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="industrial-card p-8 text-center">
                  <Wrench
                    className="w-8 h-8 mx-auto mb-2"
                    style={{ color: "oklch(0.45 0.010 260)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    No approved breakdown records yet.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Today's PM Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Today's Maintenance Schedule
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  {completedCount} of {todayMachines.length} completed • Click a
                  machine to open checklist
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  data-ocid="dashboard.download_button"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="flex items-center gap-1.5"
                  style={{
                    background: "oklch(0.70 0.188 55 / 0.18)",
                    border: "1px solid oklch(0.70 0.188 55 / 0.4)",
                    color: "oklch(0.80 0.180 55)",
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Report
                </Button>
                {user?.role === "admin" && (
                  <Button
                    data-ocid="dashboard.secondary_button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("admin")}
                    style={{
                      borderColor: "oklch(0.34 0.030 252)",
                      color: "oklch(0.68 0.010 260)",
                    }}
                  >
                    Manage Master Data
                  </Button>
                )}
              </div>
            </div>

            {todayMachines.length === 0 ? (
              <div
                data-ocid="schedule.empty_state"
                className="industrial-card p-10 text-center"
              >
                <CheckCircle2
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: "oklch(0.60 0.155 145)" }}
                />
                <p className="font-medium">
                  No machines scheduled for this month.
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  Upload a PM plan in the Admin Panel to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedTodayMachines.map((machine, idx) => {
                  const completed = isMachineCompleted(machine.id);
                  const todayStartMs = (() => {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    return d.getTime();
                  })();
                  const isPendingApproval =
                    !completed &&
                    pmRecords.some(
                      (r) =>
                        r.machineId === machine.id &&
                        r.status === "pending-approval" &&
                        Number(r.completedDate) >= todayStartMs,
                    );
                  return (
                    <motion.button
                      key={machine.id}
                      data-ocid={`schedule.item.${idx + 1}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + idx * 0.06 }}
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMachineClick(machine.id)}
                      className="industrial-card p-4 text-left w-full group cursor-pointer transition-shadow"
                      style={{
                        outline: completed
                          ? "1px solid oklch(0.52 0.120 145 / 0.5)"
                          : isPendingApproval
                            ? "1px solid oklch(0.70 0.15 60 / 0.5)"
                            : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{
                              background: completed
                                ? "oklch(0.45 0.120 145 / 0.25)"
                                : isPendingApproval
                                  ? "oklch(0.55 0.15 60 / 0.25)"
                                  : "oklch(0.70 0.188 55 / 0.15)",
                              color: completed
                                ? "oklch(0.75 0.130 145)"
                                : isPendingApproval
                                  ? "oklch(0.82 0.16 60)"
                                  : "oklch(0.80 0.180 55)",
                              border: `1px solid ${completed ? "oklch(0.52 0.120 145 / 0.4)" : isPendingApproval ? "oklch(0.70 0.15 60 / 0.4)" : "oklch(0.70 0.188 55 / 0.3)"}`,
                            }}
                          >
                            {machine.id.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-semibold leading-tight">
                                {machine.name}
                              </div>
                              {prioritizedMachineIds.includes(machine.id) && (
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                  style={{
                                    background: "oklch(0.65 0.18 80 / 0.18)",
                                    color: "oklch(0.82 0.18 80)",
                                    border:
                                      "1px solid oklch(0.65 0.18 80 / 0.35)",
                                  }}
                                >
                                  ⭐ Priority
                                </span>
                              )}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {machine.id}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${completed ? "status-completed" : !isPendingApproval ? "status-pending" : ""}`}
                          style={
                            isPendingApproval && !completed
                              ? {
                                  background: "oklch(0.55 0.15 60 / 0.18)",
                                  color: "oklch(0.82 0.16 60)",
                                  border: "1px solid oklch(0.70 0.15 60 / 0.4)",
                                }
                              : undefined
                          }
                        >
                          {completed
                            ? "Done"
                            : isPendingApproval
                              ? "Waiting"
                              : "Pending"}
                        </span>
                      </div>
                      <div
                        className="text-xs space-y-1"
                        style={{ color: "oklch(0.68 0.010 260)" }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "oklch(0.50 0.065 232)" }}
                          />
                          {machine.department}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "oklch(0.68 0.010 260)" }}
                          />
                          {machine.location}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: "oklch(0.60 0.065 232)" }}
                        >
                          {machine.machineType}
                        </span>
                        <span
                          className="flex items-center gap-1 text-xs font-medium group-hover:translate-x-0.5 transition-transform"
                          style={{ color: "oklch(0.80 0.180 55)" }}
                        >
                          {completed ? "View Record" : "Start PM"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Server
                className="w-4 h-4"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                System Status
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Machines",
                  value: machines.length,
                  color: "oklch(0.50 0.065 232)",
                  icon: <Cpu className="w-4 h-4" />,
                },
                {
                  label: "PM Records Today",
                  value: pmRecordsToday,
                  color: "oklch(0.60 0.155 145)",
                  icon: <CheckCircle2 className="w-4 h-4" />,
                },
                {
                  label: "Pending This Month",
                  value: pendingThisMonth,
                  color: "oklch(0.75 0.150 55)",
                  icon: <Clock className="w-4 h-4" />,
                },
                {
                  label: "System Health",
                  value: "ONLINE",
                  color: "oklch(0.60 0.155 145)",
                  icon: <Wifi className="w-4 h-4" />,
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.06 }}
                  data-ocid={`system.status.${idx + 1}`}
                  className="industrial-card p-3 flex items-center gap-3"
                >
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      background: `${item.color} / 0.15`,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-lg font-bold leading-tight"
                      style={{
                        color: item.color,
                        fontFamily: "BricolageGrotesque, sans-serif",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent PM Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="mt-6 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity
                className="w-4 h-4"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Recent PM Activity
              </h2>
            </div>
            {recentActivity.length === 0 ? (
              <div
                data-ocid="activity.empty_state"
                className="industrial-card p-8 text-center"
              >
                <Activity
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  No PM records yet. Complete a checklist to see activity here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="block md:hidden space-y-3">
                  {recentActivity.map((record, idx) => {
                    const machine = machines.find(
                      (m) => m.id === record.machineId,
                    );
                    const isCompleted = record.status === "completed";
                    const dateStr = new Date(
                      Number(record.completedDate),
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={record.id}
                        data-ocid={`activity.item.${idx + 1}`}
                        className="industrial-card p-4 flex items-start gap-3"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{
                            background: isCompleted
                              ? "oklch(0.60 0.155 145)"
                              : "oklch(0.75 0.150 55)",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-sm truncate">
                              {machine?.name ?? record.machineId}
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(record.status)}`}
                            >
                              {formatStatusLabel(record.status)}
                            </span>
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {record.operatorName}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            {dateStr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block industrial-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid oklch(0.34 0.030 252)",
                          }}
                        >
                          {[
                            "Status",
                            "Machine",
                            "Operator",
                            "Date & Time",
                            "Result",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                              style={{ color: "oklch(0.50 0.010 260)" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map((record, idx) => {
                          const machine = machines.find(
                            (m) => m.id === record.machineId,
                          );
                          const isCompleted = record.status === "completed";
                          const dateStr = new Date(
                            Number(record.completedDate),
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <motion.tr
                              key={record.id}
                              data-ocid={`activity.item.${idx + 1}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.7 + idx * 0.05 }}
                              style={{
                                borderBottom:
                                  idx < recentActivity.length - 1
                                    ? "1px solid oklch(0.28 0.020 252)"
                                    : undefined,
                              }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{
                                    background: isCompleted
                                      ? "oklch(0.60 0.155 145)"
                                      : "oklch(0.75 0.150 55)",
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium">
                                  {machine?.name ?? record.machineId}
                                </div>
                                <div
                                  className="text-xs"
                                  style={{ color: "oklch(0.50 0.010 260)" }}
                                >
                                  {record.machineId}
                                </div>
                              </td>
                              <td
                                className="px-4 py-3"
                                style={{ color: "oklch(0.75 0.008 260)" }}
                              >
                                {record.operatorName}
                              </td>
                              <td
                                className="px-4 py-3 text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {dateStr}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(record.status)}`}
                                >
                                  {formatStatusLabel(record.status)}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Pending Approvals — Admin only */}
          {user?.role === "admin" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="mt-6 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock
                  className="w-4 h-4"
                  style={{ color: "oklch(0.80 0.188 55)" }}
                />
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                >
                  Pending Approvals
                </h2>
                {pendingApprovals.length > 0 && (
                  <Badge
                    data-ocid="approvals.panel"
                    className="ml-1 text-xs px-2 py-0.5 font-bold"
                    style={{
                      background: "oklch(0.65 0.20 30 / 0.20)",
                      color: "oklch(0.85 0.18 40)",
                      border: "1px solid oklch(0.65 0.20 30 / 0.45)",
                    }}
                  >
                    {pendingApprovals.length}
                  </Badge>
                )}
              </div>

              {/* PM (Preventive) Approvals */}
              <div className="mb-2">
                <h3
                  className="text-sm font-semibold mb-2 flex items-center gap-2"
                  style={{ color: "oklch(0.75 0.130 145)" }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Preventive Approvals
                  {pendingApprovals.length > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: "oklch(0.45 0.120 145 / 0.20)",
                        color: "oklch(0.75 0.130 145)",
                      }}
                    >
                      {pendingApprovals.length}
                    </span>
                  )}
                </h3>
              </div>
              {pendingApprovals.length === 0 ? (
                <div
                  data-ocid="approvals.empty_state"
                  className="industrial-card p-8 text-center"
                >
                  <CheckCircle2
                    className="w-8 h-8 mx-auto mb-2"
                    style={{ color: "oklch(0.60 0.155 145)" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    All submissions reviewed
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.50 0.010 260)" }}
                  >
                    No checklists are currently waiting for approval.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile approval cards */}
                  <div className="block md:hidden space-y-3">
                    {pendingApprovals.map((record, idx) => {
                      const machine = machines.find(
                        (m) => m.id === record.machineId,
                      );
                      const dateStr = new Date(
                        Number(record.completedDate),
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const itemCount = Array.isArray(record.checklistResults)
                        ? record.checklistResults.length
                        : 0;
                      return (
                        <div
                          key={record.id}
                          data-ocid={`approvals.item.${idx + 1}`}
                          className="industrial-card p-4"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="font-medium text-sm">
                                {machine?.name ?? record.machineId}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {record.operatorName} · {dateStr} · {itemCount}{" "}
                                items
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              data-ocid={`approvals.confirm_button.${idx + 1}`}
                              onClick={() => {
                                approveRecord(record.id);
                                toast.success(
                                  `✅ ${machine?.name ?? record.machineId} approved!`,
                                );
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold"
                              style={{
                                background: "oklch(0.45 0.120 145 / 0.22)",
                                color: "oklch(0.75 0.130 145)",
                                border: "1px solid oklch(0.52 0.120 145 / 0.4)",
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              data-ocid={`approvals.delete_button.${idx + 1}`}
                              onClick={() => {
                                rejectRecord(record.id);
                                toast.error(
                                  `❌ ${machine?.name ?? record.machineId} rejected.`,
                                );
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold"
                              style={{
                                background: "oklch(0.40 0.150 25 / 0.20)",
                                color: "oklch(0.72 0.170 25)",
                                border: "1px solid oklch(0.55 0.150 25 / 0.4)",
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block industrial-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            style={{
                              borderBottom: "1px solid oklch(0.34 0.030 252)",
                            }}
                          >
                            {[
                              "Machine",
                              "Operator",
                              "Submitted",
                              "Items",
                              "Actions",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "oklch(0.50 0.010 260)" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pendingApprovals.map((record, idx) => {
                            const machine = machines.find(
                              (m) => m.id === record.machineId,
                            );
                            const dateStr = new Date(
                              Number(record.completedDate),
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const itemCount = Array.isArray(
                              record.checklistResults,
                            )
                              ? record.checklistResults.length
                              : 0;
                            return (
                              <motion.tr
                                key={record.id}
                                data-ocid={`approvals.item.${idx + 1}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 + idx * 0.05 }}
                                style={{
                                  borderBottom:
                                    idx < pendingApprovals.length - 1
                                      ? "1px solid oklch(0.28 0.020 252)"
                                      : undefined,
                                }}
                                className="hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium">
                                    {machine?.name ?? record.machineId}
                                  </div>
                                  <div
                                    className="text-xs"
                                    style={{ color: "oklch(0.50 0.010 260)" }}
                                  >
                                    {record.machineId}
                                  </div>
                                </td>
                                <td
                                  className="px-4 py-3"
                                  style={{ color: "oklch(0.75 0.008 260)" }}
                                >
                                  {record.operatorName}
                                </td>
                                <td
                                  className="px-4 py-3 text-xs"
                                  style={{ color: "oklch(0.68 0.010 260)" }}
                                >
                                  {dateStr}
                                </td>
                                <td
                                  className="px-4 py-3 text-xs"
                                  style={{ color: "oklch(0.68 0.010 260)" }}
                                >
                                  {itemCount} items
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      data-ocid={`approvals.confirm_button.${idx + 1}`}
                                      onClick={() => {
                                        approveRecord(record.id);
                                        toast.success(
                                          `✅ ${machine?.name ?? record.machineId} approved!`,
                                        );
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
                                      style={{
                                        background:
                                          "oklch(0.45 0.120 145 / 0.22)",
                                        color: "oklch(0.75 0.130 145)",
                                        border:
                                          "1px solid oklch(0.52 0.120 145 / 0.4)",
                                      }}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      data-ocid={`approvals.delete_button.${idx + 1}`}
                                      onClick={() => {
                                        rejectRecord(record.id);
                                        toast.error(
                                          `❌ ${machine?.name ?? record.machineId} rejected.`,
                                        );
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
                                      style={{
                                        background:
                                          "oklch(0.40 0.150 25 / 0.20)",
                                        color: "oklch(0.72 0.170 25)",
                                        border:
                                          "1px solid oklch(0.55 0.150 25 / 0.4)",
                                      }}
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Breakdown Approvals */}
              {pendingBreakdownApprovals.length > 0 && (
                <div className="mt-6">
                  <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: "oklch(0.72 0.170 27)" }}
                  >
                    <AlertTriangle className="w-4 h-4" /> Breakdown Approvals
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: "oklch(0.62 0.220 25 / 0.20)",
                        color: "oklch(0.75 0.200 25)",
                      }}
                    >
                      {pendingBreakdownApprovals.length}
                    </span>
                  </h3>
                  <div className="industrial-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            style={{
                              borderBottom: "1px solid oklch(0.34 0.030 252)",
                            }}
                          >
                            {[
                              "Machine",
                              "Date",
                              "Duration",
                              "Fault",
                              "Problem",
                              "Operator",
                              "Actions",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "oklch(0.50 0.010 260)" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pendingBreakdownApprovals.map((record, idx) => (
                            <tr
                              key={record.id}
                              data-ocid={`bd_approvals.item.${idx + 1}`}
                              style={{
                                borderBottom:
                                  idx < pendingBreakdownApprovals.length - 1
                                    ? "1px solid oklch(0.28 0.020 252)"
                                    : undefined,
                              }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td
                                className="px-4 py-3 font-medium"
                                style={{ color: "oklch(0.80 0.180 55)" }}
                              >
                                {record.machineName}
                              </td>
                              <td
                                className="px-4 py-3 text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {record.date}
                              </td>
                              <td
                                className="px-4 py-3 text-sm"
                                style={{
                                  color:
                                    record.durationMinutes > 60
                                      ? "oklch(0.75 0.200 25)"
                                      : "inherit",
                                }}
                              >
                                {record.durationMinutes} min
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {record.faultType}
                              </td>
                              <td
                                className="px-4 py-3 text-xs max-w-[150px] truncate"
                                style={{ color: "oklch(0.75 0.008 260)" }}
                              >
                                {record.problemDescription}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {record.operatorName}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    data-ocid={`bd_approvals.confirm_button.${idx + 1}`}
                                    onClick={() => {
                                      navigate("breakdown-panel");
                                      toast.success(
                                        "Opening Breakdown Panel to approve",
                                      );
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                                    style={{
                                      background:
                                        "oklch(0.45 0.120 145 / 0.22)",
                                      color: "oklch(0.75 0.130 145)",
                                      border:
                                        "1px solid oklch(0.52 0.120 145 / 0.4)",
                                    }}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                    Review
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Breakdown Analytics */}
          {breakdownRecords.length > 0 &&
            (() => {
              const now = Date.now();
              const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
              const recentBds = breakdownRecords.filter(
                (r) =>
                  r.submittedAt >= thirtyDaysAgo &&
                  (r.status === "approved-breakdown" ||
                    r.status === "approved-service"),
              );
              const monthStart = new Date();
              monthStart.setDate(1);
              monthStart.setHours(0, 0, 0, 0);
              const monthBds = breakdownRecords.filter(
                (r) =>
                  r.submittedAt >= monthStart.getTime() &&
                  r.status === "approved-breakdown",
              );
              const totalBdMinThisMonth = monthBds.reduce(
                (s, r) => s + r.durationMinutes,
                0,
              );
              const availableMinThisMonth = 30 * 8 * 60;
              const uptimePct = Math.max(
                0,
                Math.round(
                  ((availableMinThisMonth - totalBdMinThisMonth) /
                    availableMinThisMonth) *
                    100 *
                    10,
                ) / 10,
              );
              const mttr =
                recentBds.length > 0
                  ? Math.round(
                      recentBds.reduce((s, r) => s + r.durationMinutes, 0) /
                        recentBds.length,
                    )
                  : 0;
              let mtbf = 0;
              if (recentBds.length > 1) {
                const sorted = [...recentBds].sort(
                  (a, b) => a.submittedAt - b.submittedAt,
                );
                const gaps: number[] = [];
                for (let i = 1; i < sorted.length; i++) {
                  gaps.push(
                    (sorted[i].submittedAt - sorted[i - 1].submittedAt) /
                      (1000 * 60 * 60 * 24),
                  );
                }
                mtbf = Math.round(
                  gaps.reduce((a, b) => a + b, 0) / gaps.length,
                );
              }

              // Breakdown by machine data
              const bdByMachine: Record<string, number> = {};
              for (const r of recentBds) {
                bdByMachine[r.machineName] =
                  (bdByMachine[r.machineName] ?? 0) + 1;
              }
              const bdChartData = Object.entries(bdByMachine).map(
                ([name, count]) => ({ name, count }),
              );

              const openCapas = capaRecords.filter(
                (c) => c.status === "Open",
              ).length;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="mt-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className="w-5 h-5"
                      style={{ color: "oklch(0.75 0.200 25)" }}
                    />
                    <h2
                      className="text-base font-bold"
                      style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
                    >
                      Breakdown Analytics
                    </h2>
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      Last 30 days
                    </span>
                  </div>

                  {user?.role === "admin" && openCapas > 0 && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: "oklch(0.62 0.220 25 / 0.12)",
                        border: "1px solid oklch(0.62 0.220 25 / 0.35)",
                      }}
                      data-ocid="capa_warning.card"
                    >
                      <AlertCircle
                        className="w-5 h-5"
                        style={{ color: "oklch(0.80 0.200 25)" }}
                      />
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.80 0.200 25)" }}
                      >
                        ⚠️ {openCapas} Open CAPA{openCapas > 1 ? "s" : ""} —
                        Permanent actions required
                      </p>
                      {user?.role === "admin" && (
                        <button
                          type="button"
                          onClick={() => navigate("breakdown-panel")}
                          className="ml-auto text-xs px-3 py-1 rounded"
                          style={{
                            background: "oklch(0.62 0.220 25 / 0.20)",
                            color: "oklch(0.80 0.200 25)",
                          }}
                        >
                          View CAPAs
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-1 grid grid-cols-3 xl:grid-cols-1 gap-4">
                      {[
                        {
                          label: "Uptime %",
                          value: `${uptimePct}%`,
                          subtitle: "This month",
                          color: "oklch(0.75 0.130 145)",
                        },
                        {
                          label: "MTTR",
                          value: mttr > 0 ? `${mttr} min` : "N/A",
                          subtitle: "Avg repair time",
                          color: "oklch(0.80 0.180 55)",
                        },
                        {
                          label: "MTBF",
                          value: mtbf > 0 ? `${mtbf} days` : "N/A",
                          subtitle: "Avg between failures",
                          color: "oklch(0.65 0.150 232)",
                        },
                      ].map((kpi) => (
                        <div key={kpi.label} className="industrial-card p-4">
                          <p
                            className="text-xs font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {kpi.label}
                          </p>
                          <p
                            className="text-3xl font-bold"
                            style={{
                              color: kpi.color,
                              fontFamily: "BricolageGrotesque, sans-serif",
                            }}
                          >
                            {kpi.value}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            {kpi.subtitle}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="xl:col-span-2 industrial-card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3
                            className="text-sm font-semibold"
                            style={{
                              fontFamily: "BricolageGrotesque, sans-serif",
                            }}
                          >
                            Breakdown by Machine
                          </h3>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            Last 30 days — count of approved breakdowns
                          </p>
                        </div>
                        <Wrench
                          className="w-4 h-4"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        />
                      </div>
                      {bdChartData.length === 0 ? (
                        <div
                          className="text-center py-10"
                          data-ocid="bd_chart.empty_state"
                        >
                          <p
                            className="text-sm"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            No breakdowns in last 30 days
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart
                            data={bdChartData}
                            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="oklch(0.34 0.030 252 / 0.6)"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{
                                fill: "oklch(0.68 0.010 260)",
                                fontSize: 11,
                              }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{
                                fill: "oklch(0.68 0.010 260)",
                                fontSize: 11,
                              }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "oklch(0.22 0.022 252)",
                                border: "1px solid oklch(0.34 0.030 252)",
                                color: "oklch(0.88 0.010 260)",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar
                              dataKey="count"
                              name="Breakdowns"
                              fill="oklch(0.55 0.200 25)"
                              radius={[3, 3, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
        </main>

        {/* Footer */}
        <footer
          className="mt-auto border-t py-4"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs" style={{ color: "oklch(0.50 0.010 260)" }}>
              © {new Date().getFullYear()} PM Tracker. Industrial Maintenance
              Management.
            </p>
            <p className="text-xs" style={{ color: "oklch(0.50 0.010 260)" }}>
              Built with ❤ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
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
