import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { useApp } from "../context/AppContext";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, markAllNotificationsRead } = useApp();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ocid="notifications.button"
          className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "oklch(0.68 0.010 260)" }}
          onClick={markAllNotificationsRead}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold px-0.5"
              style={{
                background: "oklch(0.62 0.220 25)",
                color: "white",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="notifications.popover"
        className="w-80 p-0 border-0"
        align="end"
        style={{
          background: "oklch(0.19 0.020 255)",
          border: "1px solid oklch(0.34 0.030 252)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "oklch(0.34 0.030 252)" }}
        >
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.length > 0 && (
            <button
              type="button"
              data-ocid="notifications.secondary_button"
              className="text-xs hover:underline"
              style={{ color: "oklch(0.80 0.180 55)" }}
              onClick={markAllNotificationsRead}
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div
              data-ocid="notifications.empty_state"
              className="text-center py-8 text-sm"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              No notifications yet
            </div>
          ) : (
            notifications.map((n, i) => (
              <div
                key={n.id}
                data-ocid={`notifications.item.${i + 1}`}
                className="px-4 py-3 border-b last:border-b-0 flex gap-3"
                style={{
                  borderColor: "oklch(0.34 0.030 252)",
                  background: n.read
                    ? "transparent"
                    : "oklch(0.70 0.188 55 / 0.04)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{
                    background: n.read
                      ? "oklch(0.40 0.010 260)"
                      : "oklch(0.70 0.188 55)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{n.message}</p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.55 0.010 260)" }}
                  >
                    {relativeTime(n.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
