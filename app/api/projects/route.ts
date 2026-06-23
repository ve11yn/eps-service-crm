import { NextResponse } from "next/server";
import { listProjects } from "@/backend/repositories";

export async function GET() {
  try {
    const projects = await listProjects();

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list projects",
      },
      { status: 500 },
    );
  }
}
