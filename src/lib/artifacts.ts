/**
 * Artifact fetching utility via GitHub API
 * Reads HTML artifacts from the gp repo (nexus-gp)
 */

interface FetchArtifactResult {
  content: string | null;
  error?: string;
}

export async function readArtifactFile(
  client: string,
  slug: string
): Promise<FetchArtifactResult> {
  const localPath = process.env.GP_REPO_PATH || "/Users/ericpoon/ai/gp";
  const filePath = `${localPath}/04-workspace/00-clients/${client}/60-artifacts/${slug}.html`;

  console.log(`[artifacts] Reading from local path: ${filePath}`);

  // Try local file first (for development)
  try {
    const fs = await import("fs").then(m => m.promises);
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`[artifacts] Successfully read local file`);
    return { content };
  } catch (err) {
    console.log(`[artifacts] Local file error:`, err instanceof Error ? err.message : String(err));
    // If local file not found, try GitHub API
  }

  const owner = process.env.GITHUB_REPO_OWNER || "nokturnal34";
  const repo = process.env.GITHUB_REPO_NAME || "nexus-gp";
  const token = process.env.GITHUB_TOKEN;

  // Construct GitHub raw content URL
  const path = `04-workspace/00-clients/${client}/60-artifacts/${slug}.html`;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `token ${token}` } : undefined,
    });

    // 404 = artifact not found
    if (response.status === 404) {
      return { content: null };
    }

    // Other errors
    if (!response.ok) {
      return {
        content: null,
        error: `GitHub API error: ${response.status}`,
      };
    }

    const content = await response.text();
    return { content };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { content: null, error };
  }
}
