import { NextResponse } from "next/server";
import { searchPricingItems } from "@/backend/services/pricing/search-pricing-items";

export async function GET(request: Request) {
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search pricing items",
      },
      { status: 500 },
    );
  }
}
