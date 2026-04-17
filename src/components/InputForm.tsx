"use client";

import { useState, useMemo, useCallback } from "react";
import SlideCard from "./SlideCard";
import { ProgressBar } from "./ui/ProgressBar";
import { calculateFilledCount, buildTextResponses } from "@/lib/form-utils";
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

  const [comments, setComments] = useState<Record<string, string>>(() => {
    // Initialize with existing slide comments
    return { ...config.slideComments };
  });

  const [cleared, setCleared] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  // Progress - memoized to ensure it updates correctly
  const { totalFields, filledFields, progressPct } = useMemo(() => {
    const total = config.placeholders.length;
    const filled = calculateFilledCount(config.placeholders, values, deferred, cleared);
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { totalFields: total, filledFields: filled, progressPct: pct };
  }, [config.placeholders, values, deferred, cleared]);

  function handleValueChange(elementId: string, value: string) {
    setValues((prev) => ({ ...prev, [elementId]: value }));
    // When user types, remove from cleared set (only if it was cleared)
    if (value.trim()) {
      setCleared((prev) => {
        if (!prev.has(elementId)) return prev; // No-op if not in cleared set
        const next = new Set(prev);
        next.delete(elementId);
        return next;
      });
    }
  }

  function handleClear(elementId: string) {
    setValues((prev) => ({ ...prev, [elementId]: "" }));
    setCleared((prev) => new Set([...prev, elementId]));
    // Also remove from deferred if present
    setDeferred((prev) => {
      const next = new Set(prev);
      next.delete(elementId);
      return next;
    });
  }

  function handleDeferChange(elementId: string, checked: boolean) {
    setDeferred((prev) => {
      const next = new Set(prev);
      if (checked) next.add(elementId);
      else next.delete(elementId);
      return next;
    });
  }

  function handleCommentChange(slideNumber: string, comment: string) {
    setComments((prev) => ({ ...prev, [slideNumber]: comment }));
  }

  function handleFileUploaded(elementId: string, url: string) {
    setValues((prev) => ({ ...prev, [elementId]: url }));
    // If file is cleared (empty string), add to cleared set
    if (!url) {
      setCleared((prev) => new Set([...prev, elementId]));
    } else {
      // If file is uploaded, remove from cleared set
      setCleared((prev) => {
        const next = new Set(prev);
        next.delete(elementId);
        return next;
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const textResponses = buildTextResponses(values, config.placeholders);

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSlug,
          sheetId: config.sheetId,
          responses: textResponses,
          deferred: Array.from(deferred),
          cleared: Array.from(cleared),
          slideComments: comments,
          saveOnly: true,  // Flag to skip marking as "filled"
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Save failed");
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Save failed. Please try again.");
    }

    setSaving(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      const textResponses = buildTextResponses(values, config.placeholders);

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSlug,
          sheetId: config.sheetId,
          responses: textResponses,
          deferred: Array.from(deferred),
          cleared: Array.from(cleared),
          slideComments: comments,
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
              <ProgressBar percentage={progressPct} width="w-20" />
            </div>
          </div>
        </div>
      </header>

      {/* Form Body */}
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-neutral-600">
          Fill in the items below for your deck. Use <span className="font-medium">"Save & continue later"</span> to preserve progress and come back anytime.
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
            cleared={cleared}
            comment={comments[slideNum] || ""}
            onValueChange={handleValueChange}
            onDeferChange={handleDeferChange}
            onClear={handleClear}
            onCommentChange={handleCommentChange}
            onFileUploaded={handleFileUploaded}
          />
        ))}
      </div>

      {/* Footer / Submit */}
      <div className="fixed bottom-0 inset-x-0 border-t border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs text-neutral-400">
              Powered by General Proxy
            </p>
            {saved && (
              <p className="text-xs text-green-600 font-medium">✓ Progress saved</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || submitting}
              className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700
                         hover:bg-neutral-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              {saving ? "Saving..." : "Save & continue later"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || saving}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white
                         hover:bg-neutral-800 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              {submitting ? "Submitting..." : "Submit responses"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
