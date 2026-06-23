import { NextResponse } from "next/server";
import { listLeads } from "@/backend/repositories";

export async function GET() {
  try {
    const leads = await listLeads();

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list leads",
      },
      { status: 500 },
    );
  }
}
