/**
 * Artifact fetching utility
 * Reads HTML artifacts from public/artifacts directory via internal fetch
 */

import { NextRequest } from "next/server";

interface FetchArtifactResult {
  content: string | null;
  error?: string;
}

export async function readArtifactFile(
  client: string,
  slug: string,
  request?: NextRequest
): Promise<FetchArtifactResult> {
  try {
    // Determine the base URL
    let baseUrl = "";

    if (request) {
      // Use the request headers to get the correct host
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
      const protocol = request.headers.get("x-forwarded-proto") || "https";
      if (host) {
        baseUrl = `${protocol}://${host}`;
      }
    }

    if (!baseUrl) {
      // Fallback to VERCEL_URL
      baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    }

    // Artifact files stored in public/artifacts/{client}/{slug}.html
    const url = `${baseUrl}/artifacts/${client}/${slug}.html`;

    const response = await fetch(url, {
      redirect: "manual",
    });

    if (response.status === 404) {
      return { content: null };
    }

    if (!response.ok) {
      return {
        content: null,
        error: `Error loading artifact: ${response.status}`,
      };
    }

    const content = await response.text();
    return { content };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { content: null, error };
  }
}
