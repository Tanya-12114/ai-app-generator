"use client";
import React, { useEffect, useState, useRef } from "react";
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
        { id: "inp-2", type: "INPUT", label: "Full Name", placeholder: "Jane Smith" },
        { id: "btn-1", type: "BUTTON", label: "Provision Workspace Access", props: { variant: "primary" } },
      ],
    },
    {
      id: "sec-2",
      title: "System Health Overview",
      layout: "GRID",
      components: [
        { id: "s-1", type: "STAT", label: "Active Users", props: { value: "1,284", change: 12 } },
        { id: "s-2", type: "STAT", label: "Uptime", props: { value: "99.9%", change: 0.1 } },
        { id: "s-3", type: "STAT", label: "Errors", props: { value: "3", change: -40 } },
      ],
    },
    {
      id: "sec-3",
      title: "Graceful Error Recovery Demo",
      layout: "GRID",
      components: [
        { id: "c-1", type: "CARD", label: "Active Analytics Node", props: { description: "Processing 4.2k events/sec" } },
        { id: "err-1", type: "UNKNOWN_CHART_WIDGET", label: "This type is not registered — renders gracefully" },
        { id: "c-2", type: "CARD", label: "Backup Datastore", props: { description: "Replica lag: 12ms" } },
      ],
    },
  ],
  dataSchema: [
    { name: "title", type: "STRING", required: true },
    { name: "status", type: "SELECT", options: ["OPEN", "IN_PROGRESS", "DONE"], required: false, default: "OPEN" },
    { name: "priority", type: "SELECT", options: ["LOW", "MEDIUM", "HIGH"], required: false, default: "MEDIUM" },
    { name: "due_date", type: "DATE", required: false },
  ],
  workflows: [
    {
      id: "wf-1",
      trigger: "ON_RECORD_CREATE",
      actions: [{ type: "NOTIFY", message: "New task created: {{title}} [{{status}}]" }],
    },
    {
      id: "wf-2",
      trigger: "ON_RECORD_DELETE",
      actions: [{ type: "NOTIFY", message: "Task deleted: {{title}}" }],
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
  const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor");
  const [copyDone, setCopyDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Parse and validate on every change — derived from jsonText, no render-phase
  // setState (calling setState unconditionally during render is what was
  // triggering "Too many re-renders" / React error #301).
  const { parsedJson, jsonError } = React.useMemo(() => {
    try {
      return { parsedJson: JSON.parse(jsonText), jsonError: null as string | null };
    } catch (e: any) {
      return { parsedJson: null, jsonError: e.message as string };
    }
  }, [jsonText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setSaveError(null);
  };

  // Format JSON
  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(jsonText), null, 2);
      setJsonText(formatted);
    } catch { /* already invalid, do nothing */ }
  };

  // Copy config
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  };

  // Tab key inserts spaces in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = jsonText.substring(0, start) + "  " + jsonText.substring(end);
      setJsonText(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

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
    if (!res.ok) { setSaveError(json.error || "Save failed"); return; }
    router.push(`/apps/${json.app.id}`);
  };

  const lineCount = jsonText.split("\n").length;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-ink tracking-tight">
              {editingId ? "Edit Config" : "New App"}
            </h1>
            <p className="text-xs text-muted">JSON config → live full-stack application</p>
          </div>

          {/* Mobile tab switcher */}
          <div className="flex lg:hidden items-center bg-raised rounded-lg p-1 gap-1">
            {(["editor", "preview"] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePanel(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${activePanel === p ? "bg-white shadow-card text-ink" : "text-muted"}`}
              >
                {p === "editor" ? "Config" : "Preview"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleFormat} disabled={!!jsonError} className="hidden sm:block px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-lg hover:bg-raised transition disabled:opacity-40">
              Format
            </button>
            <button onClick={handleCopy} className="hidden sm:block px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-lg hover:bg-raised transition">
              {copyDone ? "Copied!" : "Copy"}
            </button>
            <Link href="/dashboard" className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-lg hover:bg-raised transition">
              ← Dashboard
            </Link>
            <button
              onClick={handleSave}
              disabled={!parsedJson || saving || loadingExisting}
              className="px-4 py-1.5 bg-violet hover:bg-violet-bright text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-card"
            >
              {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Generate App"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Editor Panel ── */}
        <div className={`flex flex-col gap-2 ${activePanel === "preview" ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">JSON Configuration</label>
            <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
              <span>{lineCount} lines</span>
              {jsonError
                ? <span className="text-red-400 font-semibold">● Invalid JSON</span>
                : <span className="text-green-500 font-semibold">● Valid</span>}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gray-700 shadow-glow">
            {/* Line numbers */}
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-800/80 border-r border-gray-700 flex flex-col items-end pt-4 pr-2 pointer-events-none overflow-hidden">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="text-[10px] text-gray-600 leading-5 font-mono">{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={jsonText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-[560px] pl-12 pr-4 pt-4 pb-4 bg-gray-900 text-emerald-400 font-mono text-xs leading-5 focus:outline-none resize-none"
            />
          </div>

          {/* Error / status bar */}
          <div className={`px-3 py-2 rounded-lg text-xs font-mono ${jsonError ? "bg-red-50 border border-red-200 text-red-600" : "bg-gray-50 border border-gray-100 text-gray-400"}`}>
            {jsonError ? `⚠ ${jsonError}` : `✓ Valid JSON — ${Object.keys(parsedJson || {}).length} top-level keys`}
          </div>

          {saveError && (
            <div className="px-3 py-2 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600">{saveError}</div>
          )}
        </div>

        {/* ── Preview Panel ── */}
        <div className={`flex flex-col gap-2 ${activePanel === "editor" ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Live Preview</label>
            <span className="text-[10px] text-muted font-mono">read-only · updates as you type</span>
          </div>

          {parsedJson ? (
            <AppRuntime rawConfig={parsedJson} />
          ) : (
            <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm text-center">
              <p className="font-semibold">Preview paused</p>
              <p className="text-xs mt-1 text-amber-600">Fix the JSON syntax error to resume live preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}