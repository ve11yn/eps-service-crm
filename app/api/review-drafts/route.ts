import { NextResponse } from "next/server";
import { listReviewDrafts } from "@/backend/repositories";

export async function GET() {
  try {
    const drafts = await listReviewDrafts();

    return NextResponse.json({
      success: true,
      drafts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list review drafts",
      },
      { status: 500 },
    );
  }
}
