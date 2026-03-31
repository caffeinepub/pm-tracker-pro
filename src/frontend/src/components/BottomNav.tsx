import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Package,
  Settings,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function BottomNav() {
  const { user, logout, navigate, currentPage } = useApp();

  if (!user) return null;

  const isActive = (pages: string[]) => pages.includes(currentPage);

  const items = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      action: () => navigate("dashboard"),
      active: isActive(["dashboard"]),
      ocid: "bottom_nav.dashboard.link",
    },
    {
      label: "PM",
      icon: ClipboardList,
      action: () => navigate("preventive"),
      active: isActive(["preventive", "checklist"]),
      ocid: "bottom_nav.preventive.link",
    },
    {
      label: "Breakdown",
      icon: AlertTriangle,
      action: () => navigate("breakdown-panel"),
      active: isActive(["breakdown-panel", "breakdown", "capa", "history"]),
      ocid: "bottom_nav.breakdown.link",
    },
    {
      label: "Analysis",
      icon: BarChart2,
      action: () => navigate("analysis"),
      active: isActive(["analysis"]),
      ocid: "bottom_nav.analysis.link",
    },
    {
      label: "Tasks",
      icon: ClipboardCheck,
      action: () => navigate("task-list"),
      active: isActive(["task-list"]),
      ocid: "bottom_nav.tasks.link",
    },
    {
      label: "Kaizen",
      icon: Lightbulb,
      action: () => navigate("kaizen"),
      active: isActive(["kaizen"]),
      ocid: "bottom_nav.kaizen.link",
    },
    {
      label: "PDM",
      icon: Gauge,
      action: () => navigate("predictive"),
      active: isActive(["predictive"]),
      ocid: "bottom_nav.predictive.link",
    },
    {
      label: "Power",
      icon: Zap,
      action: () => navigate("electricity"),
      active: isActive(["electricity"]),
      ocid: "bottom_nav.electricity.link",
    },
    {
      label: "Logbook",
      icon: BookOpen,
      action: () => navigate("logbook"),
      active: isActive(["logbook"]),
      ocid: "bottom_nav.logbook.link",
    },
    {
      label: "Spares",
      icon: Package,
      action: () => navigate("spares"),
      active: isActive(["spares"]),
      ocid: "bottom_nav.spares.link",
    },
    ...(user.role === "admin"
      ? [
          {
            label: "Admin",
            icon: Settings,
            action: () => navigate("admin"),
            active: isActive(["admin"]),
            ocid: "bottom_nav.admin.link",
          },
        ]
      : []),
    {
      label: "Logout",
      icon: LogOut,
      action: () => logout(),
      active: false,
      ocid: "bottom_nav.logout.button",
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch overflow-x-auto"
      style={{
        background: "oklch(0.19 0.020 255)",
        borderTop: "1px solid oklch(0.34 0.030 252)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          data-ocid={item.ocid}
          onClick={item.action}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3 px-2 min-h-[56px] min-w-[52px] transition-colors relative"
          style={{
            color: item.active
              ? "oklch(0.80 0.180 55)"
              : "oklch(0.55 0.010 260)",
          }}
        >
          <item.icon
            className="w-4 h-4"
            style={{
              color: item.active
                ? "oklch(0.80 0.180 55)"
                : "oklch(0.55 0.010 260)",
            }}
          />
          <span
            className="font-medium leading-none"
            style={{
              fontSize: "9px",
              color: item.active
                ? "oklch(0.80 0.180 55)"
                : "oklch(0.55 0.010 260)",
            }}
          >
            {item.label}
          </span>
          {item.active && (
            <span
              className="absolute bottom-0 w-8 h-0.5 rounded-full"
              style={{ background: "oklch(0.80 0.180 55)" }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
