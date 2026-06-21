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
      if (!res.ok) {
        setError(json.error || "Failed to load app");
        return;
      }
      setApp(json.app);
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/dashboard" className="text-sm text-indigo-600 font-semibold">← Dashboard</Link>
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        {!app && !error && (
          <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse" />
        )}
        {app && <AppRuntime rawConfig={app.config} appId={app.id} />}
      </div>
    </div>
  );
}
