import "server-only";

import {
  createContact,
  getContactByWhatsAppNumber,
  updateContact,
} from "@/backend/repositories";
import { normalizePhone } from "@/lib/utils/phone";
import type { WhatsAppSyncedContact } from "@/types/integration";

export async function syncWhatsAppContacts(
  contacts: WhatsAppSyncedContact[],
): Promise<number> {
  let synced = 0;

  for (const contact of contacts) {
    if (contact.action === "remove") continue;

    const phone = normalizePhone(contact.phone);
    if (!phone) continue;

    const existing = await getContactByWhatsAppNumber(phone);
    if (existing) {
      if (contact.name && existing.full_name !== contact.name) {
        await updateContact(existing.id, { full_name: contact.name });
      }
    } else {
      await createContact({
        full_name: contact.name ?? phone,
        primary_phone: phone,
        whatsapp_number: phone,
      });
    }
    synced += 1;
  }

  return synced;
}
