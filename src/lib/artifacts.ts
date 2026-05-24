/**
 * Artifact fetching utility
 * Reads HTML artifacts from public/artifacts directory via internal fetch
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
    // Fetch from the static public URL (works on Vercel and localhost)
    const url = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/artifacts/${client}/${slug}.html`;

    const response = await fetch(url, {
      // Verify artifact exists, don't follow redirects for 404s
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
