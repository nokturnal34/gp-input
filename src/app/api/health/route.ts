import { NextResponse } from "next/server";
import { getSheets, getDrive } from "@/lib/google";

export async function GET() {
  const checks: Record<string, string> = {};

  // Debug: show first 30 chars of env var
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  checks.env_debug = `len=${raw.length} first30=${raw.substring(0, 30)} charCodes=${[...raw.substring(0, 15)].map(c => c.charCodeAt(0)).join(",")}`;

  // Check Sheets API
  try {
    const sheets = getSheets();
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.REGISTRY_SHEET_ID || "test",
      fields: "spreadsheetId",
    });
    checks.sheets = "ok";
  } catch (e: unknown) {
    const error = e as Error;
    checks.sheets = `error: ${error.message}`;
  }

  // Check Drive API
  try {
    const drive = getDrive();
    await drive.about.get({ fields: "user" });
    checks.drive = "ok";
  } catch (e: unknown) {
    const error = e as Error;
    checks.drive = `error: ${error.message}`;
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
