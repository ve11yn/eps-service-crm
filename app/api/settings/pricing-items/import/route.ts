import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { logAuditEvent } from "@/backend/observability/audit";
import { requireApiSession } from "@/lib/auth/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function amount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose an Excel pricing workbook.");
    if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("Pricing import accepts Excel .xlsx or .xls files.");

    const workbook = XLSX.read(await file.arrayBuffer());
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("The workbook has no worksheets.");
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], { header: 1, raw: true });
    const dataRows = rows.slice(1);
    const lowerName = file.name.toLowerCase();
    const numericCleaningRows = dataRows.filter((row) => amount(row?.[1]) !== null && amount(row?.[2]) !== null).length;
    const isEps = lowerName.includes("eps") || (!lowerName.includes("handyman") && numericCleaningRows > dataRows.length / 2);
    const catalog = isEps ? {
      code: "eps_recommended_pricing_2025_2026", name: "EPS Recommended Pricing 2025/2026", serviceDomain: "eps_cleaning",
    } : {
      code: "handyman_recommended_pricing_2025_2026", name: "Handyman Recommended Pricing 2025/2026", serviceDomain: "handyman",
    };

    const items = dataRows.map((row, index) => {
      const title = String(row?.[0] ?? "").trim();
      const recommendedPrice = amount(row?.[4]);
      if (!title || recommendedPrice === null || recommendedPrice <= 0) return null;
      return {
        service_title: title,
        category: isEps ? "handover_cleaning" : String(row?.[1] ?? "").trim() || null,
        description: isEps ? "Imported from EPS pricing workbook" : String(row?.[2] ?? "").trim() || null,
        legacy_price: isEps ? null : amount(row?.[3]),
        furnished_surcharge: isEps ? amount(row?.[1]) : null,
        base_unfurnished_price: isEps ? amount(row?.[2]) : null,
        legacy_total_price: isEps ? amount(row?.[3]) : null,
        recommended_price: recommendedPrice,
        source_row_number: index + 2,
        sort_order: index + 2,
        is_active: true,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    if (!items.length) throw new Error("No valid pricing rows were found. Expected service names in column A and recommended prices in column E.");

    const supabase = createAdminSupabaseClient();
    const { data: existingCatalog, error: catalogLookupError } = await supabase.from("pricing_catalogs").select("id").eq("code", catalog.code).maybeSingle();
    if (catalogLookupError) throw catalogLookupError;
    let catalogId = existingCatalog?.id;
    if (!catalogId) {
      const { data, error } = await supabase.from("pricing_catalogs").insert({ code: catalog.code, name: catalog.name, service_domain: catalog.serviceDomain, currency_code: "SGD", source_file_name: file.name, source_sheet_name: firstSheetName, is_active: true }).select("id").single();
      if (error) throw error;
      catalogId = data.id;
    } else {
      const { error } = await supabase.from("pricing_catalogs").update({ name: catalog.name, service_domain: catalog.serviceDomain, source_file_name: file.name, source_sheet_name: firstSheetName, is_active: true, updated_at: new Date().toISOString() }).eq("id", catalogId);
      if (error) throw error;
    }

    const { data: existingItems, error: existingError } = await supabase.from("pricing_items").select("id, source_row_number").eq("catalog_id", catalogId);
    if (existingError) throw existingError;
    const importedRows = new Set(items.map((item) => item.source_row_number));
    const payload = items.map((item) => ({ ...item, catalog_id: catalogId as string }));
    const { error: upsertError } = await supabase.from("pricing_items").upsert(payload, { onConflict: "catalog_id,source_row_number" });
    if (upsertError) throw upsertError;
    const staleIds = (existingItems ?? []).filter((item) => item.source_row_number !== null && !importedRows.has(item.source_row_number)).map((item) => item.id);
    if (staleIds.length) {
      const { error } = await supabase.from("pricing_items").delete().in("id", staleIds);
      if (error) throw error;
    }

    await logAuditEvent({ action: "pricing_items.excel_import", entityType: "pricing_catalog", entityId: catalogId, performedByProfileId: auth.session.profile.id, newValue: { file: file.name, worksheet: firstSheetName, catalogue: catalog.name, imported: items.length, removed: staleIds.length } });
    return NextResponse.json({ success: true, imported: items.length, removed: staleIds.length, catalogue: catalog.name });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Excel import failed." }, { status: 400 });
  }
}
