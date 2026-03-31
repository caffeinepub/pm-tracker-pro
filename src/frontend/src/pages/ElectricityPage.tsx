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
import {
  FileDown,
  FileSpreadsheet,
  LogOut,
  Plus,
  Settings,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { ElectricityMeter, MeterReading } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

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

const CHART_COLORS = [
  "oklch(0.80 0.180 55)",
  "oklch(0.65 0.150 232)",
  "oklch(0.75 0.13 145)",
  "oklch(0.78 0.17 27)",
  "oklch(0.75 0.16 290)",
  "oklch(0.70 0.14 160)",
];

const EMPTY_METER = { name: "", location: "", multiplier: 1, unit: "kWh" };
const EMPTY_READING = {
  meterId: "",
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  todayReading: "",
};

export default function ElectricityPage() {
  const {
    user,
    logout,
    navigate,
    electricityMeters,
    meterReadings,
    addElectricityMeter,
    updateElectricityMeter,
    deleteElectricityMeter,
    addMeterReading,
    deleteMeterReading,
  } = useApp();

  const [showMeterForm, setShowMeterForm] = useState(false);
  const [meterForm, setMeterForm] = useState({ ...EMPTY_METER });
  const [editMeterId, setEditMeterId] = useState<string | null>(null);

  const [readingForm, setReadingForm] = useState({ ...EMPTY_READING });
  const importRef = useRef<HTMLInputElement>(null);

  const selectedMeter = useMemo(
    () => electricityMeters.find((m) => m.id === readingForm.meterId),
    [electricityMeters, readingForm.meterId],
  );

  // Get yesterday's date string
  const yesterdayDate = useMemo(() => {
    if (!readingForm.date) return "";
    const d = new Date(readingForm.date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, [readingForm.date]);

  // Look up yesterday's reading for the selected meter
  const yesterdayReading = useMemo(() => {
    if (!readingForm.meterId || !yesterdayDate) return null;
    const found = meterReadings
      .filter(
        (r) => r.meterId === readingForm.meterId && r.date === yesterdayDate,
      )
      .sort((a, b) => b.submittedAt - a.submittedAt);
    return found.length > 0 ? (found[0].reading ?? found[0].endReading) : null;
  }, [meterReadings, readingForm.meterId, yesterdayDate]);

  const consumption = useMemo(() => {
    const today = Number(readingForm.todayReading);
    if (!today) return 0;
    if (yesterdayReading === null) return 0;
    const diff = today - yesterdayReading;
    if (diff < 0) return 0;
    return diff * (selectedMeter?.multiplier ?? 1);
  }, [readingForm.todayReading, yesterdayReading, selectedMeter]);

  const sortedReadings = useMemo(
    () => [...meterReadings].sort((a, b) => b.date.localeCompare(a.date)),
    [meterReadings],
  );

  const monthlyChartData = useMemo(() => {
    return MONTH_NAMES.map((month, idx) => {
      const entry: Record<string, number | string> = { month };
      for (const meter of electricityMeters) {
        const total = meterReadings
          .filter((r) => {
            const d = new Date(r.date);
            return (
              r.meterId === meter.id &&
              d.getFullYear() === CURRENT_YEAR &&
              d.getMonth() === idx
            );
          })
          .reduce((s, r) => s + r.consumption, 0);
        entry[meter.name] = Math.round(total * 10) / 10;
      }
      return entry;
    });
  }, [meterReadings, electricityMeters]);

  function handleSaveMeter(e: React.FormEvent) {
    e.preventDefault();
    if (!meterForm.name.trim()) {
      toast.error("Enter meter name");
      return;
    }
    if (editMeterId) {
      updateElectricityMeter(editMeterId, {
        ...meterForm,
        multiplier: Number(meterForm.multiplier),
      });
      toast.success("Meter updated");
    } else {
      const meter: ElectricityMeter = {
        id: `meter-${Date.now()}`,
        ...meterForm,
        multiplier: Number(meterForm.multiplier),
        createdAt: Date.now(),
      };
      addElectricityMeter(meter);
      toast.success("Meter added");
    }
    setShowMeterForm(false);
    setMeterForm({ ...EMPTY_METER });
    setEditMeterId(null);
  }

  function handleAddReading(e: React.FormEvent) {
    e.preventDefault();
    if (!readingForm.meterId) {
      toast.error("Select a meter");
      return;
    }
    const today = Number(readingForm.todayReading);
    if (!today && today !== 0) {
      toast.error("Enter today's meter reading");
      return;
    }
    const prevReading = yesterdayReading ?? 0;
    const reading: MeterReading = {
      id: `reading-${Date.now()}`,
      meterId: readingForm.meterId,
      meterName: selectedMeter?.name ?? readingForm.meterId,
      date: readingForm.date,
      time: readingForm.time,
      reading: today,
      startReading: prevReading,
      endReading: today,
      consumption,
      enteredBy: user?.name ?? "",
      enteredByUsername: user?.username ?? "",
      submittedAt: Date.now(),
    };
    addMeterReading(reading);
    toast.success("Reading added");
    setReadingForm({ ...EMPTY_READING });
  }

  function handleExport() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const data = sortedReadings.map((r) => ({
      Date: r.date,
      Time: r.time ?? "",
      Meter: r.meterName,
      "Yesterday Reading (Start)": r.startReading,
      "Today Reading (End)": r.endReading,
      Consumption: r.consumption,
      Unit: electricityMeters.find((m) => m.id === r.meterId)?.unit ?? "",
      "Entered By": r.enteredBy,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data),
      "Readings",
    );
    XLSX.writeFile(
      wb,
      `Electricity_Readings_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  function handleDownloadTemplate() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const sampleDate = new Date().toISOString().split("T")[0];
    const data = [
      {
        Date: sampleDate,
        Time: "08:00",
        MeterName: electricityMeters[0]?.name ?? "Main Meter",
        Reading: 12345,
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data),
      "Import Template",
    );
    XLSX.writeFile(wb, "Electricity_Import_Template.xlsx");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !XLSX) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        let count = 0;
        for (const row of rows) {
          const meterName = row.MeterName ?? row.Meter ?? "";
          const meter = electricityMeters.find(
            (m) => m.name.toLowerCase() === String(meterName).toLowerCase(),
          );
          if (!meter) continue;
          const date = String(row.Date ?? "").trim();
          const time = String(row.Time ?? "08:00").trim();
          const todayVal = Number(row.Reading);
          if (!date || Number.isNaN(todayVal)) continue;
          // find prior day reading
          const priorDate = new Date(date);
          priorDate.setDate(priorDate.getDate() - 1);
          const priorDateStr = priorDate.toISOString().split("T")[0];
          const prior = meterReadings
            .filter((r) => r.meterId === meter.id && r.date === priorDateStr)
            .sort((a, b) => b.submittedAt - a.submittedAt);
          const prevReading =
            prior.length > 0 ? (prior[0].reading ?? prior[0].endReading) : 0;
          const diff = todayVal - prevReading;
          const cons = diff > 0 ? diff * meter.multiplier : 0;
          const reading: MeterReading = {
            id: `reading-import-${Date.now()}-${count}`,
            meterId: meter.id,
            meterName: meter.name,
            date,
            time,
            reading: todayVal,
            startReading: prevReading,
            endReading: todayVal,
            consumption: cons,
            enteredBy: user?.name ?? "",
            enteredByUsername: user?.username ?? "",
            submittedAt: Date.now(),
          };
          addMeterReading(reading);
          count++;
        }
        toast.success(`${count} readings imported`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };
  const navItems = [
    { label: "Dashboard", page: "dashboard" as const },
    { label: "Preventive Maintenance", page: "preventive" as const },
    { label: "Breakdown", page: "breakdown-panel" as const },
    { label: "Analysis", page: "analysis" as const },
  ];

  return (
    <>
      <MorningPopup />
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImport}
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
                  background: "oklch(0.45 0.14 55 / 0.15)",
                  border: "1px solid oklch(0.55 0.16 55 / 0.4)",
                }}
              >
                <Zap
                  className="w-4 h-4"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Electricity{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>
                  Consumption
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
                onClick={handleDownloadTemplate}
                data-ocid="electricity.secondary_button"
                style={{
                  background: "oklch(0.30 0.050 252 / 0.25)",
                  color: "oklch(0.68 0.010 260)",
                  border: "1px solid oklch(0.40 0.030 252 / 0.5)",
                  fontSize: "12px",
                }}
              >
                <FileDown className="w-3.5 h-3.5 mr-1" /> Template
              </Button>
              <Button
                size="sm"
                onClick={() => importRef.current?.click()}
                data-ocid="electricity.upload_button"
                style={{
                  background: "oklch(0.30 0.065 232 / 0.25)",
                  color: "oklch(0.65 0.150 232)",
                  border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Import
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                data-ocid="electricity.export.button"
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
                data-ocid="electricity.logout.button"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-24 md:pb-8 space-y-6">
          {/* Meter Management (admin only) */}
          {user?.role === "admin" && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="industrial-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings
                    className="w-4 h-4"
                    style={{ color: "oklch(0.80 0.180 55)" }}
                  />
                  <h3
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "BricolageGrotesque, sans-serif",
                      color: "oklch(0.88 0.010 260)",
                    }}
                  >
                    Meter Management
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setMeterForm({ ...EMPTY_METER });
                    setEditMeterId(null);
                    setShowMeterForm(true);
                  }}
                  data-ocid="electricity.open_modal_button"
                  style={{
                    background: "oklch(0.45 0.14 55 / 0.15)",
                    color: "oklch(0.80 0.180 55)",
                    border: "1px solid oklch(0.55 0.16 55 / 0.3)",
                    fontSize: "12px",
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Meter
                </Button>
              </div>
              {electricityMeters.length === 0 ? (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  No meters configured yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow
                        style={{ borderColor: "oklch(0.34 0.030 252)" }}
                      >
                        {[
                          "Name",
                          "Location",
                          "Multiplier",
                          "Unit",
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
                      {electricityMeters.map((m, idx) => (
                        <TableRow
                          key={m.id}
                          data-ocid={`electricity.row.${idx + 1}`}
                          style={{ borderColor: "oklch(0.28 0.025 252)" }}
                        >
                          <TableCell
                            className="font-semibold text-sm"
                            style={{ color: "oklch(0.80 0.180 55)" }}
                          >
                            {m.name}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {m.location}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {m.multiplier}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {m.unit}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setMeterForm({
                                    name: m.name,
                                    location: m.location,
                                    multiplier: m.multiplier,
                                    unit: m.unit,
                                  });
                                  setEditMeterId(m.id);
                                  setShowMeterForm(true);
                                }}
                                data-ocid={`electricity.edit_button.${idx + 1}`}
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
                                onClick={() => deleteElectricityMeter(m.id)}
                                data-ocid={`electricity.delete_button.${idx + 1}`}
                                style={{
                                  fontSize: "11px",
                                  background: "oklch(0.40 0.150 25 / 0.15)",
                                  color: "oklch(0.72 0.170 25)",
                                  border: "1px solid oklch(0.55 0.15 25 / 0.3)",
                                  height: "26px",
                                  padding: "0 8px",
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.section>
          )}

          {/* Readings Entry */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="industrial-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap
                className="w-4 h-4"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
              <h3
                className="text-sm font-bold"
                style={{
                  fontFamily: "BricolageGrotesque, sans-serif",
                  color: "oklch(0.88 0.010 260)",
                }}
              >
                Enter Meter Reading
              </h3>
            </div>
            <form onSubmit={handleAddReading} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Meter */}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Meter *
                  </Label>
                  <Select
                    value={readingForm.meterId || "none"}
                    onValueChange={(v) =>
                      setReadingForm((f) => ({
                        ...f,
                        meterId: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="electricity.select"
                      style={{ ...inputStyle, fontSize: "13px" }}
                    >
                      <SelectValue placeholder="Select meter" />
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
                        -- Select Meter --
                      </SelectItem>
                      {electricityMeters.map((m) => (
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

                {/* Date */}
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
                    data-ocid="electricity.input"
                    style={{ ...inputStyle }}
                  />
                </div>

                {/* Time */}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Reading Time
                  </Label>
                  <Input
                    type="time"
                    value={readingForm.time}
                    onChange={(e) =>
                      setReadingForm((f) => ({ ...f, time: e.target.value }))
                    }
                    data-ocid="electricity.input"
                    style={{ ...inputStyle }}
                  />
                </div>

                {/* Today's Reading */}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Today's Meter Reading *
                  </Label>
                  <Input
                    type="number"
                    value={readingForm.todayReading}
                    onChange={(e) =>
                      setReadingForm((f) => ({
                        ...f,
                        todayReading: e.target.value,
                      }))
                    }
                    placeholder="Enter current meter reading"
                    data-ocid="electricity.input"
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                {/* Yesterday's Reading (auto) */}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Yesterday's Reading (auto — {yesterdayDate || "select date"}
                    )
                  </Label>
                  <div
                    className="h-10 flex items-center px-3 rounded-lg text-sm"
                    style={{
                      background: "oklch(0.17 0.018 255)",
                      border: "1px solid oklch(0.28 0.025 252)",
                      color:
                        yesterdayReading !== null
                          ? "oklch(0.88 0.010 260)"
                          : "oklch(0.50 0.010 260)",
                    }}
                  >
                    {yesterdayReading !== null
                      ? yesterdayReading
                      : "No prior reading found — consumption = 0"}
                  </div>
                </div>

                {/* Consumption */}
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Consumption (auto) — Today − Yesterday × Multiplier
                  </Label>
                  <div
                    className="h-10 flex items-center px-3 rounded-lg text-sm font-bold"
                    style={{
                      background: "oklch(0.17 0.018 255)",
                      border: "1px solid oklch(0.28 0.025 252)",
                      color: "oklch(0.80 0.180 55)",
                    }}
                  >
                    {consumption.toFixed(2)} {selectedMeter?.unit ?? ""}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  data-ocid="electricity.submit_button"
                  style={{
                    background: "oklch(0.45 0.14 55 / 0.20)",
                    color: "oklch(0.80 0.180 55)",
                    border: "1px solid oklch(0.55 0.16 55 / 0.4)",
                  }}
                >
                  Add Reading
                </Button>
              </div>
            </form>
          </motion.section>

          {/* Readings Table */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="industrial-card overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "oklch(0.34 0.030 252)" }}
            >
              <h3
                className="text-sm font-bold"
                style={{ color: "oklch(0.88 0.010 260)" }}
              >
                Readings Log
              </h3>
              <Badge
                style={{
                  background: "oklch(0.45 0.14 55 / 0.15)",
                  color: "oklch(0.80 0.180 55)",
                }}
              >
                {sortedReadings.length} entries
              </Badge>
            </div>
            {sortedReadings.length === 0 ? (
              <div
                data-ocid="electricity.empty_state"
                className="p-12 text-center"
              >
                <p style={{ color: "oklch(0.55 0.010 260)" }}>
                  No readings yet. Enter meter readings above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "oklch(0.34 0.030 252)" }}>
                      {[
                        "Date",
                        "Time",
                        "Meter",
                        "Yesterday",
                        "Today",
                        "Consumption",
                        "Unit",
                        "Entered By",
                        "",
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
                    {sortedReadings.map((r, idx) => (
                      <TableRow
                        key={r.id}
                        data-ocid={`electricity.row.${idx + 1}`}
                        style={{ borderColor: "oklch(0.28 0.025 252)" }}
                      >
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {r.date}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {r.time ?? "—"}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-sm"
                          style={{ color: "oklch(0.80 0.180 55)" }}
                        >
                          {r.meterName}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {r.startReading}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {r.endReading}
                        </TableCell>
                        <TableCell
                          className="font-bold text-sm"
                          style={{ color: "oklch(0.80 0.180 55)" }}
                        >
                          {r.consumption.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.55 0.010 260)" }}
                        >
                          {electricityMeters.find((m) => m.id === r.meterId)
                            ?.unit ?? ""}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {r.enteredBy}
                        </TableCell>
                        <TableCell>
                          {user?.role === "admin" && (
                            <Button
                              size="sm"
                              onClick={() => deleteMeterReading(r.id)}
                              data-ocid={`electricity.delete_button.${idx + 1}`}
                              style={{
                                fontSize: "11px",
                                background: "oklch(0.40 0.150 25 / 0.15)",
                                color: "oklch(0.72 0.170 25)",
                                border: "1px solid oklch(0.55 0.15 25 / 0.3)",
                                height: "26px",
                                padding: "0 8px",
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.section>

          {/* Monthly Chart */}
          {electricityMeters.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="industrial-card p-5"
            >
              <h3
                className="text-sm font-bold mb-4"
                style={{ color: "oklch(0.88 0.010 260)" }}
              >
                Monthly Consumption — {CURRENT_YEAR}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.34 0.030 252 / 0.4)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "oklch(0.55 0.010 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.55 0.010 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.22 0.022 252)",
                      border: "1px solid oklch(0.34 0.030 252)",
                      color: "oklch(0.88 0.010 260)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      color: "oklch(0.68 0.010 260)",
                      fontSize: "12px",
                    }}
                  />
                  {electricityMeters.map((m, i) => (
                    <Bar
                      key={m.id}
                      dataKey={m.name}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[3, 3, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.section>
          )}
        </main>

        {/* Add/Edit Meter Dialog */}
        <Dialog open={showMeterForm} onOpenChange={setShowMeterForm}>
          <DialogContent
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="electricity.dialog"
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  color: "oklch(0.88 0.010 260)",
                  fontFamily: "BricolageGrotesque, sans-serif",
                }}
              >
                {editMeterId ? "Edit" : "Add"} Meter
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveMeter} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Meter Name *
                </Label>
                <Input
                  value={meterForm.name}
                  onChange={(e) =>
                    setMeterForm((f) => ({ ...f, name: e.target.value }))
                  }
                  data-ocid="electricity.input"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Location
                </Label>
                <Input
                  value={meterForm.location}
                  onChange={(e) =>
                    setMeterForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="Panel room, Shop floor..."
                  data-ocid="electricity.input"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Multiplier
                  </Label>
                  <Input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={meterForm.multiplier}
                    onChange={(e) =>
                      setMeterForm((f) => ({
                        ...f,
                        multiplier: Number(e.target.value),
                      }))
                    }
                    data-ocid="electricity.input"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Unit
                  </Label>
                  <Select
                    value={meterForm.unit}
                    onValueChange={(v) =>
                      setMeterForm((f) => ({ ...f, unit: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="electricity.select"
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
                      <SelectItem
                        value="kWh"
                        style={{ color: "oklch(0.88 0.010 260)" }}
                      >
                        kWh
                      </SelectItem>
                      <SelectItem
                        value="kVAh"
                        style={{ color: "oklch(0.88 0.010 260)" }}
                      >
                        kVAh
                      </SelectItem>
                      <SelectItem
                        value="Units"
                        style={{ color: "oklch(0.88 0.010 260)" }}
                      >
                        Units
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMeterForm(false)}
                  data-ocid="electricity.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-ocid="electricity.submit_button"
                  style={{
                    background: "oklch(0.45 0.14 55 / 0.20)",
                    color: "oklch(0.80 0.180 55)",
                    border: "1px solid oklch(0.55 0.16 55 / 0.4)",
                  }}
                >
                  Save
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
