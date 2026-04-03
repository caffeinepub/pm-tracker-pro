import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  Factory,
  LogOut,
  Save,
  Settings,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import { useApp } from "../context/AppContext";

type Section = "Powder Coating" | "Machine Shop" | "Utility";
const SECTIONS: Section[] = ["Powder Coating", "Machine Shop", "Utility"];

const SECTION_COLORS: Record<
  Section,
  { primary: string; secondary: string; bg: string; border: string }
> = {
  "Powder Coating": {
    primary: "oklch(0.72 0.170 27)",
    secondary: "oklch(0.80 0.180 55)",
    bg: "oklch(0.62 0.220 25 / 0.10)",
    border: "oklch(0.62 0.220 25 / 0.3)",
  },
  "Machine Shop": {
    primary: "oklch(0.65 0.150 232)",
    secondary: "oklch(0.70 0.155 232)",
    bg: "oklch(0.50 0.065 232 / 0.10)",
    border: "oklch(0.50 0.065 232 / 0.3)",
  },
  Utility: {
    primary: "oklch(0.75 0.130 145)",
    secondary: "oklch(0.65 0.140 145)",
    bg: "oklch(0.45 0.120 145 / 0.10)",
    border: "oklch(0.52 0.120 145 / 0.3)",
  },
};

interface MachineMetrics {
  machineId: string;
  machineName: string;
  breakdownCount: number;
  breakdownHours: number;
  bdPercent: number;
  mttr: number;
  mtbf: number;
  uptime: number;
}

