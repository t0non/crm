import type { SupabaseClient } from "@supabase/supabase-js";
import { hookSchema, validInstanceToken, receiptSchema, messageSchema } from "./uazapi/webhook";
import { abrirArquivoDoWebhook, fecharArquivoDoWebhook } from "./arquivo-de-webhook";
import { ingestInstanceText } from "./uazapi/ingest";
import { INSTANCE_PROVIDER, readInstance, canonicalMessageId } from "./uazapi/client";

export async function receiveInstanceWebhook(
  admin: SupabaseClient,
  pathToken: string,
  raw: unknown,
) {
  const parsed = hookSchema.safeParse(raw);
  if (!parsed.success || !validInstanceToken(parsed.data.token)) return { accepted: false };
  const { data: session, error } = await admin
    .from("channel_sessions")
    .select("id, organization_id, uazapi_instance_id")
    .eq("provider", INSTANCE_PROVIDER)
    .eq("webhook_path_token", pathToken)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error("session_lookup_failed");
  if (!session) return { accepted: false };
  // Só campos permitidos são arquivados; token, BaseUrl e payload bruto nunca entram.
  const safe = {
    EventType: parsed.data.EventType,
    ...(parsed.data.EventType === "messages"
      ? { message: messageSchema.parse(parsed.data.message) }
      : {}),
    ...(parsed.data.EventType === "messages_update" && parsed.data.type === "ReadReceipt"
      ? { type: "ReadReceipt", event: receiptSchema.parse(parsed.data.event) }
      : {}),
  };
  const logId = await abrirArquivoDoWebhook(admin, {
    organizationId: session.organization_id,
    channelSessionId: session.id,
    provider: INSTANCE_PROVIDER,
    rawBody: JSON.stringify(safe),
    headers: new Headers(),
  });
  if (!logId) throw new Error("durable_receipt_failed");
  try {
    const result = await processInstanceEvent(admin, session, safe);
    await fecharArquivoDoWebhook(admin, logId, { status: "processed", validSignature: true });
    return result;
  } catch {
    await fecharArquivoDoWebhook(admin, logId, {
      status: "error",
      validSignature: true,
      erro: "instance_processing_failed",
    });
    throw new Error("instance_processing_failed");
  }
}

async function processInstanceEvent(
  admin: SupabaseClient,
  session: { id: string; organization_id: string; uazapi_instance_id: string },
  event: { EventType: string; message?: unknown; type?: string; event?: unknown },
) {
  const parsed = { data: event };
  if (parsed.data.EventType === "messages_update" && parsed.data.type === "ReadReceipt") {
    const receipt = receiptSchema.parse(parsed.data.event);
    if (!receipt.IsFromMe || receipt.IsGroup) return { accepted: true };
    const read = /^(Read|Played)$/i.test(receipt.Type);
    const delivered = /^Delivered$/i.test(receipt.Type);
    if (!read && !delivered) return { accepted: true };
    const at = new Date(receipt.Timestamp * 1000).toISOString();
    const { error: receiptError } = await admin
      .from("messages")
      .update(
        read
          ? { status: "read", read_at: at, ack: 3 }
          : { status: "delivered", delivered_at: at, ack: 2 },
      )
      .eq("organization_id", session.organization_id)
      .eq("channel_session_id", session.id)
      .eq("direction", "outbound")
      .in("external_id", receipt.MessageIDs.map(canonicalMessageId))
      .in("status", read ? ["sending", "sent", "delivered"] : ["sending", "sent"]);
    if (receiptError) throw new Error("receipt_write_failed");
    return { accepted: true };
  }
  if (parsed.data.EventType === "messages") {
    return { accepted: true, ...(await ingestInstanceText(admin, session, parsed.data.message)) };
  }
  if (parsed.data.EventType === "connection") {
    const remote = await readInstance();
    if (remote.id !== session.uazapi_instance_id) return { accepted: false };
    const { error: updateError } = await admin
      .from("channel_sessions")
      .update({
        status: remote.status,
        phone_number: remote.phone,
        last_health_check_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("organization_id", session.organization_id);
    if (updateError) throw new Error("status_write_failed");
  }
  return { accepted: true };
}

/** Recuperação manual dos recibos duráveis: não liga worker, IA ou automação. */
export async function replayInstanceReceipts(admin: SupabaseClient, organizationId: string) {
  const { data: session, error: sessionError } = await admin
    .from("channel_sessions")
    .select("id, organization_id, uazapi_instance_id")
    .eq("organization_id", organizationId)
    .eq("provider", INSTANCE_PROVIDER)
    .is("archived_at", null)
    .single();
  if (sessionError || !session) throw new Error("session_not_found");
  const { data, error } = await admin
    .from("webhook_events_log")
    .select("id, payload_parsed")
    .eq("organization_id", organizationId)
    .eq("channel_session_id", session.id)
    .eq("provider", INSTANCE_PROVIDER)
    .in("status", ["received", "error"])
    .order("received_at", { ascending: true })
    .limit(20);
  if (error) throw new Error("receipts_lookup_failed");
  let processed = 0;
  for (const row of data ?? []) {
    const payload = row.payload_parsed as {
      EventType: string;
      message?: unknown;
      type?: string;
      event?: unknown;
    };
    if (!payload || typeof payload.EventType !== "string") continue;
    await processInstanceEvent(admin, session, payload);
    await fecharArquivoDoWebhook(admin, row.id, { status: "processed", validSignature: true });
    processed++;
  }
  return { processed };
}
