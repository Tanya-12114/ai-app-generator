import React from "react";
import { ComponentConfig } from "@/types/schema";

const UnknownComponent: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="p-4 border border-dashed border-red-300 bg-red-50 rounded-lg text-red-800 text-xs my-2">
    <p className="font-semibold">⚠️ Component Render Blocked</p>
    <p>Type &quot;{config.type}&quot; is not currently supported by this application metadata compiler.</p>
  </div>
);

const DynamicInput: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="flex flex-col gap-1 my-2 w-full">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
    <input type="text" placeholder={config.placeholder} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none transition" />
  </div>
);

const DynamicTextarea: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="flex flex-col gap-1 my-2 w-full">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
    <textarea placeholder={config.placeholder} rows={3} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none" />
  </div>
);

const DynamicSelect: React.FC<{ config: ComponentConfig }> = ({ config }) => {
  const options: string[] = Array.isArray(config.props?.options) ? config.props.options : [];
  return (
    <div className="flex flex-col gap-1 my-2 w-full">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{config.label}</label>
      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition">
        {options.length === 0 && <option>No options configured</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
};

const DynamicCheckbox: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <label className="flex items-center gap-2 my-2 text-sm text-gray-700">
    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
    {config.label}
  </label>
);

const DynamicButton: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm w-fit">
    {config.label}
  </button>
);

const DynamicCard: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm my-2">
    <h4 className="text-sm font-bold text-gray-700">{config.label}</h4>
  </div>
);

const DynamicBadge: React.FC<{ config: ComponentConfig }> = ({ config }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 my-1 w-fit">
    {config.label}
  </span>
);

const REGISTRY: Record<string, React.FC<{ config: ComponentConfig }>> = {
  INPUT: DynamicInput,
  TEXTAREA: DynamicTextarea,
  SELECT: DynamicSelect,
  CHECKBOX: DynamicCheckbox,
  BUTTON: DynamicButton,
  CARD: DynamicCard,
  BADGE: DynamicBadge,
};

export const RegistryRenderer: React.FC<{ component: ComponentConfig }> = ({ component }) => {
  const ComponentImpl = REGISTRY[component.type.toUpperCase()];
  return ComponentImpl ? <ComponentImpl config={component} /> : <UnknownComponent config={component} />;
};
