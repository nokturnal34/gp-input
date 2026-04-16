import { NextRequest, NextResponse } from "next/server";
import { uploadToDrive, updateResponse } from "@/lib/google";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const clientSlug = formData.get("clientSlug") as string;
    const sheetId = formData.get("sheetId") as string;
    const elementId = formData.get("elementId") as string;
    const driveFolderId = formData.get("driveFolderId") as string;
    const file = formData.get("file") as File;

    if (!clientSlug || !sheetId || !elementId || !file) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`gp_session_${clientSlug}`);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 10MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB.` },
        { status: 413 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Accepted: PNG, JPG, GIF, SVG, WebP, PDF.` },
        { status: 415 }
      );
    }

    // Upload to Google Drive
    console.log(`[Upload] Starting upload: file=${file.name}, size=${file.size}, type=${file.type}, elementId=${elementId}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    let driveUrl: string;
    try {
      driveUrl = await uploadToDrive(
        driveFolderId || "",
        file.name,
        file.type,
        buffer
      );
      console.log(`[Upload] Successfully uploaded to Drive: ${driveUrl}`);
    } catch (driveErr) {
      console.error(`[Upload] Drive upload failed:`, driveErr);
      throw new Error(`Failed to upload to Google Drive: ${driveErr instanceof Error ? driveErr.message : String(driveErr)}`);
    }

    // Write the Drive URL to the Sheet as the response
    try {
      await updateResponse(sheetId, elementId, driveUrl);
      console.log(`[Upload] Updated sheet response for ${elementId}`);
    } catch (sheetErr) {
      console.warn(`[Upload] Failed to update sheet, but file uploaded OK:`, sheetErr);
      // Continue - file is uploaded even if sheet update fails
    }

    return NextResponse.json({
      success: true,
      url: driveUrl,
      elementId,
    });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Upload error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
