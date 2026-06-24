"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppRuntime } from "@/components/runtime/AppRuntime";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const MOCK_CONFIG = {
  "appName": "Task Tracker",
  "version": "1.0.0",
  "sections": [
    {
      "id": "sec-form",
      "title": "Create New Task",
      "layout": "RESPONSIVE",
      "components": [
        { "id": "inp-title", "type": "INPUT", "label": "Task Title", "placeholder": "e.g. Fix login bug", "field": "title" },
        { "id": "sel-status", "type": "SELECT", "label": "Status", "field": "status", "props": { "options": ["OPEN", "IN_PROGRESS", "DONE"] } },
        { "id": "sel-priority", "type": "SELECT", "label": "Priority", "field": "priority", "props": { "options": ["LOW", "MEDIUM", "HIGH"] } },
        { "id": "date-due", "type": "INPUT_DATE", "label": "Due Date", "field": "due_date" },
        { "id": "btn-create", "type": "BUTTON", "label": "Create Task", "props": { "variant": "primary" } }
      ]
    },
    {
      "id": "sec-stats",
      "title": "Overview",
      "layout": "GRID",
      "components": [
        { "id": "stat-total", "type": "STAT", "label": "Total Tasks", "props": { "value": "0" } },
        { "id": "stat-done", "type": "STAT", "label": "Completed", "props": { "value": "0" } },
        { "id": "stat-open", "type": "STAT", "label": "Open", "props": { "value": "0" } }
      ]
    }
  ],
  "dataSchema": [
    { "name": "title", "type": "STRING", "required": true },
    { "name": "status", "type": "SELECT", "options": ["OPEN", "IN_PROGRESS", "DONE"], "required": false, "default": "OPEN" },
    { "name": "priority", "type": "SELECT", "options": ["LOW", "MEDIUM", "HIGH"], "required": false, "default": "MEDIUM" },
    { "name": "due_date", "type": "DATE", "required": false }
  ],
  "workflows": [
    {
      "id": "wf-created",
      "trigger": "ON_RECORD_CREATE",
      "actions": [{ "type": "NOTIFY", "message": "New task created: {{title}} [{{status}}]" }]
    },
    {
      "id": "wf-deleted",
      "trigger": "ON_RECORD_DELETE",
      "actions": [{ "type": "NOTIFY", "message": "Task deleted: {{title}}" }]
    }
  ]
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
            <Link href="/dashboard" className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-lg hover:bg-raised transition inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Dashboard
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

        {/* ── Demo Notice Banner ── */}
        {!editingId && (
          <div className="lg:col-span-2 flex items-center gap-3 px-4 py-2.5 bg-violet-soft border border-violet/20 rounded-xl">
            <svg className="w-4 h-4 shrink-0 text-violet" fill="none" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm0 4v4m0 3h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-violet-light">
              <span className="font-semibold">Demo config loaded.</span>{" "}
              This is a pre-filled Task Tracker script — edit it freely or replace it with your own JSON.
              Hit <span className="font-semibold">Generate App</span> when ready.
            </p>
          </div>
        )}


        {/* ── Editor Panel ── */}
        <div className={`flex flex-col gap-2 ${activePanel === "preview" ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">JSON Configuration</label>
            <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
              <span>{lineCount} lines</span>
              {jsonError
                ? <span className="text-red-400 font-semibold inline-flex items-center gap-1"><XCircle className="w-3 h-3" strokeWidth={2} /> Invalid JSON</span>
                : <span className="text-green-500 font-semibold inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Valid</span>}
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
          <div className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-1.5 ${jsonError ? "bg-red-950/40 border border-red-800/50 text-red-400" : "bg-raised border border-line text-muted"}`}>
            {jsonError ? <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
            {jsonError ? jsonError : `Valid JSON — ${Object.keys(parsedJson || {}).length} top-level keys`}
          </div>

          {saveError && (
            <div className="px-3 py-2 rounded-lg text-xs bg-red-950/40 border border-red-800/50 text-red-400">{saveError}</div>
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
            <div className="p-8 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-amber-400 text-sm text-center">
              <p className="font-semibold">Preview paused</p>
              <p className="text-xs mt-1 text-amber-600">Fix the JSON syntax error to resume live preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}