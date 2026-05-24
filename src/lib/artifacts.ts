/**
 * Artifact fetching utility
 * Reads HTML artifacts from public/artifacts directory
 */

import { readFile } from "fs/promises";
import { join } from "path";

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
    // Use __dirname to find the current directory reliably on Vercel
    const rootDir = join(__dirname, "..", "..");
    const filePath = join(
      rootDir,
      "public",
      "artifacts",
      client,
      `${slug}.html`
    );

    const content = await readFile(filePath, "utf-8");
    return { content };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      return { content: null };
    }
    const error = err instanceof Error ? err.message : "Unknown error";
    return { content: null, error };
  }
}
