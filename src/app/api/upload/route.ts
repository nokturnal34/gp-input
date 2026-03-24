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
    const buffer = Buffer.from(await file.arrayBuffer());
    const driveUrl = await uploadToDrive(
      driveFolderId || "",
      file.name,
      file.type,
      buffer
    );

    // Write the Drive URL to the Sheet as the response
    await updateResponse(sheetId, elementId, driveUrl);

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
