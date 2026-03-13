"use client";

import { useState, useMemo } from "react";
import SlideCard from "./SlideCard";
import type { FormConfig } from "@/lib/form-config";

interface InputFormProps {
  config: FormConfig;
  clientSlug: string;
  clientName: string;
}

export default function InputForm({ config, clientSlug, clientName }: InputFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Initialize with existing responses
    const init: Record<string, string> = {};
    for (const ph of config.placeholders) {
      if (ph.clientResponse) {
        init[ph.elementId] = ph.clientResponse;
      }
    }
    return init;
  });

  const [deferred, setDeferred] = useState<Set<string>>(() => {
    return new Set(
      config.placeholders
        .filter((ph) => ph.status === "deferred")
        .map((ph) => ph.elementId)
    );
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Group placeholders by slide
  const slideGroups = useMemo(() => {
    const groups: Record<string, typeof config.placeholders> = {};
    for (const ph of config.placeholders) {
      if (!groups[ph.slideNumber]) groups[ph.slideNumber] = [];
      groups[ph.slideNumber].push(ph);
    }
    return Object.entries(groups).sort(
      ([a], [b]) => parseInt(a) - parseInt(b)
    );
  }, [config.placeholders]);

  // Progress
  const totalFields = config.placeholders.length;
  const filledFields = config.placeholders.filter(
    (ph) =>
      ph.status === "filled" ||
      values[ph.elementId]?.trim() ||
      deferred.has(ph.elementId)
  ).length;
  const progressPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  function handleValueChange(elementId: string, value: string) {
    setValues((prev) => ({ ...prev, [elementId]: value }));
  }

  function handleDeferChange(elementId: string, checked: boolean) {
    setDeferred((prev) => {
      const next = new Set(prev);
      if (checked) next.add(elementId);
      else next.delete(elementId);
      return next;
    });
  }

  function handleFileUploaded(elementId: string, url: string) {
    setValues((prev) => ({ ...prev, [elementId]: url }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      // Filter to only new/changed text responses (files are uploaded immediately)
      const textResponses: Record<string, string> = {};
      for (const [elementId, value] of Object.entries(values)) {
        const ph = config.placeholders.find((p) => p.elementId === elementId);
        if (!ph) continue;
        // Skip if unchanged from existing response
        if (ph.clientResponse === value) continue;
        // Skip file uploads (already saved)
        if (value.startsWith("https://drive.google.com")) continue;
        if (value.trim()) {
          textResponses[elementId] = value;
        }
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSlug,
          sheetId: config.sheetId,
          responses: textResponses,
          deferred: Array.from(deferred),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Submission failed. Please try again.");
    }

    setSubmitting(false);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center max-w-sm px-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800">
            Responses submitted
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Thank you! The General Proxy team will review your inputs and follow
            up if anything else is needed.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              window.location.reload();
            }}
            className="mt-6 text-sm text-neutral-500 underline"
          >
            Make changes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-neutral-800">
                {clientName}
              </h1>
              <p className="text-xs text-neutral-500">Deck Input</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">
                {filledFields}/{totalFields} items
              </span>
              <div className="h-1.5 w-20 rounded-full bg-neutral-200">
                <div
                  className="h-1.5 rounded-full bg-neutral-900 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form Body */}
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-neutral-600">
          Fill in the items below for your deck. You can submit partial
          responses and come back to complete the rest later.
        </p>

        {slideGroups.map(([slideNum, placeholders]) => (
          <SlideCard
            key={slideNum}
            slideNumber={slideNum}
            placeholders={placeholders}
            clientSlug={clientSlug}
            sheetId={config.sheetId}
            driveFolderId={config.driveFolderId}
            values={values}
            deferred={deferred}
            onValueChange={handleValueChange}
            onDeferChange={handleDeferChange}
            onFileUploaded={handleFileUploaded}
          />
        ))}
      </div>

      {/* Footer / Submit */}
      <div className="fixed bottom-0 inset-x-0 border-t border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Powered by General Proxy
          </p>

          <div className="flex items-center gap-3">
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white
                         hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {submitting ? "Submitting..." : "Submit responses"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
