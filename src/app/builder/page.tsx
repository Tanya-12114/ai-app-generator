// src/app/builder/page.tsx
import { Suspense } from "react";
import BuilderContent from "./BuilderContent";

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
        Loading builder...
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}