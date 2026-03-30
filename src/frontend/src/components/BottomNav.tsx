import {
  AlertTriangle,
  BarChart2,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
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
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors relative"
          style={{
            color: item.active
              ? "oklch(0.80 0.180 55)"
              : "oklch(0.55 0.010 260)",
          }}
        >
          <item.icon
            className="w-5 h-5"
            style={{
              color: item.active
                ? "oklch(0.80 0.180 55)"
                : "oklch(0.55 0.010 260)",
            }}
          />
          <span
            className="text-[10px] font-medium leading-none"
            style={{
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
