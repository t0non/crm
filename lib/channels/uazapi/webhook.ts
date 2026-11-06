import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { canonicalMessageId, instanceCredentials } from "./client";

export const messageSchema = z.object({
  id: z.string().min(1),
  messageid: z.string().optional(),
  chatid: z.string().min(1),
  fromMe: z.boolean(),
  isGroup: z.boolean().optional(),
  wasSentByApi: z.boolean().optional(),
  senderName: z.string().nullish(),
  text: z.string().nullish(),
  buttonOrListid: z.string().max(160).nullish(),
  messageType: z.string().optional(),
  messageTimestamp: z.number().int().positive(),
});
export const hookSchema = z.object({
  EventType: z.string().min(1),
  token: z.string().min(1),
  message: z.unknown().optional(),
  type: z.string().optional(),
  state: z.string().optional(),
  event: z.unknown().optional(),
});
export const receiptSchema = z.object({
  MessageIDs: z.array(z.string().min(1)).max(100),
  Timestamp: z.number().int().positive(),
  Type: z.string(),
  IsFromMe: z.boolean(),
  IsGroup: z.boolean(),
});
export function validInstanceToken(token: string) {
  const configured = instanceCredentials();
  if (!configured) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(token), hash(configured.token));
}
export function normalizedTextMessage(raw: unknown) {
  const m = messageSchema.parse(raw);
  if (m.isGroup || !/^\d{10,15}@(?:s\.whatsapp\.net|c\.us)$/.test(m.chatid)) return null;
  if (m.fromMe && m.wasSentByApi) return null; // eco do envio HTTP já tem linha no ledger
  const mediaKind = /^(imageMessage|image)$/i.test(m.messageType ?? "")
    ? ("image" as const)
    : /^(audioMessage|audio|ptt)$/i.test(m.messageType ?? "")
      ? ("audio" as const)
      : null;
  if (
    !mediaKind && !m.buttonOrListid &&
    m.messageType &&
    ![
      "Conversation",
      "ExtendedTextMessage",
      "conversation",
      "extendedTextMessage",
      "text",
    ].includes(m.messageType)
  )
    return null;
  if (!m.text && !mediaKind && !m.buttonOrListid) return null;
  return {
    kind: mediaKind ?? ("text" as const),
    downloadId: m.messageid || m.id,
    externalId: canonicalMessageId(m.messageid || m.id),
    phone: `+${m.chatid.split("@")[0]}`,
    name: m.senderName ?? null,
    text: m.text || (m.buttonOrListid ? "Selecionou uma opção do menu" : ""),
    buttonId: m.buttonOrListid || null,
    fromMe: m.fromMe,
    at: new Date(m.messageTimestamp).toISOString(),
  };
}
