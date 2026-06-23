// src/app/builder/page.tsx
import { Suspense } from "react";
import BuilderContent from "./BuilderContent";

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center text-ink/40 text-sm font-mono">
        Loading builder...
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}