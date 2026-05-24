/**
 * Artifact fetching utility via Google Drive
 * Reads HTML artifacts from Google Drive using service account
 */

interface FetchArtifactResult {
  content: string | null;
  error?: string;
}

// Map of client/slug to Google Drive file IDs
const artifactFileIds: Record<string, string> = {
  "moom/moom-health-market-intelligence-report": "1It_GzsaZJ3JnFw8yr7SHBbsJKGwhMDAa",
};

export async function readArtifactFile(
  client: string,
  slug: string
): Promise<FetchArtifactResult> {
  const key = `${client}/${slug}`;
  const fileId = artifactFileIds[key];

  if (!fileId) {
    return {
      content: null,
      error: "Artifact not found",
    };
  }

  try {
    // For now, use the public sharing link (file must be shared)
    // Production: Should use service account auth for private files
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url);

    if (response.status === 404) {
      return { content: null };
    }

    if (!response.ok) {
      return {
        content: null,
        error: `Google Drive error: ${response.status}`,
      };
    }

    const content = await response.text();
    return { content };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { content: null, error };
  }
}
