import { NextRequest, NextResponse } from "next/server";
import { getClientSheetId } from "@/lib/form-config";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { clientSlug, passcode } = await request.json();

    if (!clientSlug || !passcode) {
      return NextResponse.json(
        { error: "Client slug and passcode are required" },
        { status: 400 }
      );
    }

    const clientConfig = await getClientSheetId(clientSlug);
    if (!clientConfig) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    if (!clientConfig.published) {
      return NextResponse.json(
        { error: "not_published" },
        { status: 403 }
      );
    }

    if (clientConfig.passcode !== passcode) {
      return NextResponse.json(
        { error: "Incorrect passcode" },
        { status: 401 }
      );
    }

    // Set a session cookie (valid for 30 days)
    const token = Buffer.from(
      JSON.stringify({ clientSlug, sheetId: clientConfig.sheetId, ts: Date.now() })
    ).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set(`gp_session_${clientSlug}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true, client: clientConfig.client });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
