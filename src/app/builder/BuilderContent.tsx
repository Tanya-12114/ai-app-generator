"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppRuntime } from "@/components/runtime/AppRuntime";

const MOCK_CONFIG = {
  appName: "Operations Control Center",
  version: "2.4.1",
  sections: [
    {
      id: "sec-1",
      title: "User Provisioning Engine",
      layout: "RESPONSIVE",
      components: [
        { id: "inp-1", type: "INPUT", label: "Corporate Email Address", placeholder: "you@firm.com" },
        { id: "btn-1", type: "BUTTON", label: "Provision Workspace Access" },
      ],
    },
    {
      id: "sec-2",
      title: "Broken Configuration Graceful Recovery",
      layout: "GRID",
      components: [
        { id: "c-1", type: "CARD", label: "Active Operational Analytics Node" },
        { id: "err-1", type: "UNKNOWN_CHART_WIDGET", label: "This layout item will throw errors!" },
        { id: "c-2", type: "CARD", label: "Mirror Backup Datastore Array" },
      ],
    },
  ],
  dataSchema: [
    { name: "title", type: "STRING", required: true },
    { name: "status", type: "SELECT", options: ["OPEN", "IN_PROGRESS", "DONE"], required: false },
  ],
  workflows: [
    {
      id: "wf-1",
      trigger: "ON_RECORD_CREATE",
      actions: [{ type: "NOTIFY", message: "New record created: {{title}}" }],
    },
  ],
};

export default function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [jsonText, setJsonText] = useState(JSON.stringify(MOCK_CONFIG, null, 2));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(!!editingId);

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const res = await fetch(`/api/apps/${editingId}`);
      if (res.ok) {
        const json = await res.json();
        setJsonText(JSON.stringify(json.app.config, null, 2));
      }
      setLoadingExisting(false);
    })();
  }, [editingId]);

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    parsedJson = null;
  }
  const handleSave = async () => {
    if (!parsedJson) return;
    setSaving(true);
    setSaveError(null);

    const url = editingId ? `/api/apps/${editingId}` : "/api/apps";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: jsonText,
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setSaveError(json.error || "Save failed");
      return;
    }
    router.push(`/apps/${json.app.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Metadata Application Runtime Sandbox
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              JSON config → live full-stack app (UI + dynamic CRUD + workflows)
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-indigo-600 font-semibold">
            ← Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              JSON Configuration Interface Editor
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-[560px] p-4 bg-gray-900 text-emerald-400 font-mono text-xs rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition resize-none"
            />
            {!parsedJson && (
              <p className="text-xs text-red-500 font-medium">
                ⚠️ Native Parser Blocked: Invalid syntax structure.
              </p>
            )}
            {saveError && (
              <p className="text-xs text-red-500 font-medium">{saveError}</p>
            )}
            <button
              onClick={handleSave}
              disabled={!parsedJson || saving || loadingExisting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? "Compiling & Saving..." : editingId ? "Save Changes" : "Generate App"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Live Dynamic Compilation Engine Canvas
            </label>
            {parsedJson ? (
              <AppRuntime rawConfig={parsedJson} />
            ) : (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm font-mono">
                🛑 Engine standing by: Fix syntax errors inside JSON text window to compile.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}