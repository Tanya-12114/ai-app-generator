"use client";
import React from "react";

export class RuntimeErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode; label?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error(`[RuntimeErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 border border-dashed border-red-200 bg-red-50/50 rounded-lg text-xs my-1 flex items-start gap-2">
          <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="font-semibold text-red-700">
              {this.props.label ? `"${this.props.label}" failed to render` : "Component render error"}
            </p>
            <p className="text-red-500 font-mono mt-0.5">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
