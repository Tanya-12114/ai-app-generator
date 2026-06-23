"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = password.length === 0 ? null : password.length < 6 ? "weak" : password.length < 10 ? "fair" : "strong";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) router.push("/login");
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-violet-bright mx-auto flex items-center justify-center shadow-glow mb-4">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="text-xl font-bold text-ink">Create account</h1>
          <p className="text-sm text-muted mt-1">Get started with AI App Generator</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Name <span className="text-muted/60 normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Min 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {passwordStrength && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1">
                  {["weak","fair","strong"].map((s, i) => (
                    <div key={s} className={`h-1 w-10 rounded-full transition-colors ${
                      (passwordStrength === "weak" && i === 0) ? "bg-red-400" :
                      (passwordStrength === "fair" && i <= 1) ? "bg-amber-400" :
                      (passwordStrength === "strong") ? "bg-green-500" :
                      "bg-line"
                    }`} />
                  ))}
                </div>
                <span className={`text-[10px] font-medium capitalize ${
                  passwordStrength === "weak" ? "text-red-500" :
                  passwordStrength === "fair" ? "text-amber-500" :
                  "text-green-600"
                }`}>{passwordStrength}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <span>✕</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet hover:bg-violet-bright text-white text-sm font-semibold rounded-xl transition shadow-card disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-violet font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}