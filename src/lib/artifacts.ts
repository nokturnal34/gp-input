/**
 * Artifact fetching utility
 * Reads HTML artifacts from public/artifacts directory
 */

interface FetchArtifactResult {
  content: string | null;
  error?: string;
}

export async function readArtifactFile(
  client: string,
  slug: string
): Promise<FetchArtifactResult> {
  try {
    // Artifact files stored in public/artifacts/{client}/{slug}.html
    const url = `/artifacts/${client}/${slug}.html`;
    const response = await fetch(url);

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
