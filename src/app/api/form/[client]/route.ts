import { NextRequest, NextResponse } from "next/server";
import { getClientSheetId, loadFormConfig } from "@/lib/form-config";
import { cookies } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ client: string }> }
) {
  try {
    const { client: clientSlug } = await params;

    // Verify session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`gp_session_${clientSlug}`);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Look up client config
    const clientConfig = await getClientSheetId(clientSlug);
    if (!clientConfig) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Load form data from Sheet
    const formConfig = await loadFormConfig(
      clientConfig.sheetId,
      clientConfig.client
    );
    formConfig.driveFolderId = clientConfig.driveFolderId;

    return NextResponse.json(formConfig);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Form load error:", error);
    return NextResponse.json(
      { error: "Failed to load form" },
      { status: 500 }
    );
  }
}
