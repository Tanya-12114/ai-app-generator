"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AppConfigSchema, DataField } from "@/types/schema";
import { RegistryRenderer, SUPPORTED_TYPES, FormContext, RecordsContext } from "./ComponentRegistry";
import { RuntimeErrorBoundary } from "./ErrorBoundary";
import { DataTable } from "./DataTable";

type Tab = "preview" | "data" | "schema" | "workflows";

function buildInitialFormState(fields: DataField[]): Record<string, any> {
  const state: Record<string, any> = {};
  for (const f of fields) if (f.default !== undefined) state[f.name] = f.default;
  return state;
}

// The records API returns zod's `.format()` shape on validation failure —
// e.g. { details: { title: { _errors: ["title is required"] } } }. Pull out
// the first field-level message so the inline error is actually actionable
// instead of just the generic "Record failed dynamic schema validation".
function extractFieldError(json: any): string | null {
  const details = json?.details;
  if (!details || typeof details !== "object") return null;
  for (const [key, val] of Object.entries(details)) {
    if (key === "_errors") continue;
    const errors = (val as any)?._errors;
    if (Array.isArray(errors) && errors.length > 0) return `${key}: ${errors[0]}`;
  }
  return null;
}

/**
 * Wraps a preview section that contains field-mapped components (INPUT,
 * SELECT, DATE, etc. with a `field` set) in a live FormContext, so that
 * those components become real controlled inputs and a BUTTON in the same
 * section submits the collected values as a new record via
 * POST /api/apps/{appId}/records — the same endpoint the Live Data tab uses.
 * This is what makes "Create Task" in UI Preview actually create a task.
 */
