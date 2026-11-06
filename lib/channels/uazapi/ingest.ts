import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalPhoneBR } from "../phone-variants";
import { encontrarContatoPorTelefone } from "../contato-por-telefone";
import { aplicarEfeitosPosEntrada } from "../pos-entrada";
import { marcarConversaComMensagem } from "../marcar-conversa";
import { ehNumeroInternoDeAviso } from "@/lib/escalacao/numero-interno-de-aviso";
import { normalizedTextMessage } from "./webhook";
import { downloadInstanceMedia } from "./media";
import { storagePathFor } from "@/lib/messaging/media/types";
import { MENSAGEM_REDIGIDA } from "@/lib/lgpd/cascata";
import { isSantaClaraTest, runSantaClaraInbound } from "./santa-clara";

export async function ingestInstanceText(
  admin: SupabaseClient,
  session: { id: string; organization_id: string; uazapi_instance_id?: string },
  raw: unknown,
) {
  const m = normalizedTextMessage(raw);
  if (!m) return { ignored: true };
  const org = session.organization_id;
  if (await ehNumeroInternoDeAviso(admin, org, { kind: "phone", phone: m.phone, lid: null }))
    return { ignored: true };
  const existing = await encontrarContatoPorTelefone(admin as never, org, m.phone);
  const { data: contactId, error: ce } = await admin.rpc("fn_upsert_wa_contact", {
    p_org: org,
    p_kind: "phone",
    p_phone: canonicalPhoneBR(existing?.phone_number || m.phone),
    p_lid: null,
    p_chat_id: m.phone.slice(1),
    p_notify: m.name,
  });
  if (ce || !contactId) throw new Error("contact_write_failed");
  const { data: conversationId, error: ve } = await admin.rpc("fn_upsert_wa_conversation", {
    p_org: org,
    p_contact: contactId,
    p_session: session.id,
  });
  if (ve || !conversationId) throw new Error("conversation_write_failed");
  const direction = m.fromMe ? "outbound" : "inbound";
  const { data, error } = await admin
    .from("messages")
    .insert({
      organization_id: org,
      channel_session_id: session.id,
      contact_id: contactId,
      conversation_id: conversationId,
      external_id: m.externalId,
      direction,
      status: m.fromMe ? "sent" : "delivered",
      type: m.kind,
      body: m.text,
      sent_at: m.at,
      sent_via: m.fromMe ? "external_device" : "crm",
      ...(m.buttonId ? { metadata: { interactive_reply_id: m.buttonId } } : {}),
    })
    .select("id")
    .single();
  if (error && error.code !== "23505") throw new Error("message_write_failed");
  let messageId = data?.id;
  if (m.kind !== "text") {
    const { data: saved, error: readError } = await admin
      .from("messages")
      .select("id,media_storage_path,body")
      .eq("organization_id", org)
      .eq("external_id", m.externalId)
      .single();
    if (readError || !saved) throw new Error("media_message_lookup_failed");
    messageId = saved.id;
    if (!saved.media_storage_path && saved.body !== MENSAGEM_REDIGIDA) {
      const media = await downloadInstanceMedia(m.downloadId, m.kind);
      const path = storagePathFor(org, conversationId, saved.id, media.mime);
      const { error: uploadError } = await admin.storage
        .from("whatsapp-media")
        .upload(path, media.buffer, { contentType: media.mime, upsert: true });
      if (uploadError) throw new Error("media_storage_failed");
      const { data: updated, error: updateError } = await admin
        .from("messages")
        .update({
          media_storage_path: path,
          media_mime: media.mime,
          media_size_bytes: media.buffer.length,
        })
        .eq("organization_id", org)
        .eq("id", saved.id)
        .filter("body", "isdistinct", MENSAGEM_REDIGIDA)
        .select("id");
      if (updateError) throw new Error("media_message_update_failed");
      if (!updated?.length) await admin.storage.from("whatsapp-media").remove([path]);
    }
  }
  if (!error)
    await marcarConversaComMensagem(admin, {
      organizationId: org,
      conversationId,
      direction,
      preview: m.text.slice(0, 200) || (m.kind === "image" ? "Foto" : "Áudio"),
      at: m.at,
      canal: "uazapi",
    });
  // Reentrega também repara um eventual crash após INSERT e antes de criar o lead.
  if (!m.fromMe)
    await aplicarEfeitosPosEntrada(admin as never, {
      organizationId: org,
      contactId,
      conversationId,
      messageId: messageId ?? null,
      channelSessionId: session.id,
      texto: m.text,
      nomeDoContato: m.name,
      origem: "uazapi",
      somenteManual: true,
    });
  if (!m.fromMe && isSantaClaraTest(org, m.phone)) {
    if (!messageId) {
      const { data: saved, error: lookupError } = await admin.from("messages").select("id")
        .eq("organization_id", org).eq("conversation_id", conversationId)
        .eq("external_id", m.externalId).maybeSingle();
      if (lookupError) throw new Error("santa_inbound_lookup_failed");
      messageId = saved?.id;
    }
    if (messageId) await runSantaClaraInbound(admin, {
      organizationId: org, contactId, conversationId, messageId, sessionId: session.id,
      instanceId: session.uazapi_instance_id, phone: m.phone, at: m.at, text: m.text, buttonId: m.buttonId,
    });
  }
  return { duplicate: error?.code === "23505", ingested: !error };
}
