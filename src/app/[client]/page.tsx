"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PasscodeGate from "@/components/PasscodeGate";
import InputForm from "@/components/InputForm";
import type { FormConfig } from "@/lib/form-config";

export default function ClientFormPage() {
  const params = useParams();
  const clientSlug = params.client as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [clientName, setClientName] = useState("");
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(false);

  // Check if already authenticated (cookie exists)
  useEffect(() => {
    loadForm();
  }, []);

  async function loadForm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/form/${clientSlug}`);
      if (res.status === 401) {
        // Not authenticated yet
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setDraft(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load form");
        setLoading(false);
        return;
      }
      const data: FormConfig = await res.json();
      setFormConfig(data);
      setClientName(data.client);
      setAuthenticated(true);
    } catch {
      setError("Failed to connect. Please try again.");
    }
    setLoading(false);
  }

  async function handleAuth(passcode: string): Promise<boolean> {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSlug, passcode }),
      });

      if (res.status === 403) {
        setDraft(true);
        return false;
      }
      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      setClientName(data.client);
      // Now load the form
      await loadForm();
      return true;
    } catch {
      return false;
    }
  }

  if (draft) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Coming Soon</h1>
          <p className="text-neutral-500">
            This form is being prepared by General Proxy and will be available shortly.
          </p>
          <p className="text-neutral-400 text-sm mt-6">
            Questions? Contact your GP representative.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-neutral-500 underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return <PasscodeGate clientSlug={clientSlug} onAuth={handleAuth} />;
  }

  if (!formConfig) return null;

  return <InputForm config={formConfig} clientSlug={clientSlug} clientName={clientName} />;
}
