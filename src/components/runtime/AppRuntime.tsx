"use client";
import React from "react";
import { AppConfigSchema } from "@/types/schema";
import { RegistryRenderer } from "./ComponentRegistry";
import { RuntimeErrorBoundary } from "./ErrorBoundary";
import { DataTable } from "./DataTable";

// `appId` is optional: when rendering a live preview during config editing
// (builder page) there's no persisted app yet, so the data/CRUD panel is
// skipped and only the UI rendering engine runs.
export const AppRuntime: React.FC<{ rawConfig: any; appId?: string }> = ({ rawConfig, appId }) => {
  const parsed = AppConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-sm">
        <h3 className="font-bold">❌ Schema Aggregation Failure Prevented</h3>
        <p className="mt-1">The application layout config file is heavily malformed:</p>
        <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-x-auto">{JSON.stringify(parsed.error.format(), null, 2)}</pre>
      </div>
    );
  }

  const appData = parsed.data;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
        <h2 className="text-base font-bold tracking-tight">{appData.appName}</h2>
        <span className="text-xs bg-gray-800 text-gray-400 font-mono px-2 py-0.5 rounded">Build Env: v{appData.version}</span>
      </div>
      <div className="p-6 space-y-6 bg-gray-50/50">
        {appData.sections.map((section) => (
          <div key={section.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">{section.title}</h3>
            <div className={`
              ${section.layout === "GRID" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : ""}
              ${section.layout === "STACK" ? "flex flex-col gap-2" : ""}
              ${section.layout === "RESPONSIVE" ? "flex flex-col md:flex-row gap-4 items-end" : ""}
            `}>
              {section.components?.map((comp: any, i: number) => (
                <RuntimeErrorBoundary key={comp?.id || `fallback-key-${i}`}>
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
        ))}

        {appId && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Live Data &amp; CRUD Runtime</h3>
            <DataTable appId={appId} dataSchema={appData.dataSchema} />
          </div>
        )}
      </div>
    </div>
  );
};
