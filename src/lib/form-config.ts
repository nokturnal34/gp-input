import { readSheet } from "./google";

export interface FormPlaceholder {
  slideNumber: string;
  elementId: string;
  marker: string;
  promptText: string;
  clientResponse: string;
  status: string;
  thumbnailUrl: string;
}

export interface FormConfig {
  client: string;
  sheetId: string;
  driveFolderId: string;
  placeholders: FormPlaceholder[];
}

/**
 * Registry of client slugs → Sheet IDs.
 * Stored as a "config" row in each Sheet (row with slide_number = "_config").
 *
 * For now, we use a simple lookup sheet. The deploy script writes
 * a registry entry when a new client form is created.
 */
const REGISTRY_SHEET_ID = process.env.REGISTRY_SHEET_ID || "";

/**
 * Look up a client's Sheet ID from the registry.
 */
export async function getClientSheetId(clientSlug: string): Promise<{
  sheetId: string;
  passcode: string;
  client: string;
  driveFolderId: string;
  published: boolean;
} | null> {
  if (!REGISTRY_SHEET_ID) {
    throw new Error("REGISTRY_SHEET_ID environment variable is not set");
  }

  const rows = await readSheet(REGISTRY_SHEET_ID);
  const match = rows.find(
    (row) => row.client_slug === clientSlug
  );

  if (!match) return null;

  return {
    sheetId: match.sheet_id,
    passcode: match.passcode,
    client: match.client_name,
    driveFolderId: match.drive_folder_id || "",
    published: match.published?.toLowerCase() === "true",
  };
}

/**
 * Load a client's form configuration from their Google Sheet.
 */
export async function loadFormConfig(
  sheetId: string,
  clientName: string
): Promise<FormConfig> {
  const rows = await readSheet(sheetId);

  // Filter out config rows and dismissed fields
  const placeholders: FormPlaceholder[] = rows
    .filter((row) => row.slide_number && row.slide_number !== "_config" && row.status !== "dismissed")
    .map((row) => ({
      slideNumber: row.slide_number,
      elementId: row.element_id,
      marker: row.placeholder_marker,
      promptText: row.prompt_text,
      clientResponse: row.client_response || "",
      status: row.status || "pending",
      thumbnailUrl: row.slide_thumbnail_url || "",
    }));

  return {
    client: clientName,
    sheetId,
    driveFolderId: "",
    placeholders,
  };
}
