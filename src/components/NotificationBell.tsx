"use client";
import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const json = await res.json();
      setNotifications(json.notifications || []);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    load();
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unread > 0) setTimeout(markAllRead, 500);
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className={`relative px-2 py-1.5 rounded-lg transition text-muted hover:text-ink hover:bg-raised ${open ? "bg-raised" : ""}`}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-amber text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-2xl shadow-glow z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-xs font-semibold text-ink">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-muted hover:text-violet transition">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">No notifications yet</p>
                <p className="text-xs text-gray-300 mt-1">Workflow events will appear here</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-line last:border-0 transition-colors ${!n.read ? "bg-violet-soft/40" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet shrink-0 mt-1.5" />}
                    <div className={!n.read ? "" : "pl-4"}>
                      <p className="text-xs text-ink leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted mt-1 font-mono">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};