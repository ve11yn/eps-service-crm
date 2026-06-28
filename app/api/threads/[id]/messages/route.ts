import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  getThreadById,
  listMessagesByThreadId,
} from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

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
    return routeErrorResponse({
      scope: "api.threads.messages",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
