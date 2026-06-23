"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppRuntime } from "@/components/runtime/AppRuntime";

export default function AppViewPage({ params }: { params: { id: string } }) {
  const [app, setApp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/apps/${params.id}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load app"); return; }
      setApp(json.app);
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Slim top bar */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/dashboard" className="hover:text-ink transition">Dashboard</Link>
            <span>/</span>
            <span className="text-ink font-medium truncate max-w-[200px]">{app?.appName ?? "Loading..."}</span>
          </div>
          <div className="flex items-center gap-2">
            {app && (
              <Link
                href={`/builder?id=${params.id}`}
                className="px-3 py-1.5 text-xs font-medium border border-line rounded-lg hover:bg-raised transition text-muted hover:text-ink"
              >
                Edit Config
              </Link>
            )}
            <Link href="/dashboard" className="px-3 py-1.5 text-xs font-medium border border-line rounded-lg hover:bg-raised transition text-muted hover:text-ink">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="p-5 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-400 text-sm flex items-start gap-3">
            <span className="text-red-400 mt-0.5">✕</span>
            <div>
              <p className="font-semibold">Failed to load app</p>
              <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!app && !error && (
          <div className="space-y-4">
            {/* Skeleton loader */}
            <div className="h-14 bg-surface border border-line rounded-2xl animate-pulse" />
            <div className="h-8 w-48 bg-raised rounded-lg animate-pulse" />
            <div className="h-64 bg-surface border border-line rounded-2xl animate-pulse" />
          </div>
        )}

        {app && <AppRuntime rawConfig={app.config} appId={app.id} />}
      </main>
    </div>
  );
}