import { NextResponse } from "next/server";
import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const lead = await getLeadDetail(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get lead",
      },
      { status: 500 },
    );
  }
}
