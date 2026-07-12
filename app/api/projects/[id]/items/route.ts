import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { createManagedProjectItem, reorderProjectItems } from "@/backend/services/projects/project-management";
import { requireApiSession } from "@/lib/auth/api";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]); if (!auth.ok) return auth.response;
  try { const { id } = await params; return NextResponse.json({ success: true, item: await createManagedProjectItem(id, await request.json(), auth.session.profile.id) }); }
  catch (error) { return routeErrorResponse({ scope: "api.projects.items.create", error, details: { performedByProfileId: auth.session.profile.id } }); }
}
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]); if (!auth.ok) return auth.response;
  try { const { id } = await params; const body = await request.json() as { itemIds?: string[] }; await reorderProjectItems(id, body.itemIds ?? [], auth.session.profile.id); return NextResponse.json({ success: true }); }
  catch (error) { return routeErrorResponse({ scope: "api.projects.items.reorder", error, details: { performedByProfileId: auth.session.profile.id } }); }
}
