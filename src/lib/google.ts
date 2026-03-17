import { google, sheets_v4, drive_v3 } from "googleapis";

let sheetsClient: sheets_v4.Sheets | null = null;
let driveClient: drive_v3.Drive | null = null;

function getAuth() {
  let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
  }

  // Strip wrapping quotes if Vercel double-quoted the value
  credentialsJson = credentialsJson.trim();
  if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = JSON.parse(credentialsJson);
  }

  const credentials = JSON.parse(credentialsJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

export function getSheets(): sheets_v4.Sheets {
  if (!sheetsClient) {
    sheetsClient = google.sheets({ version: "v4", auth: getAuth() });
  }
  return sheetsClient;
}

export function getDrive(): drive_v3.Drive {
  if (!driveClient) {
    driveClient = google.drive({ version: "v3", auth: getAuth() });
  }
  return driveClient;
}

/**
 * Read all rows from a Google Sheet.
 * Returns array of objects keyed by header names.
 */
export async function readSheet(
  sheetId: string,
  range: string = "Sheet1"
): Promise<Record<string, string>[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0] as string[];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = (row[i] as string) || "";
    });
    return obj;
  });
}

/**
 * Write a value to a specific cell in a Google Sheet.
 */
export async function writeCell(
  sheetId: string,
  range: string,
  value: string
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

/**
 * Find a row by element_id and update response columns.
 */
export async function updateResponse(
  sheetId: string,
  elementId: string,
  response: string
): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1",
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return false;

  const headers = rows[0] as string[];
  const elementIdCol = headers.indexOf("element_id");
  const responseCol = headers.indexOf("client_response");
  const timestampCol = headers.indexOf("submitted_at");
  const statusCol = headers.indexOf("status");

  if (elementIdCol === -1 || responseCol === -1) return false;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][elementIdCol] === elementId) {
      const rowNum = i + 1; // 1-indexed
      const now = new Date().toISOString();

      // Batch update: response, timestamp, status
      const updates: { range: string; values: string[][] }[] = [
        {
          range: `Sheet1!${colLetter(responseCol)}${rowNum}`,
          values: [[response]],
        },
      ];

      if (timestampCol !== -1) {
        updates.push({
          range: `Sheet1!${colLetter(timestampCol)}${rowNum}`,
          values: [[now]],
        });
      }

      if (statusCol !== -1) {
        updates.push({
          range: `Sheet1!${colLetter(statusCol)}${rowNum}`,
          values: [["filled"]],
        });
      }

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updates,
        },
      });

      return true;
    }
  }

  return false;
}

/**
 * Update a field's status (e.g., to "deferred").
 */
export async function updateStatus(
  sheetId: string,
  elementId: string,
  status: string
): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1",
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return false;

  const headers = rows[0] as string[];
  const elementIdCol = headers.indexOf("element_id");
  const statusCol = headers.indexOf("status");

  if (elementIdCol === -1 || statusCol === -1) return false;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][elementIdCol] === elementId) {
      const rowNum = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!${colLetter(statusCol)}${rowNum}`,
        valueInputOption: "RAW",
        requestBody: { values: [[status]] },
      });
      return true;
    }
  }

  return false;
}

/**
 * Upload a file to Google Drive and return the shareable URL.
 */
export async function uploadToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const drive = getDrive();
  const { Readable } = await import("stream");

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,webViewLink",
  });

  // Set sharing to anyone with link can view
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`;
}

/** Convert 0-indexed column number to letter (0=A, 1=B, ..., 25=Z, 26=AA) */
function colLetter(col: number): string {
  let letter = "";
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode((c % 26) + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}
