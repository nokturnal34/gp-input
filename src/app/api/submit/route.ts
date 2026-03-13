import { NextRequest, NextResponse } from "next/server";
import { updateResponse, updateStatus } from "@/lib/google";
import { cookies } from "next/headers";

interface SubmitPayload {
  clientSlug: string;
  sheetId: string;
  responses: Record<string, string>;
  deferred: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { clientSlug, sheetId, responses, deferred }: SubmitPayload =
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