export default function AnalysisPage() {
  const {
    logout,
    navigate,
    user,
    machines,
    breakdownRecords,
    pmPlans,
    predictivePlans,
    sectionHoursConfigs,
    updateSectionHoursConfig,
    bdTargets,
    updateBDTargets,
  } = useApp();

  // Local edit state for admin form per section (working hours)
  const [editingHours, setEditingHours] = useState<
    Record<string, { productionHrs: string; powerOff: string }>
  >(() => {
    const init: Record<string, { productionHrs: string; powerOff: string }> =
      {};
    for (const cfg of sectionHoursConfigs) {
      init[cfg.section] = {
        productionHrs: String(cfg.availableProductionHrs),
        powerOff: String(cfg.powerOff),
      };
    }
    return init;
  });

  // Local edit state for overall targets
  const [editingOverallTargets, setEditingOverallTargets] = useState({
    bdPct: String(bdTargets.Overall?.bdPct ?? 5),
    mttr: String(bdTargets.Overall?.mttr ?? 60),
    mtbf: String(bdTargets.Overall?.mtbf ?? 500),
    uptime: String(bdTargets.Overall?.uptime ?? 95),
  });

  // Local edit state for section KPI targets
  const [editingSectionTargets, setEditingSectionTargets] = useState<
    Record<
      string,
      { bdPct: string; mttr: string; mtbf: string; uptime: string }
    >
  >(() => {
    const init: Record<
      string,
      { bdPct: string; mttr: string; mtbf: string; uptime: string }
    > = {};
    for (const section of SECTIONS) {
      const tgt = bdTargets[section as keyof typeof bdTargets];
      init[section] = {
        bdPct: String(tgt?.bdPct ?? 5),
        mttr: String(tgt?.mttr ?? 60),
        mtbf: String(tgt?.mtbf ?? 500),
        uptime: String(tgt?.uptime ?? 95),
      };
    }
    return init;
  });

  const machineMetrics = useMemo<MachineMetrics[]>(() => {
    const approvedBds = breakdownRecords.filter(
      (r) => r.status === "approved-breakdown",
    );
    return machines.map((m) => {
      const mBds = approvedBds.filter((r) => r.machineId === m.id);
      const breakdownCount = mBds.length;
      const breakdownHours = mBds.reduce(
        (s, r) => s + r.durationMinutes / 60,
        0,
      );
      const mttr = breakdownCount > 0 ? breakdownHours / breakdownCount : 0;
      return {
        machineId: m.id,
        machineName: m.name,
        breakdownCount,
        breakdownHours,
        bdPercent: 0,
        mttr,
        mtbf: 0,
        uptime: 0,
      };
    });
  }, [machines, breakdownRecords]);

  function getSectionMetrics(section: Section) {
    const sectionMachines = machines.filter((m) => m.section === section);
    const sectionMachineMetrics = machineMetrics.filter((m) =>
      sectionMachines.some((sm) => sm.id === m.machineId),
    );
    if (sectionMachines.length === 0) return null;

    const cfg = sectionHoursConfigs.find((c) => c.section === section);
    const availableWorkingHrs =
      (cfg?.availableProductionHrs ?? 2000) - (cfg?.powerOff ?? 0);
    const totalBdHours = sectionMachineMetrics.reduce(
      (s, m) => s + m.breakdownHours,
      0,
    );
    const totalBdCount = sectionMachineMetrics.reduce(
      (s, m) => s + m.breakdownCount,
      0,
    );

    const bdPercent =
      availableWorkingHrs > 0 ? (totalBdHours / availableWorkingHrs) * 100 : 0;
    const mttr = totalBdCount > 0 ? totalBdHours / totalBdCount : 0;
    const mtbf =
      totalBdCount > 0
        ? (availableWorkingHrs - totalBdHours) / totalBdCount
        : availableWorkingHrs;
    const uptime = mttr + mtbf > 0 ? (mtbf / (mttr + mtbf)) * 100 : 100;

    const enrichedMachines = sectionMachineMetrics.map((m) => {
      const avail = availableWorkingHrs;
      const bd = avail > 0 ? (m.breakdownHours / avail) * 100 : 0;
      const mMtbf =
        m.breakdownCount > 0
          ? (avail - m.breakdownHours) / m.breakdownCount
          : avail;
      const mUptime =
        m.mttr + mMtbf > 0 ? (mMtbf / (m.mttr + mMtbf)) * 100 : 100;
      return { ...m, bdPercent: bd, mtbf: mMtbf, uptime: mUptime };
    });

    return {
      totalBdHours,
      totalBdCount,
      availableWorkingHrs,
      bdPercent,
      mttr,
      mtbf,
      uptime,
      machines: enrichedMachines,
    };
  }

  const fmt = (n: number, dec = 1) =>
    Number.isFinite(n) ? n.toFixed(dec) : "0.0";

  const MONTH_NAMES = [
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
  const CURRENT_YEAR = new Date().getFullYear();

  function getSectionMonthlyData(section: Section) {
    const sectionMachineIds = machines
      .filter((m) => m.section === section)
      .map((m) => m.id);
    const cfg = sectionHoursConfigs.find((c) => c.section === section);
    const availHrs = cfg ? cfg.availableProductionHrs - cfg.powerOff : 0;
    const currentMonthIndex = new Date().getMonth();

    return MONTH_NAMES.map((monthName, monthIdx) => {
      if (monthIdx > currentMonthIndex)
        return {
          month: monthName,
          bdPct: null,
          mttr: null,
          mtbf: null,
          uptime: null,
        };
      const monthBds = breakdownRecords.filter((r) => {
        if (r.status !== "approved-breakdown") return false;
        if (!sectionMachineIds.includes(r.machineId)) return false;
        const d = new Date(r.date);
        return d.getFullYear() === CURRENT_YEAR && d.getMonth() === monthIdx;
      });
      const bdCount = monthBds.length;
      const bdHours = monthBds.reduce(
        (sum, r) => sum + (r.durationMinutes ?? 0) / 60,
        0,
      );
      const bdPct = availHrs > 0 ? (bdHours / availHrs) * 100 : 0;
      const mttr = bdCount > 0 ? bdHours / bdCount : 0;
      const mtbf = bdCount > 0 ? (availHrs - bdHours) / bdCount : availHrs;
      const uptime = mttr + mtbf > 0 ? (mtbf / (mttr + mtbf)) * 100 : 100;
      return { month: monthName, bdPct, mttr, mtbf, uptime };
    });
  }

  function getOverallPlantMetrics() {
    const totalAvailHrs = Math.max(
      ...SECTIONS.map((section) => {
        const cfg = sectionHoursConfigs.find((c) => c.section === section);
        return (cfg?.availableProductionHrs ?? 2000) - (cfg?.powerOff ?? 0);
      }),
      0,
    );
    const approvedBds = breakdownRecords.filter(
      (r) => r.status === "approved-breakdown",
    );
    const totalBdCount = approvedBds.length;
    const totalBdHours = approvedBds.reduce(
      (s, r) => s + (r.durationMinutes ?? 0) / 60,
      0,
    );
    const bdPercent =
      totalAvailHrs > 0 ? (totalBdHours / totalAvailHrs) * 100 : 0;
    const mttr = totalBdCount > 0 ? totalBdHours / totalBdCount : 0;
    const mtbf =
      totalBdCount > 0
        ? (totalAvailHrs - totalBdHours) / totalBdCount
        : totalAvailHrs;
    const uptime = mttr + mtbf > 0 ? (mtbf / (mttr + mtbf)) * 100 : 100;
    return {
      totalAvailHrs,
      totalBdCount,
      totalBdHours,
      bdPercent,
      mttr,
      mtbf,
      uptime,
    };
  }

  function getOverallMonthlyData() {
    const currentMonthIndex = new Date().getMonth();
    return MONTH_NAMES.map((monthName, monthIdx) => {
      if (monthIdx > currentMonthIndex)
        return {
          month: monthName,
          bdPct: null,
          mttr: null,
          mtbf: null,
          uptime: null,
        };
      const totalAvailHrs = Math.max(
        ...SECTIONS.map((section) => {
          const cfg = sectionHoursConfigs.find((c) => c.section === section);
          return (cfg?.availableProductionHrs ?? 2000) - (cfg?.powerOff ?? 0);
        }),
        0,
      );
      const monthBds = breakdownRecords.filter((r) => {
        if (r.status !== "approved-breakdown") return false;
        const d = new Date(r.date);
        return d.getFullYear() === CURRENT_YEAR && d.getMonth() === monthIdx;
      });
      const bdCount = monthBds.length;
      const bdHours = monthBds.reduce(
        (sum, r) => sum + (r.durationMinutes ?? 0) / 60,
        0,
      );
      const bdPct = totalAvailHrs > 0 ? (bdHours / totalAvailHrs) * 100 : 0;
      const mttr = bdCount > 0 ? bdHours / bdCount : 0;
      const mtbf =
        bdCount > 0 ? (totalAvailHrs - bdHours) / bdCount : totalAvailHrs;
      const uptime = mttr + mtbf > 0 ? (mtbf / (mttr + mtbf)) * 100 : 100;
      return { month: monthName, bdPct, mttr, mtbf, uptime };
    });
  }

  // Unplanned maintenance ratio
  function getUnplannedRatio(monthIdx: number) {
    const monthBdCount = breakdownRecords.filter((r) => {
      if (r.status !== "approved-breakdown") return false;
      const d = new Date(r.date);
      return d.getFullYear() === CURRENT_YEAR && d.getMonth() === monthIdx;
    }).length;

    const plannedPM = pmPlans.filter(
      (p) => Number(p.month) - 1 === monthIdx,
    ).length;
    const plannedPDM = predictivePlans.filter((p) => {
      const d = new Date(p.scheduledDate);
      return d.getFullYear() === CURRENT_YEAR && d.getMonth() === monthIdx;
    }).length;
    const totalPlanned = plannedPM + plannedPDM;
    return totalPlanned > 0
      ? ((monthBdCount / totalPlanned) * 100).toFixed(1)
      : "0.0";
  }

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
              <BarChart2
                className="w-5 h-5"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Analysis{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>Panel</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg"
                style={{ color: "oklch(0.68 0.010 260)" }}
                data-ocid="analysis.logout.button"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-20 md:pb-6">
          <div className="mb-4">
            <p className="text-sm" style={{ color: "oklch(0.68 0.010 260)" }}>
              Section-wise analysis: BD%, MTTR, MTBF, Uptime% based on approved
              breakdown records. Admin can set Available Production Hrs, Power
              Off Hrs, and KPI Targets per section below.
            </p>
          </div>

          <Tabs defaultValue="Overall" data-ocid="analysis.panel">
            <TabsList
              className="mb-6 flex flex-wrap gap-1 h-auto p-1"
              style={{ background: "oklch(0.22 0.022 252)" }}
            >
              <TabsTrigger
                value="Overall"
                data-ocid="analysis.tab"
                className="flex items-center gap-1.5 text-xs"
              >
                <BarChart2 className="w-3.5 h-3.5" /> Overall Plant
              </TabsTrigger>
              {SECTIONS.map((section) => {
                const c = SECTION_COLORS[section];
                const count = machines.filter(
                  (m) => m.section === section,
                ).length;
                return (
                  <TabsTrigger
                    key={section}
                    value={section}
                    data-ocid="analysis.tab"
                    className="flex items-center gap-1.5 text-xs relative"
                  >
                    <Factory className="w-3.5 h-3.5" /> {section}
                    <Badge
                      className="ml-1 h-4 px-1 text-[10px]"
                      style={{
                        background: `${c.primary}22`,
                        color: c.primary,
                      }}
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* ============ OVERALL PLANT TAB ============ */}
            <TabsContent value="Overall">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Overall Target Config Card — admin only */}
                <div
                  className="industrial-card p-4"
                  style={{
                    border: "1px solid oklch(0.80 0.180 55 / 0.35)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2
                      className="w-4 h-4"
                      style={{ color: "oklch(0.80 0.180 55)" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: "oklch(0.80 0.180 55)",
                        fontFamily: "BricolageGrotesque, sans-serif",
                      }}
                    >
                      Overall Plant — KPI Targets
                    </span>
                  </div>
                  {user?.role === "admin" ? (
                    <div className="flex flex-wrap items-end gap-4">
                      {[
                        {
                          id: "overall-bdpct",
                          label: "Target BD%",
                          key: "bdPct" as const,
                          placeholder: "5",
                        },
                        {
                          id: "overall-mttr",
                          label: "Target MTTR (hrs)",
                          key: "mttr" as const,
                          placeholder: "60",
                        },
                        {
                          id: "overall-mtbf",
                          label: "Target MTBF (hrs)",
                          key: "mtbf" as const,
                          placeholder: "500",
                        },
                        {
                          id: "overall-uptime",
                          label: "Target Uptime%",
                          key: "uptime" as const,
                          placeholder: "95",
                        },
                      ].map(({ id, label, key, placeholder }) => (
                        <div key={key} className="flex flex-col gap-1">
                          <label
                            htmlFor={id}
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {label}
                          </label>
                          <Input
                            id={id}
                            type="number"
                            min={0}
                            value={editingOverallTargets[key]}
                            placeholder={placeholder}
                            onChange={(e) =>
                              setEditingOverallTargets((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-40 text-sm"
                            style={{
                              background: "oklch(0.22 0.022 252)",
                              borderColor: "oklch(0.34 0.030 252)",
                              color: "oklch(0.88 0.010 260)",
                            }}
                            data-ocid="analysis.input"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          updateBDTargets({
                            Overall: {
                              bdPct: Number(editingOverallTargets.bdPct) || 5,
                              mttr: Number(editingOverallTargets.mttr) || 60,
                              mtbf: Number(editingOverallTargets.mtbf) || 500,
                              uptime:
                                Number(editingOverallTargets.uptime) || 95,
                            },
                          });
                        }}
                        className="flex items-center gap-1.5"
                        style={{
                          background: "oklch(0.80 0.180 55)",
                          color: "oklch(0.12 0.010 260)",
                        }}
                        data-ocid="analysis.save_button"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Targets
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-6">
                      {[
                        {
                          label: "Target BD%",
                          value: bdTargets.Overall?.bdPct ?? 5,
                        },
                        {
                          label: "Target MTTR (hrs)",
                          value: bdTargets.Overall?.mttr ?? 60,
                        },
                        {
                          label: "Target MTBF (hrs)",
                          value: bdTargets.Overall?.mtbf ?? 500,
                        },
                        {
                          label: "Target Uptime%",
                          value: bdTargets.Overall?.uptime ?? 95,
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <span
                            className="text-xs block"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {label}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ color: "oklch(0.80 0.180 55)" }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overall KPI summary cards */}
                {(() => {
                  const o = getOverallPlantMetrics();
                  const tgt = bdTargets.Overall;
                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                        {[
                          {
                            label: "Total Avail Hrs",
                            value: `${fmt(o.totalAvailHrs, 0)} hrs`,
                            hint: "Max across sections",
                          },
                          {
                            label: "Total BD Count",
                            value: String(o.totalBdCount),
                            hint: "All sections",
                          },
                          {
                            label: "Total BD Hours",
                            value: `${fmt(o.totalBdHours)} hrs`,
                            hint: "All sections",
                          },
                          {
                            label: "BD%",
                            value: `${fmt(o.bdPercent)}%`,
                            target: tgt?.bdPct,
                            good: o.bdPercent <= (tgt?.bdPct ?? 5),
                          },
                          {
                            label: "MTTR (hrs)",
                            value: fmt(o.mttr),
                            target: tgt?.mttr,
                            good: o.mttr <= (tgt?.mttr ?? 60),
                          },
                          {
                            label: "MTBF (hrs)",
                            value: fmt(o.mtbf),
                            target: tgt?.mtbf,
                            good: o.mtbf >= (tgt?.mtbf ?? 500),
                          },
                          {
                            label: "Uptime%",
                            value: `${fmt(o.uptime)}%`,
                            target: tgt?.uptime,
                            good: o.uptime >= (tgt?.uptime ?? 95),
                          },
                        ].map((kpi) => (
                          <div
                            key={kpi.label}
                            className="industrial-card p-4"
                            style={{
                              border: "1px solid oklch(0.80 0.180 55 / 0.3)",
                            }}
                          >
                            <div
                              className="text-xs mb-1"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {kpi.label}
                            </div>
                            <div
                              className="text-2xl font-bold truncate"
                              style={{
                                color:
                                  kpi.target !== undefined
                                    ? kpi.good
                                      ? "oklch(0.75 0.130 145)"
                                      : "oklch(0.72 0.200 25)"
                                    : "oklch(0.80 0.180 55)",
                                fontFamily: "BricolageGrotesque, sans-serif",
                              }}
                            >
                              {kpi.value}
                            </div>
                            {kpi.hint && (
                              <div
                                className="text-xs mt-1"
                                style={{ color: "oklch(0.50 0.010 260)" }}
                              >
                                {kpi.hint}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Unplanned Maintenance Ratio */}
                      <div
                        className="industrial-card p-4"
                        style={{
                          border: "1px solid oklch(0.80 0.180 55 / 0.35)",
                        }}
                      >
                        <h3
                          className="text-sm font-semibold mb-2"
                          style={{
                            color: "oklch(0.80 0.180 55)",
                            fontFamily: "BricolageGrotesque, sans-serif",
                          }}
                        >
                          Unplanned Maintenance Ratio (Current Month)
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          Formula: Breakdown Count ÷ Total Planned (PM +
                          Predictive) × 100
                        </p>
                        <p
                          className="text-3xl font-bold mt-2"
                          style={{
                            color: "oklch(0.80 0.180 55)",
                            fontFamily: "BricolageGrotesque, sans-serif",
                          }}
                        >
                          {getUnplannedRatio(new Date().getMonth())}%
                        </p>
                      </div>

                      {/* Overall Monthly Trend Charts */}
                      {(() => {
                        const monthlyData = getOverallMonthlyData();
                        const tgtO = bdTargets.Overall;
                        const gridStroke = "oklch(0.34 0.030 252 / 0.5)";
                        const tickFill = "oklch(0.68 0.010 260)";
                        const ttStyle = {
                          background: "oklch(0.22 0.022 252)",
                          border: "1px solid oklch(0.34 0.030 252)",
                          color: "oklch(0.88 0.010 260)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        };
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              {
                                key: "bdPct",
                                title: `Overall BD% — Yearly Trend (${CURRENT_YEAR})`,
                                target: tgtO?.bdPct,
                                color: "oklch(0.72 0.170 27)",
                              },
                              {
                                key: "mttr",
                                title: `Overall MTTR — Yearly Trend (${CURRENT_YEAR})`,
                                target: tgtO?.mttr,
                                color: "oklch(0.65 0.150 232)",
                              },
                              {
                                key: "mtbf",
                                title: `Overall MTBF — Yearly Trend (${CURRENT_YEAR})`,
                                target: tgtO?.mtbf,
                                color: "oklch(0.75 0.130 145)",
                              },
                              {
                                key: "uptime",
                                title: `Overall Uptime% — Yearly Trend (${CURRENT_YEAR})`,
                                target: tgtO?.uptime,
                                color: "oklch(0.80 0.180 55)",
                              },
                            ].map(({ key, title, target, color }) => (
                              <div
                                key={key}
                                style={{
                                  background: "oklch(0.19 0.020 255)",
                                  border:
                                    "1px solid oklch(0.80 0.180 55 / 0.3)",
                                  borderRadius: "10px",
                                  padding: "16px",
                                }}
                              >
                                <h3
                                  className="text-xs font-semibold mb-3"
                                  style={{
                                    color: "oklch(0.78 0.010 260)",
                                    fontFamily:
                                      "BricolageGrotesque, sans-serif",
                                  }}
                                >
                                  {title}
                                </h3>
                                <ResponsiveContainer width="100%" height={160}>
                                  <BarChart
                                    data={monthlyData}
                                    margin={{
                                      top: 4,
                                      right: 8,
                                      left: -16,
                                      bottom: 0,
                                    }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke={gridStroke}
                                    />
                                    <XAxis
                                      dataKey="month"
                                      tick={{
                                        fill: tickFill,
                                        fontSize: 10,
                                      }}
                                      axisLine={false}
                                      tickLine={false}
                                    />
                                    <YAxis
                                      tick={{
                                        fill: tickFill,
                                        fontSize: 10,
                                      }}
                                      axisLine={false}
                                      tickLine={false}
                                    />
                                    <Tooltip contentStyle={ttStyle} />
                                    <Bar
                                      dataKey={key}
                                      fill={color}
                                      radius={[3, 3, 0, 0]}
                                      name={key.toUpperCase()}
                                    />
                                    <ReferenceLine
                                      y={target}
                                      stroke="oklch(0.80 0.180 55)"
                                      strokeDasharray="5 3"
                                      label={{
                                        value: `Target: ${target}`,
                                        fill: "oklch(0.70 0.010 260)",
                                        fontSize: 9,
                                        position: "insideTopRight",
                                      }}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </motion.div>
            </TabsContent>

            {/* ============ SECTION TABS ============ */}
            {SECTIONS.map((section) => {
              const c = SECTION_COLORS[section];
              const sectionData = getSectionMetrics(section);
              const cfg = sectionHoursConfigs.find(
                (x) => x.section === section,
              );
              const editState = editingHours[section] ?? {
                productionHrs: String(cfg?.availableProductionHrs ?? 2000),
                powerOff: String(cfg?.powerOff ?? 0),
              };
              const computedAvailHrs =
                (Number(editState.productionHrs) || 0) -
                (Number(editState.powerOff) || 0);
              const sectionTargetEdit = editingSectionTargets[section] ?? {
                bdPct: String(
                  bdTargets[section as keyof typeof bdTargets]?.bdPct ?? 5,
                ),
                mttr: String(
                  bdTargets[section as keyof typeof bdTargets]?.mttr ?? 60,
                ),
                mtbf: String(
                  bdTargets[section as keyof typeof bdTargets]?.mtbf ?? 500,
                ),
                uptime: String(
                  bdTargets[section as keyof typeof bdTargets]?.uptime ?? 95,
                ),
              };

              return (
                <TabsContent key={section} value={section}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Section Hours Config Card */}
                    <div
                      className="industrial-card p-4"
                      style={{ border: `1px solid ${c.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Settings
                          className="w-4 h-4"
                          style={{ color: c.primary }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: c.primary,
                            fontFamily: "BricolageGrotesque, sans-serif",
                          }}
                        >
                          {section} — Working Hours
                        </span>
                      </div>
                      {user?.role === "admin" ? (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`prod-hrs-${section}`}
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Available Production Hrs
                            </label>
                            <Input
                              id={`prod-hrs-${section}`}
                              type="number"
                              min={0}
                              value={editState.productionHrs}
                              onChange={(e) =>
                                setEditingHours((prev) => ({
                                  ...prev,
                                  [section]: {
                                    ...editState,
                                    productionHrs: e.target.value,
                                  },
                                }))
                              }
                              className="w-44 text-sm"
                              style={{
                                background: "oklch(0.22 0.022 252)",
                                borderColor: "oklch(0.34 0.030 252)",
                                color: "oklch(0.88 0.010 260)",
                              }}
                              data-ocid="analysis.input"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`power-off-${section}`}
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Power Off Hrs
                            </label>
                            <Input
                              id={`power-off-${section}`}
                              type="number"
                              min={0}
                              value={editState.powerOff}
                              onChange={(e) =>
                                setEditingHours((prev) => ({
                                  ...prev,
                                  [section]: {
                                    ...editState,
                                    powerOff: e.target.value,
                                  },
                                }))
                              }
                              className="w-36 text-sm"
                              style={{
                                background: "oklch(0.22 0.022 252)",
                                borderColor: "oklch(0.34 0.030 252)",
                                color: "oklch(0.88 0.010 260)",
                              }}
                              data-ocid="analysis.input"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span
                              className="text-xs"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Available Working Hrs
                            </span>
                            <div
                              className="w-40 px-3 py-2 rounded-md text-sm font-bold border"
                              style={{
                                background: `${c.primary}18`,
                                borderColor: c.border,
                                color: c.primary,
                              }}
                            >
                              {computedAvailHrs >= 0 ? computedAvailHrs : 0} hrs
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              updateSectionHoursConfig(section, {
                                availableProductionHrs: Math.max(
                                  0,
                                  Number(editState.productionHrs) || 0,
                                ),
                                powerOff: Math.max(
                                  0,
                                  Number(editState.powerOff) || 0,
                                ),
                              });
                            }}
                            className="flex items-center gap-1.5"
                            style={{
                              background: c.primary,
                              color: "oklch(0.12 0.010 260)",
                            }}
                            data-ocid="analysis.save_button"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6">
                          <div>
                            <span
                              className="text-xs block"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Available Production Hrs
                            </span>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: "oklch(0.88 0.010 260)" }}
                            >
                              {cfg?.availableProductionHrs ?? 2000}
                            </span>
                          </div>
                          <div>
                            <span
                              className="text-xs block"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Power Off Hrs
                            </span>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: "oklch(0.88 0.010 260)" }}
                            >
                              {cfg?.powerOff ?? 0}
                            </span>
                          </div>
                          <div>
                            <span
                              className="text-xs block"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              Available Working Hrs
                            </span>
                            <span
                              className="text-sm font-bold"
                              style={{ color: c.primary }}
                            >
                              {(cfg?.availableProductionHrs ?? 2000) -
                                (cfg?.powerOff ?? 0)}{" "}
                              hrs
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section KPI Targets Card */}
                    <div
                      className="industrial-card p-4"
                      style={{ border: `1px solid ${c.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Target
                          className="w-4 h-4"
                          style={{ color: c.primary }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: c.primary,
                            fontFamily: "BricolageGrotesque, sans-serif",
                          }}
                        >
                          {section} — KPI Targets
                        </span>
                      </div>
                      {user?.role === "admin" ? (
                        <div className="flex flex-wrap items-end gap-4">
                          {[
                            {
                              id: `${section}-bdpct`,
                              label: "Target BD%",
                              key: "bdPct" as const,
                              placeholder: "5",
                            },
                            {
                              id: `${section}-mttr`,
                              label: "Target MTTR (hrs)",
                              key: "mttr" as const,
                              placeholder: "60",
                            },
                            {
                              id: `${section}-mtbf`,
                              label: "Target MTBF (hrs)",
                              key: "mtbf" as const,
                              placeholder: "500",
                            },
                            {
                              id: `${section}-uptime`,
                              label: "Target Uptime%",
                              key: "uptime" as const,
                              placeholder: "95",
                            },
                          ].map(({ id, label, key, placeholder }) => (
                            <div key={key} className="flex flex-col gap-1">
                              <label
                                htmlFor={id}
                                className="text-xs"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {label}
                              </label>
                              <Input
                                id={id}
                                type="number"
                                min={0}
                                value={sectionTargetEdit[key]}
                                placeholder={placeholder}
                                onChange={(e) =>
                                  setEditingSectionTargets((prev) => ({
                                    ...prev,
                                    [section]: {
                                      ...sectionTargetEdit,
                                      [key]: e.target.value,
                                    },
                                  }))
                                }
                                className="w-40 text-sm"
                                style={{
                                  background: "oklch(0.22 0.022 252)",
                                  borderColor: "oklch(0.34 0.030 252)",
                                  color: "oklch(0.88 0.010 260)",
                                }}
                                data-ocid="analysis.input"
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              updateBDTargets({
                                [section]: {
                                  bdPct: Number(sectionTargetEdit.bdPct) || 5,
                                  mttr: Number(sectionTargetEdit.mttr) || 60,
                                  mtbf: Number(sectionTargetEdit.mtbf) || 500,
                                  uptime:
                                    Number(sectionTargetEdit.uptime) || 95,
                                },
                              } as any);
                            }}
                            className="flex items-center gap-1.5"
                            style={{
                              background: c.primary,
                              color: "oklch(0.12 0.010 260)",
                            }}
                            data-ocid="analysis.save_button"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Targets
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-6">
                          {[
                            {
                              label: "Target BD%",
                              value:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.bdPct ?? 5,
                            },
                            {
                              label: "Target MTTR (hrs)",
                              value:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.mttr ?? 60,
                            },
                            {
                              label: "Target MTBF (hrs)",
                              value:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.mtbf ?? 500,
                            },
                            {
                              label: "Target Uptime%",
                              value:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.uptime ?? 95,
                            },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <span
                                className="text-xs block"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {label}
                              </span>
                              <span
                                className="text-sm font-bold"
                                style={{ color: c.primary }}
                              >
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {sectionData ? (
                      <>
                        {/* Section Summary Cards — 6 cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                          {[
                            {
                              label: "Total BD Count",
                              value: String(sectionData.totalBdCount),
                              hint: "Breakdowns in section",
                            },
                            {
                              label: "Total BD Hours",
                              value: `${fmt(sectionData.totalBdHours)} hrs`,
                              hint: "Sum of all machines in section",
                            },
                            {
                              label: "BD%",
                              value: `${fmt(sectionData.bdPercent)}%`,
                              hint: "BD Hrs / Available Working Hrs",
                              target:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.bdPct,
                              good:
                                sectionData.bdPercent <=
                                (bdTargets[section as keyof typeof bdTargets]
                                  ?.bdPct ?? 5),
                            },
                            {
                              label: "MTTR (hrs)",
                              value: fmt(sectionData.mttr),
                              hint: "BD Hrs / BD Count",
                              target:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.mttr,
                              good:
                                sectionData.mttr <=
                                (bdTargets[section as keyof typeof bdTargets]
                                  ?.mttr ?? 60),
                            },
                            {
                              label: "MTBF (hrs)",
                              value: fmt(sectionData.mtbf),
                              hint: "(Avail - BD Hrs) / BD Count",
                              target:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.mtbf,
                              good:
                                sectionData.mtbf >=
                                (bdTargets[section as keyof typeof bdTargets]
                                  ?.mtbf ?? 500),
                            },
                            {
                              label: "Uptime%",
                              value: `${fmt(sectionData.uptime)}%`,
                              hint: "MTBF / (MTTR + MTBF)",
                              target:
                                bdTargets[section as keyof typeof bdTargets]
                                  ?.uptime,
                              good:
                                sectionData.uptime >=
                                (bdTargets[section as keyof typeof bdTargets]
                                  ?.uptime ?? 95),
                            },
                          ].map((kpi) => (
                            <div
                              key={kpi.label}
                              className="industrial-card p-4"
                              style={{ border: `1px solid ${c.border}` }}
                            >
                              <div
                                className="text-xs mb-1"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                {kpi.label}
                              </div>
                              <div
                                className="text-2xl font-bold truncate"
                                style={{
                                  color:
                                    kpi.target !== undefined
                                      ? kpi.good
                                        ? "oklch(0.75 0.130 145)"
                                        : "oklch(0.72 0.200 25)"
                                      : c.primary,
                                  fontFamily: "BricolageGrotesque, sans-serif",
                                }}
                              >
                                {kpi.value}
                              </div>
                              <div
                                className="text-xs mt-1"
                                style={{ color: "oklch(0.50 0.010 260)" }}
                              >
                                {kpi.hint}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Monthly Trend Line Charts */}
                        {(() => {
                          const monthlyData = getSectionMonthlyData(section);
                          const tgt =
                            bdTargets[section as keyof typeof bdTargets];
                          const chartStyle = {
                            background: "oklch(0.19 0.020 255)",
                            border: `1px solid ${c.border}`,
                            borderRadius: "10px",
                            padding: "16px",
                          };
                          const gridStroke = "oklch(0.34 0.030 252 / 0.5)";
                          const tickFill = "oklch(0.68 0.010 260)";
                          const ttStyle = {
                            background: "oklch(0.22 0.022 252)",
                            border: "1px solid oklch(0.34 0.030 252)",
                            color: "oklch(0.88 0.010 260)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          };
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                {
                                  key: "bdPct",
                                  title: `BD% — Monthly Trend (${CURRENT_YEAR})`,
                                  target: tgt?.bdPct,
                                  color: "oklch(0.72 0.170 27)",
                                },
                                {
                                  key: "mttr",
                                  title: `MTTR — Monthly Trend (${CURRENT_YEAR})`,
                                  target: tgt?.mttr,
                                  color: "oklch(0.65 0.150 232)",
                                },
                                {
                                  key: "mtbf",
                                  title: `MTBF — Monthly Trend (${CURRENT_YEAR})`,
                                  target: tgt?.mtbf,
                                  color: "oklch(0.75 0.130 145)",
                                },
                                {
                                  key: "uptime",
                                  title: `Uptime% — Monthly Trend (${CURRENT_YEAR})`,
                                  target: tgt?.uptime,
                                  color: "oklch(0.80 0.180 55)",
                                },
                              ].map(({ key, title, target, color }) => (
                                <div key={key} style={chartStyle}>
                                  <h3
                                    className="text-xs font-semibold mb-3"
                                    style={{
                                      color: "oklch(0.78 0.010 260)",
                                      fontFamily:
                                        "BricolageGrotesque, sans-serif",
                                    }}
                                  >
                                    {title}
                                  </h3>
                                  <ResponsiveContainer
                                    width="100%"
                                    height={160}
                                  >
                                    <LineChart
                                      data={monthlyData}
                                      margin={{
                                        top: 4,
                                        right: 8,
                                        left: -16,
                                        bottom: 0,
                                      }}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke={gridStroke}
                                      />
                                      <XAxis
                                        dataKey="month"
                                        tick={{
                                          fill: tickFill,
                                          fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                      />
                                      <YAxis
                                        tick={{
                                          fill: tickFill,
                                          fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                      />
                                      <Tooltip contentStyle={ttStyle} />
                                      <Line
                                        type="monotone"
                                        dataKey={key}
                                        stroke={color}
                                        strokeWidth={2}
                                        dot={{ fill: color, r: 3 }}
                                      />
                                      {target !== undefined && (
                                        <ReferenceLine
                                          y={target}
                                          stroke="oklch(0.65 0.010 260)"
                                          strokeDasharray="5 3"
                                          label={{
                                            value: `Target: ${target}`,
                                            fill: "oklch(0.60 0.010 260)",
                                            fontSize: 9,
                                            position: "insideTopRight",
                                          }}
                                        />
                                      )}
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Bar chart: Uptime% per machine */}
                        {sectionData.machines.length > 0 && (
                          <div className="industrial-card p-5">
                            <h3
                              className="text-sm font-semibold mb-4"
                              style={{
                                fontFamily: "BricolageGrotesque, sans-serif",
                              }}
                            >
                              Uptime % by Machine — {section}
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart
                                data={sectionData.machines.map((m) => ({
                                  name: m.machineName.substring(0, 12),
                                  uptime: Number(fmt(m.uptime)),
                                }))}
                                margin={{
                                  top: 4,
                                  right: 8,
                                  left: -16,
                                  bottom: 0,
                                }}
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
                                  domain={[0, 100]}
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
                                  dataKey="uptime"
                                  name="Uptime %"
                                  fill={c.primary}
                                  radius={[3, 3, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Per-machine metrics table */}
                        <div className="industrial-card overflow-hidden">
                          <div
                            className="p-4 border-b"
                            style={{
                              borderColor: "oklch(0.34 0.030 252)",
                            }}
                          >
                            <h3
                              className="text-sm font-semibold"
                              style={{
                                fontFamily: "BricolageGrotesque, sans-serif",
                              }}
                            >
                              Machine-wise Metrics — {section}
                            </h3>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "oklch(0.55 0.010 260)" }}
                            >
                              Available Working Hrs (section):{" "}
                              {fmt(sectionData.availableWorkingHrs, 0)} hrs
                              {" | "}
                              Total BD Hours: {fmt(sectionData.totalBdHours)}{" "}
                              hrs
                              {" | "}
                              Total BD Count: {sectionData.totalBdCount}
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <Table data-ocid="analysis.table">
                              <TableHeader>
                                <TableRow
                                  style={{
                                    borderColor: "oklch(0.34 0.030 252)",
                                  }}
                                >
                                  {[
                                    "Machine",
                                    "BD Count",
                                    "BD Hours",
                                    "BD%",
                                    "MTTR (hrs)",
                                    "MTBF (hrs)",
                                    "Uptime%",
                                  ].map((h) => (
                                    <TableHead
                                      key={h}
                                      style={{
                                        color: "oklch(0.68 0.010 260)",
                                      }}
                                    >
                                      {h}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sectionData.machines.map((m, idx) => (
                                  <TableRow
                                    key={m.machineId}
                                    data-ocid={`analysis.row.${idx + 1}`}
                                    style={{
                                      borderColor: "oklch(0.28 0.025 252)",
                                    }}
                                  >
                                    <TableCell
                                      className="font-semibold text-sm"
                                      style={{ color: c.primary }}
                                    >
                                      {m.machineName}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {m.breakdownCount}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {fmt(m.breakdownHours)}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className="font-semibold"
                                        style={{
                                          color:
                                            m.bdPercent > 5
                                              ? "oklch(0.72 0.200 25)"
                                              : "oklch(0.75 0.130 145)",
                                        }}
                                      >
                                        {fmt(m.bdPercent)}%
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {fmt(m.mttr)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {fmt(m.mtbf)}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className="font-semibold"
                                        style={{
                                          color:
                                            m.uptime >= 95
                                              ? "oklch(0.75 0.130 145)"
                                              : m.uptime >= 85
                                                ? "oklch(0.80 0.180 55)"
                                                : "oklch(0.72 0.200 25)",
                                        }}
                                      >
                                        {fmt(m.uptime)}%
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        className="industrial-card p-12 text-center"
                        data-ocid={`analysis.${section.toLowerCase().replace(" ", "_")}.empty_state`}
                      >
                        <Factory
                          className="w-12 h-12 mx-auto mb-3"
                          style={{ color: "oklch(0.45 0.010 260)" }}
                        />
                        <p
                          className="text-base font-semibold"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          No machines assigned to {section}
                        </p>
                        <p
                          className="text-sm mt-2"
                          style={{ color: "oklch(0.50 0.010 260)" }}
                        >
                          Assign machines to this section by uploading an Excel
                          with a "Section" column from Admin Panel, or by adding
                          machines in Preventive Maintenance → Machines tab.
                        </p>
                        <p
                          className="text-xs mt-3 font-mono"
                          style={{ color: "oklch(0.45 0.010 260)" }}
                        >
                          Section values: "Powder Coating", "Machine Shop",
                          "Utility"
                        </p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              );
            })}
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
