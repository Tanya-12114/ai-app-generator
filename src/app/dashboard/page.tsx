"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenu } from "@/components/AccountMenu";
import { Hexagon, Diamond, RefreshCw, Circle, Search, X, Plus } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    await fetch(`/api/apps/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  };

  const filtered = apps.filter(a =>
    a.appName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRecords = apps.reduce((sum, a) => sum + (a._count?.records ?? 0), 0);

  const appToDelete = apps.find(a => a.id === deleteConfirm);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet to-violet- flex items-center justify-center shadow-card">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <span className="font-display font-semibold text-[15px] text-ink tracking-tight">AI App Generator</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <AccountMenu email={session?.user?.email} name={session?.user?.name} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-7">
        {/* Welcome banner */}
        <section className="rounded-2xl border border-line bg-gradient-to-br from-violet-soft via-surface to-surface px-7 py-6 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink tracking-tight">
              Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-[13px] text-muted mt-2 max-w-lg leading-relaxed">
              Define your app in JSON — fields, UI sections, workflow rules — and we turn it into a working application with its own live database. No boilerplate needed.
            </p>
          </div>
          <Link
            href="/builder"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-violet hover:bg-violet-bright text-white text-sm font-semibold rounded-xl transition shadow-card whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.25} /> New App
          </Link>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Apps", value: apps.length, icon: Hexagon },
            { label: "Records", value: totalRecords, icon: Diamond },
            { label: "Workflows", value: apps.reduce((s, a) => s + (a.config?.workflows?.length ?? 0), 0), icon: RefreshCw },
            { label: "Status", value: "Online", icon: Circle, green: true },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-line bg-surface px-5 py-4 hover:border-violet/20 transition-colors">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                                {stat.label === "Status"
                  ? <Circle className="w-3 h-3 text-mint fill-mint" />
                  : <stat.icon className="w-3 h-3 text-violet/70" strokeWidth={2} />}
                {stat.label}
              </p>
              <p className={`text-3xl font-display font-semibold mt-1.5 ${stat.green ? "text-mint" : "text-ink"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Apps section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-display font-semibold text-ink">Your apps</h2>
            <span className="text-xs text-muted font-medium">{apps.length} total</span>
            <div className="flex-1" />
            {/* Search */}
            {apps.length > 2 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-line rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-violet/20 w-44"
                />
              </div>
            )}
            <Link href="/builder" className="sm:hidden px-3 py-1.5 bg-violet text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} /> New App
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-surface rounded-2xl animate-pulse border border-line" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-line rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-soft flex items-center justify-center mx-auto mb-4">
                <Hexagon className="w-6 h-6 text-violet-bright" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-ink">No apps yet</p>
              <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                Click <strong className="text-ink">New App</strong> to write your first JSON config and generate a working application.
              </p>
              <Link href="/builder" className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-violet hover:bg-violet-bright text-white text-sm font-semibold rounded-xl transition shadow-card">
                <Plus className="w-4 h-4" strokeWidth={2.25} /> New App
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted border border-dashed border-line rounded-2xl">
              No apps match &quot;{search}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filtered.map(app => (
                <div key={app.id} className="group bg-surface border border-line rounded-2xl p-5 space-y-4 hover:border-violet/30 hover:shadow-hover transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-soft flex items-center justify-center text-violet-bright font-bold text-sm shrink-0">
                      {app.appName?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-ink text-[15px] truncate">{app.appName}</h3>
                      <p className="text-xs text-muted mt-0.5 font-medium">
                        v{app.version} · {app._count?.records ?? 0} record{app._count?.records !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Meta tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(app.config?.dataSchema?.length > 0) && (
                      <span className="px-1.5 py-0.5 bg-raised text-muted rounded text-[10px] font-medium">
                        {app.config.dataSchema.length} field{app.config.dataSchema.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {(app.config?.workflows?.length > 0) && (
                      <span className="px-1.5 py-0.5 bg-raised text-muted rounded text-[10px] font-medium">
                        {app.config.workflows.length} workflow{app.config.workflows.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {(app.config?.sections?.length > 0) && (
                      <span className="px-1.5 py-0.5 bg-raised text-muted rounded text-[10px] font-medium">
                        {app.config.sections.length} section{app.config.sections.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/apps/${app.id}`}
                      className="flex-1 text-center text-xs px-3 py-1.5 bg-violet hover:bg-violet-bright text-white font-semibold rounded-lg transition"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/builder?id=${app.id}`}
                      className="text-xs px-3 py-1.5 bg-raised hover:bg-line text-ink/80 font-semibold rounded-lg transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(app.id)}
                      className="text-xs px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-950/40 rounded-lg transition ml-auto"
                      title="Delete app"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}

              {/* New App card */}
              <Link
                href="/builder"
                className="group border-2 border-dashed border-line hover:border-violet/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:text-violet transition min-h-[160px]"
              >
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={2} />
                <span className="text-xs font-semibold">New App</span>
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-line rounded-2xl shadow-glow p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink">Delete &quot;{appToDelete?.appName}&quot;?</h3>
            <p className="text-sm text-muted mt-1">This will permanently delete the app and all {appToDelete?._count?.records ?? 0} records. This cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-line text-ink text-sm font-semibold rounded-xl hover:bg-raised transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}