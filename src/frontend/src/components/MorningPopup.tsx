import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

function getTodayKey() {
  const d = new Date();
  return `pm_morning_popup_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MorningPopup() {
  const { pmPlans, pmRecords, machines } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const key = getTodayKey();
    const shown = localStorage.getItem(key);
    if (hour === 8 && !shown) {
      localStorage.setItem(key, "1");
      setOpen(true);
    }
  }, []);

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  const todayMonth = BigInt(today.getMonth() + 1);
  const todayPlans = pmPlans.filter((p) => p.month === todayMonth);
  const totalTasks = todayPlans.length || machines.length;

  const completedToday = pmRecords.filter(
    (r) => r.status === "completed" && Number(r.completedDate) >= todayStart,
  ).length;

  const pendingApproval = pmRecords.filter(
    (r) =>
      r.status === "pending-approval" && Number(r.completedDate) >= todayStart,
  ).length;

  const completedMachineIds = new Set(
    pmRecords
      .filter(
        (r) =>
          (r.status === "completed" || r.status === "pending-approval") &&
          Number(r.completedDate) >= todayStart,
      )
      .map((r) => r.machineId),
  );

  const pendingNotStarted = Math.max(0, totalTasks - completedMachineIds.size);

  const overdue = pmRecords.filter(
    (r) =>
      r.status !== "completed" &&
      r.status !== "pending-approval" &&
      Number(r.completedDate) < todayStart &&
      Number(r.completedDate) > 0,
  ).length;

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: Zap,
      color: "oklch(0.70 0.188 55)",
      bg: "oklch(0.70 0.188 55 / 0.12)",
    },
    {
      label: "Completed",
      value: completedToday,
      icon: CheckCircle2,
      color: "oklch(0.75 0.130 145)",
      bg: "oklch(0.45 0.120 145 / 0.15)",
    },
    {
      label: "Pending Approval",
      value: pendingApproval,
      icon: Clock,
      color: "oklch(0.80 0.160 220)",
      bg: "oklch(0.55 0.140 220 / 0.15)",
    },
    {
      label: "Not Started",
      value: pendingNotStarted,
      icon: AlertTriangle,
      color: "oklch(0.80 0.180 55)",
      bg: "oklch(0.70 0.188 55 / 0.10)",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: AlertTriangle,
      color: "oklch(0.65 0.200 25)",
      bg: "oklch(0.55 0.170 27 / 0.15)",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-ocid="morning_popup.dialog"
        className="max-w-md border-0"
        style={{
          background: "oklch(0.19 0.020 255)",
          border: "1px solid oklch(0.34 0.030 252)",
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "oklch(0.70 0.188 55 / 0.15)" }}
            >
              🌅
            </div>
            <div>
              <DialogTitle
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Good Morning!{" "}
                <span style={{ color: "oklch(0.80 0.180 55)" }}>
                  Today's PM Status
                </span>
              </DialogTitle>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                {formatDate(today)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 my-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: stat.bg,
                  border: `1px solid ${stat.color}33`,
                }}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: stat.color }}
                />
                <div>
                  <div
                    className="text-2xl font-bold leading-none"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          data-ocid="morning_popup.primary_button"
          className="w-full h-11 font-semibold"
          onClick={() => setOpen(false)}
          style={{
            background: "oklch(0.70 0.188 55)",
            color: "oklch(0.10 0.010 55)",
          }}
        >
          Start Work 🚀
        </Button>
      </DialogContent>
    </Dialog>
  );
}