const FormSectionProvider: React.FC<{
  appId: string;
  fields: DataField[];
  onCreated?: () => void;
  children: React.ReactNode;
}> = ({ appId, fields, onCreated, children }) => {
  const [values, setValues] = useState<Record<string, any>>(() => buildInitialFormState(fields));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onChange = (field: string, value: any) => {
    setValues((v) => ({ ...v, [field]: value }));
    setMessage(null);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/apps/${appId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setValues(buildInitialFormState(fields));
        setMessage({ type: "success", text: "✓ Created — check Live Data" });
        onCreated?.();
      } else {
        setMessage({ type: "error", text: extractFieldError(json) || json.error || "Failed to create record" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error — check your connection" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormContext.Provider value={{ values, onChange, onSubmit, submitting, message }}>
      {children}
    </FormContext.Provider>
  );
};

export const AppRuntime: React.FC<{ rawConfig: any; appId?: string }> = ({ rawConfig, appId }) => {
  const [activeTab, setActiveTab] = useState<Tab>("preview");

  // Powers any STAT/STAT_CARD with a `props.computed` spec — fetched once up
  // front (and again right after a record is created) so the Overview-style
  // numbers reflect real data instead of the static value baked into the
  // config. No-op when there's no appId (unsaved app being edited).
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(!!appId);

  const loadRecords = useCallback(async () => {
    if (!appId) { setRecordsLoading(false); return; }
    try {
      const res = await fetch(`/api/apps/${appId}/records`);
      const json = await res.json();
      if (res.ok) setRecords(json.records || []);
    } catch {
      // best-effort — stat cards just keep their last known value
    } finally {
      setRecordsLoading(false);
    }
  }, [appId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const parsed = AppConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    return (
      <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-sm">
        <h3 className="font-bold flex items-center gap-2">
          <span className="text-red-500">✕</span> Schema validation failed
        </h3>
        <p className="text-xs text-red-600 mt-1 mb-3">The config has structural errors that could not be auto-corrected:</p>
        <pre className="text-xs bg-red-100 p-3 rounded-lg overflow-x-auto border border-red-200 max-h-48">
          {JSON.stringify(parsed.error.format(), null, 2)}
        </pre>
      </div>
    );
  }

  const appData = parsed.data;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "preview", label: "UI Preview" },
    ...(appId ? [{ id: "data" as Tab, label: "Live Data" }] : []),
    { id: "schema", label: "Schema", count: appData.dataSchema.length },
    { id: "workflows", label: "Workflows", count: appData.workflows.length },
  ];

  return (
    <RecordsContext.Provider value={{ records, loading: recordsLoading }}>
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
      {/* App header */}
      <div className="bg-gray-900 text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-violet flex items-center justify-center text-xs font-bold">
            {appData.appName.charAt(0)}
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">{appData.appName}</h2>
            <p className="text-[10px] text-gray-400 font-mono">v{appData.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          runtime active
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-xs font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? "text-violet border-b-2 border-violet -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 bg-gray-50/50 space-y-4">

        {/* ── UI PREVIEW ── */}
        {activeTab === "preview" && (
          appData.sections.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No sections defined. Add a <code className="text-xs bg-gray-100 px-1 rounded">sections</code> array to your config.
            </div>
          ) : (
            <>
              {/* Preview notice */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs">
                <svg className="w-3.5 h-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span>
                  {appId ? (
                    <>
                      <strong className="font-semibold">Live in Preview</strong> — fields linked to a data field create
                      real records here. Other buttons/inputs are still visual demos.
                      Check <button onClick={() => setActiveTab("data")} className="underline font-semibold text-blue-700">Live Data</button> after creating one.
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold">Live in Preview</strong> — fields linked to a data field create
                      real records here. Other buttons/inputs are still visual demos.
                    </>
                  )}
                </span>
              </div>
            {appData.sections.map((section) => {
              const fieldNames = (section.components ?? [])
                .map((c: any) => c?.field)
                .filter((f: any): f is string => typeof f === "string" && f.length > 0);
              const sectionFields = appData.dataSchema.filter((f) => fieldNames.includes(f.name));

              const body = (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-card">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">
                    {section.title}
                  </h3>
                  <div className={`
                    ${section.layout === "GRID" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : ""}
                    ${section.layout === "STACK" ? "flex flex-col gap-3" : ""}
                    ${section.layout === "RESPONSIVE" ? "flex flex-col md:flex-row gap-4 items-end" : ""}
                  `}>
                    {section.components?.map((comp: any, i: number) => (
                      <RuntimeErrorBoundary key={comp?.id || `fallback-${i}`}>
                        <RegistryRenderer
                          component={{
                            id: comp?.id || `c-${i}`,
                            type: comp?.type || "UNKNOWN",
                            label: comp?.label,
                            placeholder: comp?.placeholder,
                            field: comp?.field,
                            props: comp?.props,
                          }}
                        />
                      </RuntimeErrorBoundary>
                    ))}
                  </div>
                </div>
              );

              return appId && sectionFields.length > 0 ? (
                <FormSectionProvider key={section.id} appId={appId} fields={sectionFields} onCreated={loadRecords}>
                  {body}
                </FormSectionProvider>
              ) : (
                <div key={section.id}>{body}</div>
              );
            })}
            </>
          )
        )}

        {/* ── LIVE DATA ── */}
        {activeTab === "data" && appId && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-card">
            <DataTable appId={appId} dataSchema={appData.dataSchema} />
          </div>
        )}

        {/* ── SCHEMA INSPECTOR ── */}
        {activeTab === "schema" && (
          <div className="space-y-3">
            {appData.dataSchema.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No <code className="text-xs bg-gray-100 px-1 rounded">dataSchema</code> fields defined.
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">{appData.dataSchema.length} field{appData.dataSchema.length !== 1 ? "s" : ""} defined</p>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Name", "Type", "Required", "Default", "Options"].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {appData.dataSchema.map((f) => (
                        <tr key={f.name} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono font-semibold text-violet-bright">{f.name}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">{f.type}</span>
                          </td>
                          <td className="px-3 py-2">
                            {f.required
                              ? <span className="text-red-500 font-semibold">Yes</span>
                              : <span className="text-gray-400">No</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-500">
                            {f.default !== undefined ? String(f.default) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {f.options.length > 0
                              ? f.options.map(o => (
                                <span key={o} className="mr-1 px-1.5 py-0.5 bg-violet-soft text-violet-bright rounded font-medium">{o}</span>
                              ))
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Supported component types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_TYPES.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] text-gray-600">{t}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WORKFLOWS ── */}
        {activeTab === "workflows" && (
          <div className="space-y-3">
            {appData.workflows.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No workflows defined. Add a <code className="text-xs bg-gray-100 px-1 rounded">workflows</code> array to your config.
              </div>
            ) : (
              appData.workflows.map((wf, i) => (
                <div key={wf.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-violet-soft text-violet-bright text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-xs font-mono font-semibold text-gray-700">{wf.id}</span>
                    <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold">{wf.trigger}</span>
                  </div>
                  <div className="space-y-2 pl-7">
                    {wf.actions.map((action, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <span className="text-gray-300 font-mono">→</span>
                        <div>
                          <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] mr-2 ${action.type === "NOTIFY" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {action.type}
                          </span>
                          <span className="text-gray-500 font-mono">
                            {action.type === "NOTIFY" ? action.message : action.url}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    </RecordsContext.Provider>
  );
};