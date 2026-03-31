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
  Settings,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function DesktopNav() {
  const { user, logout, navigate, currentPage } = useApp();

  if (!user) return null;

  const isActive = (pages: string[]) => pages.includes(currentPage);

  const items = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      action: () => navigate("dashboard"),
      active: isActive(["dashboard"]),
      ocid: "desktop_nav.dashboard.link",
    },
    {
      label: "Preventive",
      icon: ClipboardList,
      action: () => navigate("preventive"),
      active: isActive(["preventive", "checklist"]),
      ocid: "desktop_nav.preventive.link",
    },
    {
      label: "Breakdown",
      icon: AlertTriangle,
      action: () => navigate("breakdown-panel"),
      active: isActive(["breakdown-panel", "breakdown", "capa", "history"]),
      ocid: "desktop_nav.breakdown.link",
    },
    {
      label: "Analysis",
      icon: BarChart2,
      action: () => navigate("analysis"),
      active: isActive(["analysis"]),
      ocid: "desktop_nav.analysis.link",
    },
    {
      label: "Tasks",
      icon: ClipboardCheck,
      action: () => navigate("task-list"),
      active: isActive(["task-list"]),
      ocid: "desktop_nav.tasks.link",
    },
    {
      label: "Kaizen",
      icon: Lightbulb,
      action: () => navigate("kaizen"),
      active: isActive(["kaizen"]),
      ocid: "desktop_nav.kaizen.link",
    },
    {
      label: "Predictive",
      icon: Gauge,
      action: () => navigate("predictive"),
      active: isActive(["predictive"]),
      ocid: "desktop_nav.predictive.link",
    },
    {
      label: "Electricity",
      icon: Zap,
      action: () => navigate("electricity"),
      active: isActive(["electricity"]),
      ocid: "desktop_nav.electricity.link",
    },
    {
      label: "Logbook",
      icon: BookOpen,
      action: () => navigate("logbook"),
      active: isActive(["logbook"]),
      ocid: "desktop_nav.logbook.link",
    },
    ...(user.role === "admin"
      ? [
          {
            label: "Admin",
            icon: Settings,
            action: () => navigate("admin"),
            active: isActive(["admin"]),
            ocid: "desktop_nav.admin.link",
          },
        ]
      : []),
    {
      label: "Logout",
      icon: LogOut,
      action: () => logout(),
      active: false,
      ocid: "desktop_nav.logout.button",
    },
  ];

  return (
    <nav
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center overflow-x-auto"
      style={{
        background: "oklch(0.19 0.020 255)",
        borderBottom: "1px solid oklch(0.28 0.025 252)",
        height: "52px",
        minHeight: "52px",
      }}
    >
      {/* App title */}
      <div
        className="flex-shrink-0 flex items-center px-4"
        style={{
          borderRight: "1px solid oklch(0.28 0.025 252)",
          height: "100%",
        }}
      >
        <span
          className="font-bold whitespace-nowrap"
          style={{
            color: "oklch(0.80 0.180 55)",
            fontSize: "13px",
            letterSpacing: "0.02em",
          }}
        >
          ⚙ PMMS
        </span>
      </div>

      {/* Nav items */}
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          data-ocid={item.ocid}
          onClick={item.action}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 h-full transition-colors relative"
          style={{
            color: item.active
              ? "oklch(0.80 0.180 55)"
              : "oklch(0.60 0.012 260)",
            background: item.active ? "oklch(0.23 0.025 252)" : "transparent",
            fontSize: "12.5px",
            fontWeight: item.active ? 600 : 400,
          }}
        >
          <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">{item.label}</span>
          {item.active && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ background: "oklch(0.80 0.180 55)" }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
