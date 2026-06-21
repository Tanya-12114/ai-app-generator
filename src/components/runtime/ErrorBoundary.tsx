"use client";
import React from "react";

// Catches render-time exceptions thrown by REGISTRY components (e.g. a
// component type that "exists" but throws on bad props) so a single broken
// widget can never take down the whole generated application.
export class RuntimeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("AppRuntime caught a render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm">
          <p className="font-bold">⚠️ Runtime recovered from a render failure</p>
          <p className="mt-1 text-xs font-mono text-red-700">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
