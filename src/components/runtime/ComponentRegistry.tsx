import React, { useState, useContext, createContext } from "react";
import { ComponentConfig } from "@/types/schema";

// ─── Form context ──────────────────────────────────────────────────────────
// Wired up by AppRuntime around any section that has at least one field-mapped
// component + an appId (i.e. a real, saved app). When present, field
// components become controlled inputs bound to `values[field]`, and a BUTTON
// in the same section submits those values as a new record via the records
// API — this is what connects "UI Preview" to "Live Data".
// When absent (no appId, or a section with no field-mapped components),
// every component below falls back to its original, inert demo behavior.
export interface FormContextValue {
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  message?: { type: "success" | "error"; text: string } | null;
}
export const FormContext = createContext<FormContextValue | null>(null);

// ─── Records context ───────────────────────────────────────────────────────
// Wired up by AppRuntime at the app level (whenever appId is present) so
// STAT / STAT_CARD components can show a real, live count instead of the
// static `props.value` baked into the config. Opt in per-component by adding
// a `computed` prop, e.g.:
//   { "type": "STAT", "label": "Total Tasks", "props": { "computed": {} } }
//   { "type": "STAT", "label": "Completed",   "props": { "computed": { "field": "status", "equals": "DONE" } } }
//   { "type": "STAT", "label": "Open",        "props": { "computed": { "field": "status", "notEquals": "DONE" } } }
// A component with no `computed` prop keeps showing its static props.value,
// exactly as before — fully backward compatible.
export interface ComputedStatSpec {
  field?: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  in?: (string | number)[];
  notIn?: (string | number)[];
}
export interface RecordsContextValue {
  records: any[];
  loading: boolean;
}
export const RecordsContext = createContext<RecordsContextValue | null>(null);

function normalize(v: any): any {
  return typeof v === "string" ? v.toLowerCase() : v;
}

function matchesComputed(record: any, spec: ComputedStatSpec): boolean {
  if (!spec.field) return true; // no field → counts every record (total)
  const val = normalize(record?.data?.[spec.field]);
  if (spec.equals !== undefined && val !== normalize(spec.equals)) return false;
  if (spec.notEquals !== undefined && val === normalize(spec.notEquals)) return false;
  if (spec.in && !spec.in.map(normalize).includes(val)) return false;
  if (spec.notIn && spec.notIn.map(normalize).includes(val)) return false;
  return true;
}

// ─── Unknown component — graceful fallback ────────────────────────────────────
const UnknownComponent: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="p-3 border border-dashed border-amber-300 bg-amber-50 rounded-lg text-amber-800 text-xs my-2 flex items-start gap-2">
    <span className="text-amber-500 mt-0.5">⚠</span>
    <div>
      <p className="font-semibold">Unknown component: &quot;{config.type}&quot;</p>
      <p className="text-amber-600 mt-0.5">This type is not registered. Rendering skipped.</p>
    </div>
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const DynamicInput: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
      <input
        type="text"
        placeholder={config.placeholder}
        value={bound ? (ctx!.values[config.field!] ?? "") : undefined}
        onChange={bound ? (e) => ctx!.onChange(config.field!, e.target.value) : undefined}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-violet/30 focus:border-violet outline-none transition bg-white text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
};


// ─── Date Input ───────────────────────────────────────────────────────────────
const DynamicDateInput: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
      <input
        type="date"
        value={bound ? (ctx!.values[config.field!] ?? "") : undefined}
        onChange={bound ? (e) => ctx!.onChange(config.field!, e.target.value) : undefined}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-violet/30 focus:border-violet outline-none transition bg-white text-gray-900"
      />
    </div>
  );
};

// ─── Textarea ─────────────────────────────────────────────────────────────────
const DynamicTextarea: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
      <textarea
        placeholder={config.placeholder}
        rows={3}
        value={bound ? (ctx!.values[config.field!] ?? "") : undefined}
        onChange={bound ? (e) => ctx!.onChange(config.field!, e.target.value) : undefined}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-violet/30 focus:border-violet outline-none transition resize-none bg-white text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
};

// ─── Select ───────────────────────────────────────────────────────────────────
const DynamicSelect: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  const options: string[] = Array.isArray(config.props?.options) ? config.props.options : [];
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
      <select
        value={bound ? (ctx!.values[config.field!] ?? "") : undefined}
        onChange={bound ? (e) => ctx!.onChange(config.field!, e.target.value) : undefined}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white text-gray-900 focus:ring-2 focus:ring-violet/30 focus:border-violet outline-none transition"
      >
        <option value="" className="text-gray-900 bg-white">Select an option...</option>
        {options.length === 0 && <option disabled className="text-gray-400 bg-white">No options configured</option>}
        {options.map((opt) => <option key={opt} value={opt} className="text-gray-900 bg-white">{opt}</option>)}
      </select>
    </div>
  );
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────
const DynamicCheckbox: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  const [localChecked, setLocalChecked] = useState(false);
  const checked = bound ? !!ctx!.values[config.field!] : localChecked;
  const toggle = () => {
    if (bound) ctx!.onChange(config.field!, !checked);
    else setLocalChecked((c) => !c);
  };
  return (
    <label className="flex items-center gap-2.5 my-1 text-sm text-gray-700 cursor-pointer select-none group">
      <div
        onClick={toggle}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${checked ? "bg-violet border-violet" : "border-gray-300 bg-white group-hover:border-violet/50"}`}
      >
        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span>{config.label}</span>
    </label>
  );
};

// ─── Button ───────────────────────────────────────────────────────────────────
const DynamicButton: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const variant = config.props?.variant ?? "primary";
  const base = "px-4 py-2 font-medium rounded-lg text-sm transition shadow-sm w-fit inline-flex items-center gap-2";
  const variants: Record<string, string> = {
    primary: `${base} bg-violet hover:bg-violet-bright text-white`,
    secondary: `${base} bg-gray-100 hover:bg-gray-200 text-gray-800`,
    danger: `${base} bg-red-500 hover:bg-red-600 text-white`,
    ghost: `${base} border border-gray-200 hover:bg-gray-50 text-gray-700`,
  };
  // A button becomes a real "submit" action when it sits in a section that
  // AppRuntime has wrapped in a FormContext (i.e. the section has at least
  // one field-mapped component and a real saved app to write to).
  const canSubmit = !!(ctx && ctx.onSubmit);
  const submitting = !!(canSubmit && ctx!.submitting);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={submitting}
        onClick={canSubmit ? () => ctx!.onSubmit!() : undefined}
        className={`${variants[variant] || variants.primary} ${submitting ? "opacity-60 cursor-wait" : ""}`}
      >
        {submitting ? "Saving..." : config.label}
      </button>
      {canSubmit && ctx!.message && (
        <span className={`text-xs font-medium ${ctx!.message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {ctx!.message.text}
        </span>
      )}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
