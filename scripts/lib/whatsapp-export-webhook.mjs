import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const HEADER = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})\s*([AP]M) - (.*)$/;
const ATTACHMENT = /^(.+?) \(file attached\)(?:\n|$)/;

function stableId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function timestampToEpoch(match, offset = "+08:00") {
  let [, month, day, year, hour, minute, meridiem] = match;
  const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
  let hour24 = Number(hour) % 12;
  if (meridiem === "PM") hour24 += 12;
  const iso = `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour24).padStart(2, "0")}:${minute}:00${offset}`;
  return String(Math.floor(new Date(iso).getTime() / 1000));
}

export function parseWhatsAppExport(text, options = {}) {
  const normalized = text.replaceAll("\u202f", " ").replaceAll("\u00a0", " ");
  const records = [];
  let current = null;

  for (const line of normalized.split(/\r?\n/)) {
    const match = line.match(HEADER);
    if (match) {
      if (current) records.push(current);
      const body = match[7];
      const senderMatch = body.match(/^([^:]+):\s?([\s\S]*)$/);
      current = senderMatch
        ? {
            sender: senderMatch[1].trim(),
            body: senderMatch[2],
            timestamp: timestampToEpoch(match, options.timezoneOffset),
          }
        : null;
    } else if (current) {
      current.body += `\n${line}`;
    }
  }
  if (current) records.push(current);

  return records
    .map((record) => ({ ...record, body: record.body.trimEnd() }))
    .filter((record) => record.body.trim());
}

function mediaDetails(filename) {
  const extension = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return { type: "image", mimeType: extension === ".png" ? "image/png" : "image/jpeg" };
  }
  if ([".mp4", ".mov"].includes(extension)) {
    return { type: "video", mimeType: extension === ".mov" ? "video/quicktime" : "video/mp4" };
  }
  if ([".mp3", ".m4a", ".ogg", ".opus"].includes(extension)) {
    return { type: "audio", mimeType: extension === ".mp3" ? "audio/mpeg" : "audio/ogg" };
  }
  return {
    type: "document",
    mimeType: extension === ".pdf" ? "application/pdf" : "application/octet-stream",
  };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function exportFolderToMetaWebhook(folder, options = {}) {
  const files = await readdir(folder);
  const textFile = options.textFile ?? files.find((file) => file.toLowerCase().endsWith(".txt"));
  if (!textFile) throw new Error("No WhatsApp .txt export was found in the folder.");

  const parsedRecords = parseWhatsAppExport(
    await readFile(path.join(folder, textFile), "utf8"),
    options,
  );
  const records = options.limit
    ? parsedRecords.slice(0, Math.max(1, Number(options.limit)))
    : parsedRecords;
  const customerPhone = options.customerPhone ?? "6590000001";
  const businessPhone = options.businessPhone ?? "6590000000";
  const phoneNumberId = options.phoneNumberId ?? "100000000000001";
  const contactName = options.contactName ?? "WhatsApp export test";
  const inboundAuthors = new Set(options.inboundAuthors ?? ["Tania"]);
  let includedAttachments = 0;
  let missingAttachments = 0;

  const messages = [];
  for (const [index, record] of records.entries()) {
    const attachment = record.body.match(ATTACHMENT);
    const caption = attachment
      ? record.body.slice(attachment[0].length).trim()
      : "";
    const authorText = `[${record.sender}]`;
    const id = `wamid.TEST_${stableId(`${record.timestamp}:${record.sender}:${record.body}:${index}`)}`;
    const base = {
      id,
      from: customerPhone,
      timestamp: record.timestamp,
    };

    if (!attachment || options.textOnly) {
      const attachmentText = attachment
        ? `Attachment: ${attachment[1]}${caption ? `\n${caption}` : ""}`
        : record.body.trim();
      messages.push({
        ...base,
        type: "text",
        text: { body: `${authorText} ${attachmentText}` },
      });
      continue;
    }

    const filename = attachment[1].trim();
    const available = await exists(path.join(folder, filename));
    if (available) includedAttachments += 1;
    else missingAttachments += 1;
    const media = mediaDetails(filename);
    const mediaPayload = {
      id: `TEST_MEDIA_${stableId(filename)}`,
      mime_type: media.mimeType,
      filename,
      ...(media.type === "audio"
        ? {}
        : { caption: `${authorText} ${caption || filename}` }),
    };
    messages.push({ ...base, type: media.type, [media.type]: mediaPayload });
  }

  // An export from an internal group has more than one author. Cloud API lead
  // intake is one customer thread, so author names stay in message text/captions.
  // The fixture uses a synthetic customer number to avoid merging real records.
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "TEST_WABA_EXPORT",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: businessPhone,
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: contactName }, wa_id: customerPhone }],
              messages,
            },
          },
        ],
      },
    ],
  };

  return {
    payload,
    stats: {
      records: records.length,
      messages: messages.length,
      includedAttachments,
      missingAttachments,
      inboundAuthors: [...inboundAuthors],
    },
  };
}
