import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "(not set)";
  const charCodes = [...raw.substring(0, 20)].map(c => c.charCodeAt(0));

  return NextResponse.json({
    length: raw.length,
    first40: raw.substring(0, 40),
    charCodes: charCodes,
  });
}