const DynamicCard: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-card hover:shadow-hover transition my-1">
    <h4 className="text-sm font-semibold text-gray-800">{config.label}</h4>
    {config.props?.description && (
      <p className="text-xs text-gray-500 mt-1">{config.props.description}</p>
    )}
    {config.props?.value !== undefined && (
      <p className="text-2xl font-bold text-violet mt-2">{config.props.value}</p>
    )}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const DynamicBadge: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const color = config.props?.color ?? "violet";
  const colors: Record<string, string> = {
    violet: "bg-violet-soft text-violet-bright",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold my-1 w-fit ${colors[color] || colors.violet}`}>
      {config.label}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const DynamicStatCard: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const recordsCtx = useContext(RecordsContext);
  const computed: ComputedStatSpec | undefined = config.props?.computed;
  const hasLiveValue = !!(computed && recordsCtx && !recordsCtx.loading);
  const displayValue = hasLiveValue
    ? recordsCtx!.records.filter((r) => matchesComputed(r, computed!)).length
    : (config.props?.value ?? "—");

  return (
    <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-card">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{config.label}</p>
      <p className="text-3xl font-bold mt-1" style={{color:"#111827"}}>{displayValue}</p>
      {config.props?.change !== undefined && (
        <p className={`text-xs mt-1.5 font-medium ${Number(config.props.change) >= 0 ? "text-green-600" : "text-red-500"}`}>
          {Number(config.props.change) >= 0 ? "↑" : "↓"} {Math.abs(Number(config.props.change))}%
        </p>
      )}
    </div>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────
const DynamicDivider: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="flex items-center gap-3 my-2 w-full">
    <div className="flex-1 h-px bg-gray-200" />
    {config.label && <span className="text-xs text-gray-400 font-medium">{config.label}</span>}
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

// ─── Alert ────────────────────────────────────────────────────────────────────
const DynamicAlert: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const type = config.props?.type ?? "info";
  const styles: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  const icons: Record<string, string> = { info: "ℹ", success: "✓", warning: "⚠", error: "✕" };
  return (
    <div className={`flex items-start gap-2.5 p-3.5 border rounded-lg text-sm my-1 w-full ${styles[type] || styles.info}`}>
      <span className="font-bold mt-0.5">{icons[type] || "ℹ"}</span>
      <div>
        <p className="font-semibold">{config.label}</p>
        {config.props?.description && <p className="text-xs mt-0.5 opacity-80">{config.props.description}</p>}
      </div>
    </div>
  );
};

// ─── Progress ─────────────────────────────────────────────────────────────────
const DynamicProgress: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const value = Math.min(100, Math.max(0, Number(config.props?.value ?? 0)));
  return (
    <div className="w-full my-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{config.label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
const DynamicToggle: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const ctx = useContext(FormContext);
  const bound = !!(ctx && config.field);
  const [localOn, setLocalOn] = useState(false);
  const on = bound ? !!ctx!.values[config.field!] : localOn;
  const toggle = () => {
    if (bound) ctx!.onChange(config.field!, !on);
    else setLocalOn((o) => !o);
  };
  return (
    <label className="flex items-center justify-between w-full cursor-pointer my-1">
      <span className="text-sm text-gray-700">{config.label}</span>
      <button
        onClick={toggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? "bg-violet" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
};

// ─── Registry ─────────────────────────────────────────────────────────────────
const REGISTRY: Record<string, React.FC<{ config: ComponentConfig }>> = {
  INPUT: DynamicInput,
  INPUT_DATE: DynamicDateInput,
  DATE: DynamicDateInput,
  TEXTAREA: DynamicTextarea,
  SELECT: DynamicSelect,
  CHECKBOX: DynamicCheckbox,
  BUTTON: DynamicButton,
  CARD: DynamicCard,
  BADGE: DynamicBadge,
  STAT: DynamicStatCard,
  STAT_CARD: DynamicStatCard,
  DIVIDER: DynamicDivider,
  ALERT: DynamicAlert,
  PROGRESS: DynamicProgress,
  TOGGLE: DynamicToggle,
};

export const RegistryRenderer: React.FC<{ component: ComponentConfig }> = ({ component }) => {
  const ComponentImpl = REGISTRY[component.type?.toUpperCase?.() ?? ""];
  return ComponentImpl
    ? <ComponentImpl config={component} />
    : <UnknownComponent config={component} />;
};

export const SUPPORTED_TYPES = Object.keys(REGISTRY);