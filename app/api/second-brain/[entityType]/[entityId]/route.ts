import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { correctSecondBrainSummary, refreshSecondBrain, setSecondBrainLock, type SecondBrainEntityType, type SummaryType } from "@/backend/services/ai/second-brain";
import { requireApiSession } from "@/lib/auth/api";

type Context = { params: Promise<{ entityType: string; entityId: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;
  try {
    const { entityType: rawEntityType, entityId } = await context.params;
    const entityType = rawEntityType as SecondBrainEntityType;
    if (!["lead", "quote", "project"].includes(entityType)) return NextResponse.json({ success: false, error: "Invalid record type." }, { status: 400 });
    const payload = await request.json() as { action?: "refresh" | "correct" | "lock"; summaryType?: SummaryType; content?: string; isLocked?: boolean };
    if (payload.action === "refresh") await refreshSecondBrain(entityType, entityId, auth.session.profile.id);
    else if (payload.action === "correct" && payload.summaryType) await correctSecondBrainSummary({ entityType, entityId, summaryType: payload.summaryType, content: payload.content ?? "", isLocked: Boolean(payload.isLocked), profileId: auth.session.profile.id });
    else if (payload.action === "lock" && payload.summaryType) await setSecondBrainLock({ entityType, entityId, summaryType: payload.summaryType, isLocked: Boolean(payload.isLocked), profileId: auth.session.profile.id });
    else return NextResponse.json({ success: false, error: "Invalid overview action." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse({ scope: "api.second_brain", error, details: { performedByProfileId: auth.session.profile.id }, status: 400 });
  }
}
