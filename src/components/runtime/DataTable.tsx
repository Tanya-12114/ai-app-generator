"use client";
import React, { useEffect, useState, useCallback } from "react";
import { DataField } from "@/types/schema";

function buildInitialFormState(dataSchema: DataField[]): Record<string, any> {
  const state: Record<string, any> = {};
  for (const f of dataSchema) {
    if (f.default !== undefined) state[f.name] = f.default;
  }
  return state;
}

type SortDir = "asc" | "desc";

export const DataTable: React.FC<{ appId: string; dataSchema: DataField[] }> = ({ appId, dataSchema }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, any>>(() => buildInitialFormState(dataSchema));
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setFormState(buildInitialFormState(dataSchema));
  }, [appId]);

  const load = useCallback(async () => {
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
  }, [appId]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived / filtered / sorted / paginated ────────────────────────────────
  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    return dataSchema.some((f) =>
      String(r.data?.[f.name] ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const av = a.data?.[sortField] ?? "";
    const bv = b.data?.[sortField] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  // ─── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const res = await fetch(`/api/apps/${appId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setFormState(buildInitialFormState(dataSchema));
      setShowForm(false);
      load();
    } else {
      setFormError(json.error || "Failed to create record");
    }
  };

  // ─── Inline Edit ────────────────────────────────────────────────────────────
  const startEdit = (record: any) => {
    setEditingId(record.id);
    setEditState({ ...record.data });
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/apps/${appId}/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    if (res.ok) { setEditingId(null); load(); }
    else {
      const json = await res.json();
      setError(json.error || "Update failed");
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await fetch(`/api/apps/${appId}/records/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  };

  // ─── CSV Import ─────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImportResult(null);
    const res = await fetch(`/api/apps/${appId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importText }),
    });
    const json = await res.json();
    if (res.ok) {
      setImportResult({ msg: `✓ Imported ${json.importedCount}, rejected ${json.rejectedCount}`, ok: true });
      setImportText("");
      load();
    } else {
      setImportResult({ msg: json.error || "Import failed", ok: false });
    }
  };

  if (dataSchema.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
        No <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">dataSchema</code> defined — add field definitions to your config to enable live CRUD.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 16 16">
            <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zm4.243-1.757 2.757 2.757" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet/20"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => setShowForm(f => !f)}
          className="ml-auto px-3 py-1.5 bg-violet hover:bg-violet-bright text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
        >
          <span>+</span> Add Record
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-violet-soft border border-violet/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-bright mb-3 uppercase tracking-wider">New Record</p>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            {dataSchema.map((f) => (
              <div key={f.name} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase text-gray-500">
                  {f.name}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {f.type === "SELECT" ? (
                  <select
                    value={formState[f.name] ?? ""}
                    onChange={(e) => setFormState(s => ({ ...s, [f.name]: e.target.value }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white min-w-[100px]"
                  >
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : f.type === "EMAIL" ? "email" : "text"}
                    value={formState[f.name] ?? ""}
                    onChange={(e) => setFormState(s => ({ ...s, [f.name]: e.target.value }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs w-32 bg-white"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-violet text-white text-xs font-semibold rounded-lg hover:bg-violet-bright transition disabled:opacity-50">
                {submitting ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
          {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
          {search ? "No records match your search." : "No records yet. Add your first one above."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {dataSchema.map((f) => (
                  <th
                    key={f.name}
                    onClick={() => handleSort(f.name)}
                    className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {f.name}
                      {sortField === f.name ? (sortDir === "asc" ? " ↑" : " ↓") : <span className="text-gray-300"> ↕</span>}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                  {dataSchema.map((f) => (
                    <td key={f.name} className="px-3 py-2.5 text-gray-700">
                      {editingId === r.id ? (
                        f.type === "SELECT" ? (
                          <select
                            value={editState[f.name] ?? ""}
                            onChange={(e) => setEditState(s => ({ ...s, [f.name]: e.target.value }))}
                            className="px-2 py-1 border border-violet/40 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet"
                          >
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                            value={editState[f.name] ?? ""}
                            onChange={(e) => setEditState(s => ({ ...s, [f.name]: e.target.value }))}
                            className="px-2 py-1 border border-violet/40 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet w-28"
                          />
                        )
                      ) : (
                        <span className="truncate max-w-[200px] block">
                          {String(r.data?.[f.name] ?? "—")}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right">
                    {editingId === r.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <button onClick={() => handleUpdate(r.id)} className="text-xs text-violet font-semibold hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(r)} className="text-xs text-gray-500 hover:text-violet font-medium">Edit</button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="px-2">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <p className="font-semibold text-gray-900 text-sm">Delete this record?</p>
            <p className="text-xs text-gray-500 mt-1">This cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4 group">
        <summary className="text-xs font-semibold text-gray-600 cursor-pointer list-none flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          CSV Import
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-[10px] text-gray-400 font-mono">
            Expected columns: {dataSchema.map(f => f.name).join(", ")}
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`${dataSchema.map(f => f.name).join(",")}\nvalue1,value2`}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet/20"
          />
          <div className="flex items-center gap-3">
            <button onClick={handleImport} disabled={!importText.trim()} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition disabled:opacity-40">
              Import CSV
            </button>
            {importResult && (
              <span className={`text-xs font-medium ${importResult.ok ? "text-green-600" : "text-red-500"}`}>
                {importResult.msg}
              </span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};
