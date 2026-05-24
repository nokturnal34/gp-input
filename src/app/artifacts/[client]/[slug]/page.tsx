"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";

interface Artifact {
  content: string;
  client: string;
  slug: string;
}

export default function ArtifactPage() {
  const params = useParams();
  const router = useRouter();
  const client = params.client as string;
  const slug = params.slug as string;

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check authentication and fetch artifact
  useEffect(() => {
    const fetchArtifact = async () => {
      try {
        // Fetch artifact from API route (auth is server-side via httpOnly cookie)
        const response = await fetch(
          `/api/artifacts/${client}/${slug}`,
          { credentials: 'include' }
        );

        if (response.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (response.status === 404) {
          setError("Artifact not found");
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(
            data.error || `Error: ${response.status}`
          );
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        console.log("[artifact-page] Fetched artifact:", { hasContent: !!data.content, contentLength: data.content?.length });
        setIsAuthenticated(true);
        setArtifact({
          content: data.content,
          client,
          slug,
        });
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtifact();
  }, [client, slug, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading artifact...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PasscodeGate
        clientSlug={client}
        onAuth={async (passcode: string) => {
          try {
            const response = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clientSlug: client, passcode }),
            });
            if (response.ok) {
              setRefreshTrigger(t => t + 1);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No artifact found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Back button */}
      <div className="border-b border-gray-200 px-8 py-4">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back
        </button>
      </div>

      {/* Artifact content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: artifact.content }}
        />
      </div>
    </div>
  );
}
