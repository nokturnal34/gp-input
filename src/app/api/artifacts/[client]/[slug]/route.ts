import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readArtifactFile } from "@/lib/artifacts";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ client: string; slug: string }> }
) {
  try {
    const { client: clientSlug, slug } = await params;

    // Verify session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`gp_session_${clientSlug}`);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch artifact
    const result = await readArtifactFile(clientSlug, slug);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    if (!result.content) {
      return NextResponse.json(
        { error: "Artifact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ content: result.content });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error },
      { status: 500 }
    );
  }
}
