import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { exportFolderToMetaWebhook, parseWhatsAppExport } from "../../scripts/lib/whatsapp-export-webhook.mjs";

test("parses multiline WhatsApp export messages and ignores system notices", () => {
  const messages = parseWhatsAppExport(
    "4/18/26, 9:12 PM - A created group X\n4/18/26, 9:13 PM - Tania: First line\nSecond line\n",
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "Tania");
  assert.equal(messages[0].body, "First line\nSecond line");
  assert.equal(messages[0].timestamp, "1776517980");
});

test("creates a Meta webhook-shaped fixture from the supplied export", async () => {
  const folder = path.resolve("public/WhatsApp Chat with 🆗EPS7 167 Tai Keng Gardens copy");
  const { payload, stats } = await exportFolderToMetaWebhook(folder);
  const value = payload.entry[0].changes[0].value;
  assert.equal(payload.object, "whatsapp_business_account");
  assert.equal(value.messaging_product, "whatsapp");
  assert.ok(value.messages.length > 20);
  assert.ok(value.messages.some((message) => message.type === "image"));
  assert.ok(stats.includedAttachments > 0);
  assert.ok(stats.missingAttachments > 0);
  assert.equal(value.contacts[0].wa_id, "6590000001");
});
