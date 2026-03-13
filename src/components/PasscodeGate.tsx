"use client";

import { useState } from "react";

interface PasscodeGateProps {
  clientSlug: string;
  onAuth: (passcode: string) => Promise<boolean>;
}

export default function PasscodeGate({ clientSlug, onAuth }: PasscodeGateProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    setError("");

    const success = await onAuth(passcode.trim());
    if (!success) {
      setError("Incorrect passcode. Please try again.");
      setPasscode("");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-neutral-800">
            General Proxy
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Deck Input</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="passcode"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Enter your access code
            </label>
            <input
              id="passcode"
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. klothos-2026"
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm
                         focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900
                         placeholder:text-neutral-400"
              autoFocus
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !passcode.trim()}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white
                       hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-neutral-400">
          Don&apos;t have a code?{" "}
          <a
            href="mailto:hello@generalproxy.com"
            className="underline hover:text-neutral-600"
          >
            Contact General Proxy
          </a>
        </p>
      </div>
    </main>
  );
}
