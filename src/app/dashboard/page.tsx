"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/apps");
    if (res.ok) {
      const json = await res.json();
      setApps(json.apps || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this generated app and all its records?")) return;
    await fetch(`/api/apps/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
        <h1 className="font-black tracking-tight">AI App Generator</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{session?.user?.email}</span>
          <NotificationBell />
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Your generated apps</h2>
          <Link href="/builder" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
            + New App
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-200" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="p-10 bg-white border border-dashed border-gray-300 rounded-2xl text-center text-gray-500 text-sm">
            No apps yet. Click <strong>New App</strong> to compile your first JSON config into a running application.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {apps.map((app) => (
              <div key={app.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{app.appName}</h3>
                  <p className="text-xs text-gray-400 font-mono">v{app.version} · {app._count?.records ?? 0} records</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/apps/${app.id}`} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition">
                    Open
                  </Link>
                  <Link href={`/builder?id=${app.id}`} className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition">
                    Edit Config
                  </Link>
                  <button onClick={() => handleDelete(app.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
