import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { searchPricingItems } from "@/backend/services/pricing/search-pricing-items";
import { requireApiSession } from "@/lib/auth/api";

export async function GET(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const catalogCode = searchParams.get("catalogCode") ?? undefined;
    const serviceDomain = searchParams.get("serviceDomain") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "q is required" },
        { status: 400 },
      );
    }

    const items = await searchPricingItems({
      query,
      catalogCode,
      serviceDomain,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.pricing.search",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
