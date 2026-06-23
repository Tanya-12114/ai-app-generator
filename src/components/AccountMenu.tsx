"use client";
import React, { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

export const AccountMenu: React.FC<{ email?: string | null; name?: string | null }> = ({ email, name }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        className="w-7 h-7 rounded-full bg-violet-soft text-violet-bright text-xs font-bold flex items-center justify-center border border-violet/20 hover:ring-2 hover:ring-violet/20 transition"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-2xl shadow-glow z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            {name && <p className="text-xs font-semibold text-ink truncate">{name}</p>}
            <p className="text-xs text-muted truncate">{email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left text-xs px-4 py-2.5 text-muted hover:text-ink hover:bg-raised transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};