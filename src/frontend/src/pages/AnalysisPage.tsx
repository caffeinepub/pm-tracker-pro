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
import { BarChart2, Factory, LogOut, Save, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
    sectionHoursConfigs,
    updateSectionHoursConfig,
  } = useApp();

  // Local edit state for admin form per section
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
    // Aggregate all BD hours and BD count across all machines in section
    const totalBdHours = sectionMachineMetrics.reduce(
      (s, m) => s + m.breakdownHours,
      0,
    );
    const totalBdCount = sectionMachineMetrics.reduce(
      (s, m) => s + m.breakdownCount,
      0,
    );

    // Section KPIs use aggregated totals
    const bdPercent =
      availableWorkingHrs > 0 ? (totalBdHours / availableWorkingHrs) * 100 : 0;
    const mttr = totalBdCount > 0 ? totalBdHours / totalBdCount : 0;
    const mtbf =
      totalBdCount > 0
        ? (availableWorkingHrs - totalBdHours) / totalBdCount
        : availableWorkingHrs;
    const uptime = mttr + mtbf > 0 ? (mtbf / (mttr + mtbf)) * 100 : 100;

    // Per-machine enriched metrics
    const enrichedMachines = sectionMachineMetrics.map((m) => {
      const avail = availableWorkingHrs; // each machine had full section hours available
      const bd = avail > 0 ? (m.breakdownHours / avail) * 100 : 0;
      const mMtbf =
        m.breakdownCount > 0
          ? (avail - m.breakdownHours) / m.breakdownCount
          : avail;
      const mUptime =
        m.mttr + mMtbf > 0 ? (mMtbf / (m.mttr + mMtbf)) * 100 : 100;
      return {
        ...m,
        bdPercent: bd,
        mtbf: mMtbf,
        uptime: mUptime,
      };
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
              breakdown records. Admin can set Available Production Hrs and
              Power Off Hrs per section below.
            </p>
          </div>

          <Tabs defaultValue="Powder Coating" data-ocid="analysis.panel">
            <TabsList
              className="mb-6 flex flex-wrap gap-1 h-auto p-1"
              style={{ background: "oklch(0.22 0.022 252)" }}
            >
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
                      style={{ background: `${c.primary}22`, color: c.primary }}
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

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

                    {sectionData ? (
                      <>
                        {/* Section Summary Cards — 6 cards: BD Count, BD Hours, BD%, MTTR, MTBF, Uptime% */}
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
                            },
                            {
                              label: "MTTR (hrs)",
                              value: fmt(sectionData.mttr),
                              hint: "BD Hrs / BD Count",
                            },
                            {
                              label: "MTBF (hrs)",
                              value: fmt(sectionData.mtbf),
                              hint: "(Avail - BD Hrs) / BD Count",
                            },
                            {
                              label: "Uptime%",
                              value: `${fmt(sectionData.uptime)}%`,
                              hint: "MTBF / (MTTR + MTBF)",
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
                                  color: c.primary,
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
                            style={{ borderColor: "oklch(0.34 0.030 252)" }}
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
                                      style={{ color: "oklch(0.68 0.010 260)" }}
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
