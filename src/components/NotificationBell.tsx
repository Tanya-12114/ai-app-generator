"use client";
import React, { useEffect, useState } from "react";

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

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

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        className="relative px-2 py-1.5 rounded-lg hover:bg-gray-800 transition text-gray-300"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-xs text-gray-400 italic">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-700">
                {n.message}
                <div className="text-[10px] text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
