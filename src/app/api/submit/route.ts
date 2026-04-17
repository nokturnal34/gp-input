import { NextRequest, NextResponse } from "next/server";
import { updateResponse, updateStatus, readSheet, getSheets, colLetter } from "@/lib/google";
import { cookies } from "next/headers";

interface SubmitPayload {
  clientSlug: string;
  sheetId: string;
  responses: Record<string, string>;
  deferred: string[];
  cleared?: string[];
  slideComments?: Record<string, string>;
  saveOnly?: boolean;  // If true, save without marking as "filled"
}

export async function POST(request: NextRequest) {
  try {
    const { clientSlug, sheetId, responses, deferred, cleared, slideComments }: SubmitPayload =
      await request.json();

    if (!clientSlug || !sheetId) {
      return NextResponse.json(
        { error: "Missing clientSlug or sheetId" },
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

    const results: Record<string, boolean> = {};

    // Write text responses
    for (const [elementId, value] of Object.entries(responses)) {
      if (!value.trim()) continue;
      const success = await updateResponse(sheetId, elementId, value);
      results[elementId] = success;
    }

    // Mark deferred items
    if (deferred && deferred.length > 0) {
      for (const elementId of deferred) {
        await updateStatus(sheetId, elementId, "deferred");
        results[elementId] = true;
      }
    }

    // Sync cleared fields to sheet as empty strings (preserves audit trail and schema consistency)
    if (cleared && cleared.length > 0) {
      for (const elementId of cleared) {
        const success = await updateResponse(sheetId, elementId, "");
        results[elementId] = success;
      }
    }

    // Update slide comments (batch all updates into single API call)
    if (slideComments && Object.keys(slideComments).length > 0) {
      try {
        const sheets = getSheets();
        const sheetData = await readSheet(sheetId);
        const headers = ["slide_number", "element_id", "placeholder_marker", "prompt_text", "client_response", "submitted_at", "status", "slide_thumbnail_url", "slide_comment"];
        const slideCommentCol = headers.indexOf("slide_comment");

        if (slideCommentCol !== -1) {
          const updates: { range: string; values: string[][] }[] = [];

          // Collect all comment updates
          for (const [slideNum, comment] of Object.entries(slideComments)) {
            if (!comment.trim()) continue;

            // Find all rows with this slide_number
            for (let i = 0; i < sheetData.length; i++) {
              if (sheetData[i].slide_number === slideNum) {
                const rowNum = i + 2; // +2: +1 for header, +1 for 1-indexed
                updates.push({
                  range: `Sheet1!${colLetter(slideCommentCol)}${rowNum}`,
                  values: [[comment]],
                });
              }
            }
          }

          // Single batch update
          if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
              spreadsheetId: sheetId,
              requestBody: {
                valueInputOption: "RAW",
                data: updates,
              },
            });
          }
        }
      } catch (commentErr) {
        console.warn("Failed to save slide comments:", commentErr);
        // Continue even if comments fail
      }
    }

    const successCount = Object.values(results).filter(Boolean).length;
    const failCount = Object.values(results).filter((v) => !v).length;

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failCount,
      results,
    });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Submission failed. Please try again." },
      { status: 500 }
    );
  }
}
