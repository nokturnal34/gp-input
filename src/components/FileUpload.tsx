"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  elementId: string;
  clientSlug: string;
  sheetId: string;
  driveFolderId: string;
  existingUrl?: string;
  onUploaded: (elementId: string, url: string) => void;
}

export default function FileUpload({
  elementId,
  clientSlug,
  sheetId,
  driveFolderId,
  existingUrl,
  onUploaded,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || "");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    setFileName(file.name);

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    // Upload
    setUploading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientSlug", clientSlug);
    formData.append("sheetId", sheetId);
    formData.append("elementId", elementId);
    formData.append("driveFolderId", driveFolderId);

    try {
      setProgress(60);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        setUploading(false);
        setProgress(0);
        return;
      }

      const data = await res.json();
      setProgress(100);
      setUploadedUrl(data.url);
      onUploaded(elementId, data.url);

      // Reset progress after a moment
      setTimeout(() => setProgress(0), 1000);
    } catch {
      setError("Upload failed. Please try again.");
    }

    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove("border-neutral-900");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.add("border-neutral-900");
  }

  function handleDragLeave(e: React.DragEvent) {
    e.currentTarget.classList.remove("border-neutral-900");
  }

  function handleRemove() {
    setUploadedUrl("");
    setFileName("");
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (uploadedUrl) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {preview && (
              <img src={preview} alt="Preview" className="h-10 w-10 rounded object-cover" />
            )}
            <div>
              <p className="text-sm font-medium text-green-800">
                {fileName || "File uploaded"}
              </p>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 underline"
              >
                View in Drive
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-neutral-300
                   p-6 text-center transition-colors hover:border-neutral-400"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.svg"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        {uploading ? (
          <div>
            <p className="text-sm text-neutral-600">Uploading {fileName}...</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200">
              <div
                className="h-1.5 rounded-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-600">
              Click or drag to upload
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              PNG, JPG, SVG, PDF (max 10MB)
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
