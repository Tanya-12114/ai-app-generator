"use client";
import React, { useEffect, useState } from "react";
import { DataField } from "@/types/schema";

// FIX: the backend now applies a field's configured `default` when it's
// omitted from a create request (see applyFieldDefaults in types/schema.ts).
// The form itself still started every field blank, so a user filling out
// the form by hand never saw the default they configured — it only ever
// took effect for requests that omitted the field outright (e.g. a CSV row
// with a missing column). This pre-fills the form with declared defaults
// so the two paths behave consistently.
function buildInitialFormState(dataSchema: DataField[]): Record<string, any> {
  const state: Record<string, any> = {};
  for (const f of dataSchema) {
    if (f.default !== undefined) state[f.name] = f.default;
  }
  return state;
}

// Renders + drives full CRUD against the dynamically generated backend
// (`/api/apps/[id]/records`) for whatever `dataSchema` an app declares.
export const DataTable: React.FC<{ appId: string; dataSchema: DataField[] }> = ({ appId, dataSchema }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, any>>(() => buildInitialFormState(dataSchema));
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  // dataSchema can change if the app's config is edited while this page is
  // open; keep the form's defaults in sync rather than freezing them at
  // first mount.
  useEffect(() => {
    setFormState(buildInitialFormState(dataSchema));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}/records`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load records");
      setRecords(json.records || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/apps/${appId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });
    const json = await res.json();
    if (res.ok) {
      setFormState(buildInitialFormState(dataSchema));
      load();
    } else {
      setError(json.error || "Failed to create record");
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/apps/${appId}/records/${id}`, { method: "DELETE" });
    load();
  };

  const handleImport = async () => {
    setImportResult(null);
    const res = await fetch(`/api/apps/${appId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importText }),
    });
    const json = await res.json();
    if (res.ok) {
      setImportResult(`Imported ${json.importedCount}, rejected ${json.rejectedCount}.`);
      setImportText("");
      load();
    } else {
      setImportResult(json.error || "Import failed");
    }
  };

  if (dataSchema.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
        No <code>dataSchema</code> defined — add field definitions to your config to enable live CRUD data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-4">
        {dataSchema.map((f) => (
          <div key={f.name} className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase text-gray-500">{f.name}{f.required && " *"}</label>
            {f.type === "SELECT" ? (
              <select
                value={formState[f.name] ?? ""}
                onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
              >
                <option value="">Select...</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                value={formState[f.name] ?? ""}
                onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs w-32"
              />
            )}
          </div>
        ))}
        <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition">
          Add Record
        </button>
      </form>

      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-semibold text-gray-600 cursor-pointer">CSV Import</summary>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={`${dataSchema.map((f) => f.name).join(",")}\nvalue1,value2`}
          rows={4}
          className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono"
        />
        <button onClick={handleImport} className="mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition">
          Import CSV
        </button>
        {importResult && <p className="text-xs mt-2 text-gray-600">{importResult}</p>}
      </details>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No records yet.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {dataSchema.map((f) => (
                  <th key={f.name} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">{f.name}</th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  {dataSchema.map((f) => (
                    <td key={f.name} className="px-3 py-2 text-gray-700">{String(r.data?.[f.name] ?? "—")}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
