"use client";

import { useState } from "react";
import FileUpload from "./FileUpload";
import type { FormPlaceholder } from "@/lib/form-config";

interface SlideCardProps {
  slideNumber: string;
  placeholders: FormPlaceholder[];
  clientSlug: string;
  sheetId: string;
  driveFolderId: string;
  values: Record<string, string>;
  deferred: Set<string>;
  comment: string;
  onValueChange: (elementId: string, value: string) => void;
  onDeferChange: (elementId: string, checked: boolean) => void;
  onCommentChange: (slideNumber: string, comment: string) => void;
  onFileUploaded: (elementId: string, url: string) => void;
}

function classifyFieldType(marker: string, promptText: string): "short" | "long" | "file" {
  const text = `${marker} ${promptText}`.toLowerCase();

  const fileKeywords = ["logo", "image", "graphic", "photo", "headshot", "screenshot", "icon", "upload", "attach", "visual", "thumbnail", "chart", "data", "diagram", "isometric", "exploded"];
  if (fileKeywords.some((kw) => text.includes(kw))) return "file";

  const longKeywords = ["bio", "description", "projection", "narrative", "financial", "update with", "complete this", "overview", "summary", "background"];
  if (longKeywords.some((kw) => text.includes(kw))) return "long";

  return "short";
}

export default function SlideCard({
  slideNumber,
  placeholders,
  clientSlug,
  sheetId,
  driveFolderId,
  values,
  deferred,
  comment,
  onValueChange,
  onDeferChange,
  onCommentChange,
  onFileUploaded,
}: SlideCardProps) {
  const dataPhs = placeholders.filter(
    (ph) => classifyFieldType(ph.marker, ph.promptText) !== "file"
  );
  const mediaPhs = placeholders.filter(
    (ph) => classifyFieldType(ph.marker, ph.promptText) === "file"
  );

  const filledCount = placeholders.filter(
    (ph) =>
      ph.status === "filled" ||
      values[ph.elementId]?.trim() ||
      deferred.has(ph.elementId)
  ).length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Slide Thumbnail */}
      {placeholders[0]?.thumbnailUrl && (
        <div className="bg-neutral-50 border-b border-neutral-100">
          <img
            src={placeholders[0].thumbnailUrl}
            alt={`Slide ${slideNumber}`}
            className="w-full"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
            {slideNumber}
          </span>
          <span className="text-sm font-medium text-neutral-700">
            Slide {slideNumber}
          </span>
        </div>
        <span className="text-xs text-neutral-400">
          {filledCount}/{placeholders.length} filled
        </span>
      </div>

      {/* Data/Input Fields */}
      {dataPhs.length > 0 && (
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Data / Input
          </p>
          {dataPhs.map((ph) => {
            const fieldType = classifyFieldType(ph.marker, ph.promptText);
            const isDeferred = deferred.has(ph.elementId);
            const isFilled = ph.status === "filled";

            return (
              <div key={ph.elementId} className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {formatLabel(ph.marker)}
                </label>
                {ph.promptText && ph.promptText !== ph.marker && (
                  <p className="text-xs text-neutral-500">{ph.promptText}</p>
                )}

                {fieldType === "long" ? (
                  <textarea
                    value={values[ph.elementId] || (isFilled ? ph.clientResponse : "")}
                    onChange={(e) => onValueChange(ph.elementId, e.target.value)}
                    placeholder="Type your response here..."
                    rows={3}
                    disabled={isDeferred}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                               focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900
                               disabled:bg-neutral-50 disabled:text-neutral-400
                               placeholder:text-neutral-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[ph.elementId] || (isFilled ? ph.clientResponse : "")}
                    onChange={(e) => onValueChange(ph.elementId, e.target.value)}
                    placeholder="Type your response here..."
                    disabled={isDeferred}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                               focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900
                               disabled:bg-neutral-50 disabled:text-neutral-400
                               placeholder:text-neutral-400"
                  />
                )}

                <label className="flex items-center gap-2 text-xs text-neutral-500">
                  <input
                    type="checkbox"
                    checked={isDeferred}
                    onChange={(e) => onDeferChange(ph.elementId, e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  Will provide later
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Fields */}
      {mediaPhs.length > 0 && (
        <div className="border-t border-neutral-100 px-5 py-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            Media Requests
          </p>
          {mediaPhs.map((ph) => {
            const isDeferred = deferred.has(ph.elementId);

            return (
              <div key={ph.elementId} className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {formatLabel(ph.marker)}
                </label>
                {ph.promptText && ph.promptText !== ph.marker && (
                  <p className="text-xs text-neutral-500">{ph.promptText}</p>
                )}

                {isDeferred ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center text-sm text-neutral-400">
                    Marked as &quot;will provide later&quot;
                  </div>
                ) : (
                  <FileUpload
                    elementId={ph.elementId}
                    clientSlug={clientSlug}
                    sheetId={sheetId}
                    driveFolderId={driveFolderId}
                    existingUrl={ph.status === "filled" ? ph.clientResponse : undefined}
                    onUploaded={onFileUploaded}
                  />
                )}

                <label className="flex items-center gap-2 text-xs text-neutral-500">
                  <input
                    type="checkbox"
                    checked={isDeferred}
                    onChange={(e) => onDeferChange(ph.elementId, e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  Will provide later
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide Comment */}
      <div className="border-t border-neutral-100 px-5 py-4">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          General comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(slideNumber, e.target.value)}
          placeholder="Any additional notes or context for this slide..."
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                     focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900
                     placeholder:text-neutral-400"
        />
      </div>
    </div>
  );
}

function formatLabel(marker: string): string {
  let label = marker.replace(/^\[|\]$/g, "").replace(/^INCOMPLETE:\s*/i, "");
  if (label === label.toUpperCase() && label.length > 1) {
    label = label
      .split(/[\s_]+/)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  }
  return label;
}
