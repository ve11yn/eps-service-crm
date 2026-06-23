import { NextResponse } from "next/server";
import {
  getThreadById,
  listMessagesByThreadId,
} from "@/backend/repositories";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const thread = await getThreadById(id);

    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 },
      );
    }

    const messages = await listMessagesByThreadId(id);

    return NextResponse.json({
      success: true,
      thread,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load thread messages",
      },
      { status: 500 },
    );
  }
}
