import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AuditLogInsert = {
  action: string;
  entity_type: string;
  entity_id: string | null;
  performed_by_profile_id: string | null;
  old_value: Json | null;
  new_value: Json | null;
  metadata: Json | null;
};

type AuditLogTableClient = {
  from(table: "audit_logs"): {
    insert(values: AuditLogInsert): Promise<unknown>;
  };
};

export async function logAuditEvent(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  performedByProfileId?: string | null;
  oldValue?: Json;
  newValue?: Json;
  metadata?: Json;
}) {
  try {
    const supabase =
      createAdminSupabaseClient() as unknown as AuditLogTableClient;

    await supabase.from("audit_logs").insert({
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      performed_by_profile_id: input.performedByProfileId ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
