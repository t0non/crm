import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyReactivityEvent, createSupabaseReactivityClient } from "@/lib/followup/reactivity";
import { ehOperante } from "@/lib/organizacao/operante";
import { numeroPodeTestar } from "@/lib/ai/elegibilidade/pre-go-live";
import { canonicalMessageId, instanceRequest, readInstance, sentMessageSchema } from "./client";
import { marcarConversaComMensagem } from "../marcar-conversa";
import { moveLeadHandler } from "@/app/api/v1/leads/_handler";
import type { HandlerCtx } from "@/lib/api/handlers/types";

export function santaClaraTestConversation(org?: string) {
  return org && org === process.env.SANTA_CLARA_TEST_ORG_ID
    ? process.env.SANTA_CLARA_TEST_CONVERSATION_ID || null
    : null;
}

export async function registerSantaClaraQuote(
  admin: SupabaseClient, ctx: HandlerCtx, conversationId: string,
) {
  await moveSantaClaraLead(admin, ctx, conversationId, "Informações enviadas", "Orçamento enviado pelo Inbox");
}

async function moveSantaClaraLead(
  admin: SupabaseClient, ctx: HandlerCtx, conversationId: string, stageName: string, reason: string,
) {
  const pipeline = process.env.SANTA_CLARA_TEST_PIPELINE_ID;
  if (!pipeline || conversationId !== santaClaraTestConversation(ctx.organization_id)) return;
  const { data: conversation, error } = await admin.from("conversations").select("contact_id,channel_sessions(provider)")
    .eq("id", conversationId).eq("organization_id", ctx.organization_id).single();
  if (error) throw new Error("santa_quote_conversation_failed");
  const channel = conversation?.channel_sessions as unknown as { provider: string } | null;
  if (!conversation?.contact_id || channel?.provider !== "uazapi") return;
  const [{ data: leads, error: leadError }, { data: stages, error: stageError }] = await Promise.all([
    admin.from("crm_leads").select("id,stage_id").eq("organization_id", ctx.organization_id)
      .eq("pipeline_id", pipeline).eq("contact_id", conversation.contact_id).eq("status", "open").limit(2),
    admin.from("crm_stages").select("id,name").eq("pipeline_id", pipeline)
      .in("name", ["Novo contato", "Em atendimento", "Sem resposta", "Informações enviadas", stageName]),
  ]);
  if (leadError || stageError) throw new Error("santa_quote_stage_lookup_failed");
  const target = stages?.find(({ name }) => name === stageName);
  const lead = leads?.length === 1 ? leads[0] : null;
  if (!target || !lead || lead.stage_id === target.id || !stages?.some(({ id }) => id === lead.stage_id)) return;
  await moveLeadHandler(admin, ctx, lead.id, { to_stage_id: target.id, reason });
}

const options = {
  horarios: "Horários e endereço",
  orcamento: "Orçamento ou convênio",
  recepcao: "Falar com a recepção",
} as const;
type Option = keyof typeof options;

type Inbound = {
  organizationId: string;
  conversationId: string;
  contactId: string;
  sessionId: string;
  instanceId?: string;
  messageId: string;
  phone: string;
  at: string;
  text: string;
  buttonId: string | null;
};

export function isSantaClaraTest(org: string, phone: string) {
  const allowed = process.env.SANTA_CLARA_TEST_PHONE?.trim();
  return !!allowed && org === process.env.SANTA_CLARA_TEST_ORG_ID && numeroPodeTestar(phone, [allowed]);
}

function messageKey(conversationId: string, period: string, action: string) {
  const hex = createHash("sha256").update(`santa-clara:${conversationId}:${period}:${action}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function santaClaraGreeting(text: string) {
  return /^(?:oi+|ola+|bom dia|boa tarde|boa noite|menu)[\s!.?]*$/.test(normalize(text));
}

export function santaClaraKeyword(text: string): Option | "pretende" | null {
  const normalized = normalize(text);
  // Pedidos sensíveis e negativas são lidos pela recepção.
  if (/\b(?:laudo|resultado|preparo|jejum|cancelar|nao|nunca)\b/.test(normalized)) return null;
  const matches: Array<Option | "pretende"> = [];
  if (/\b(?:horarios?|endereco|localizacao|que horas|onde (?:fica|e)|(?:como|pra) chegar|(?:voces |vc )?abrem?)\b/.test(normalized))
    matches.push("horarios");
  if (/\b(?:orcamentos?|convenios?|quanto (?:custa|fica|e)|precos?|valores?|particular)\b/.test(normalized))
    matches.push("orcamento");
  if (/\b(?:falar com (?:a |um )?(?:recepcao|atendente|alguem)|quero (?:um )?atendente)\b/.test(normalized))
    matches.push("recepcao");
  // Uma afirmação curta e completa é suficiente; perguntas e condicionais ficam com a equipe.
  if (/^(?:(?:jae|blz|beleza)[, ]+)?(?:(?:dps|depois) )?(?:eu )?(?:(?:vou|passo) ai|vou passar ai|pretendo ir)(?: (?:hoje|amanha|amaha|depois|dps))?[.!]*$/.test(normalized))
    matches.push("pretende");
  return matches.length === 1 ? matches[0]! : null;
}

function openingStatus(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const day = `${fields.year}-${fields.month}-${fields.day}`;
  const open = process.env.SANTA_CLARA_RECEPTION_OPEN;
  const close = process.env.SANTA_CLARA_RECEPTION_CLOSE;
  const days = process.env.SANTA_CLARA_RECEPTION_DAYS?.split(",");
  const time = `${fields.hour}:${fields.minute}`;
  const valid = (value?: string) => !!value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const outside = !!days && valid(open) && valid(close) && open! < close! &&
    (!days.includes(fields.weekday ?? "") || time < open! || time >= close!);
  return { day, outside };
}

async function reactToInbound(admin: SupabaseClient, input: Inbound) {
  const { data, error } = await admin.from("followup_enrollments").select("id")
    .eq("organization_id", input.organizationId).eq("contact_id", input.contactId)
    .eq("conversation_id", input.conversationId).lte("started_at", input.at)
    .in("status", ["active", "waiting_reply", "paused_handoff", "paused_manual", "dormente", "coletando"]);
  if (error) throw new Error("santa_followup_lookup_failed");
  if (!data?.length) return;
  const ids = new Set(data.map(({ id }) => id));
  const db = createSupabaseReactivityClient(admin);
  const load = db.loadLiveEnrollmentsForContact.bind(db);
  db.loadLiveEnrollmentsForContact = async (...args) => (await load(...args)).filter(({ id }) => ids.has(id));
  await applyReactivityEvent(db, () => new Date(), {
    id: input.messageId, organization_id: input.organizationId, entity_kind: "message",
    entity_id: input.messageId, event_type: "message.received",
    payload: { contact_id: input.contactId, sent_at: input.at },
    metadata: { source: "santa-clara-test" }, consumed_by: [], attempts: 0,
  });
}

async function send(
  admin: SupabaseClient,
  input: Inbound,
  id: string,
  body: string,
  choices?: string[],
) {
  const state = await readInstance();
  if (state.state !== "connected" || state.id !== input.instanceId) return;
  const number = input.phone.slice(1);
  const { error } = await admin.from("messages").insert({
    id, organization_id: input.organizationId, conversation_id: input.conversationId,
    contact_id: input.contactId, channel_session_id: input.sessionId,
    direction: "outbound", type: "text", sent_via: "automation", status: "sending", body,
    metadata: choices ? { santa_clara_menu: true, choices } : { santa_clara_reply: true },
  });
  if (error?.code === "23505") return;
  if (error) throw new Error("santa_message_reservation_failed");

  let externalId: string;
  try {
    const raw = sentMessageSchema.parse(await instanceRequest(choices ? "/send/menu" : "/send/text", {
      number, text: body, ...(choices ? { type: "button", choices } : {}),
      track_source: "santa_clara_test", track_id: id,
    }));
    externalId = canonicalMessageId(raw.messageid || raw.id!);
  } catch {
    // Uma falha após a chamada pode ter enviado. Preservar a reserva evita reenvio duplicado.
    await admin.from("messages").update({ status: "failed", error_code: "uazapi_automation_unconfirmed" })
      .eq("organization_id", input.organizationId).eq("id", id);
    return;
  }
  const { error: updateError } = await admin.from("messages").update({ status: "sent", external_id: externalId })
    .eq("organization_id", input.organizationId).eq("id", id);
  if (updateError) throw new Error("santa_message_status_failed");
  await marcarConversaComMensagem(admin, {
    organizationId: input.organizationId, conversationId: input.conversationId,
    direction: "outbound", preview: body.slice(0, 200), at: new Date().toISOString(), canal: "uazapi",
  });
}

export async function runSantaClaraInbound(admin: SupabaseClient, input: Inbound) {
  if (!isSantaClaraTest(input.organizationId, input.phone) || !input.instanceId ||
      input.conversationId !== santaClaraTestConversation(input.organizationId) ||
      Math.abs(Date.now() - Date.parse(input.at)) > 5 * 60_000) return;
  await reactToInbound(admin, input);
  const { data: conversation, error } = await admin.from("conversations")
    .select("assignee_kind,status,contacts(is_blocked,is_personal,force_human),organizations(status)")
    .eq("id", input.conversationId).eq("organization_id", input.organizationId)
    .eq("channel_session_id", input.sessionId).single();
  if (error) throw new Error("santa_conversation_lookup_failed");
  const row = conversation as unknown as {
    assignee_kind: string | null; status: string;
    contacts: { is_blocked: boolean; is_personal: boolean; force_human: boolean } | null;
    organizations: { status: string } | null;
  };
  if (!row.contacts || row.contacts.is_blocked || row.contacts.is_personal || row.contacts.force_human ||
      row.assignee_kind === "user" || row.status === "archived" ||
      !ehOperante(row.organizations?.status)) return;

  const { day, outside } = openingStatus(new Date(input.at));
  const menuId = messageKey(input.conversationId, day, "menu");
  const hoursId = messageKey(input.conversationId, day, "horarios");
  const matched = /^santa_([a-f0-9-]{36})_(horarios|orcamento|recepcao|pretende)$/.exec(input.buttonId ?? "");
  let selection: string | null = null;
  if (input.buttonId) {
    const fromGreeting = matched?.[1] === menuId && matched[2] !== "pretende";
    const fromHours = matched?.[1] === hoursId && (matched[2] === "pretende" || matched[2] === "recepcao");
    if (!matched || (!fromGreeting && !fromHours)) return;
    const { data: menu, error: menuError } = await admin.from("messages").select("id")
      .eq("organization_id", input.organizationId).eq("conversation_id", input.conversationId)
      .eq("id", fromHours ? hoursId : menuId).in("status", ["sent", "delivered", "read"]).maybeSingle();
    if (menuError) throw new Error("santa_menu_lookup_failed");
    if (!menu) return;
    selection = matched[2] ?? null;
  } else if (!outside) {
    selection = santaClaraKeyword(input.text);
  }
  if (selection) {
    if (selection === "pretende") {
      await moveSantaClaraLead(admin, {
        organization_id: input.organizationId,
        actor: { type: "webhook_source", id: input.messageId },
        requestId: input.messageId,
      }, input.conversationId, "Pretende ir", "Cliente sinalizou intenção de visita pelo WhatsApp");
      await send(admin, input, messageKey(input.conversationId, day, "pretende"),
        "[TESTE] Obrigado! O atendimento é por ordem de chegada. Se precisar de ajuda antes de vir, é só escrever por aqui.");
      return;
    }
    const choice = selection as Option;
    const info = process.env.SANTA_CLARA_LOCATION_AND_HOURS?.trim();
    const body = choice === "horarios"
      ? `[TESTE] ${info ? info + "\n" : "A recepção pode informar o horário e o endereço da unidade por aqui.\n"}O atendimento é por ordem de chegada.`
      : choice === "orcamento"
        ? "[TESTE] A recepção vai conferir os valores ou o convênio e responder por aqui."
        : "[TESTE] Sua mensagem está com a recepção. Você pode continuar escrevendo por aqui.";
    await send(admin, input, messageKey(input.conversationId, day, choice), body, choice === "horarios"
      ? [`Pretendo ir|santa_${hoursId}_pretende`, `Falar com a recepção|santa_${hoursId}_recepcao`]
      : undefined);
    return;
  }
  if (!outside && !santaClaraGreeting(input.text)) return;
  const greeting = outside
    ? "[TESTE] Olá! Aqui é do Laboratório Santa Clara. A recepção está fora do horário agora. Pode deixar sua dúvida e a equipe responde no próximo período de atendimento."
    : "[TESTE] Olá! Aqui é do Laboratório Santa Clara. Como podemos ajudar? Escolha uma opção ou escreva sua dúvida por aqui.";
  await send(admin, input, menuId, greeting, Object.entries(options).map(([key, label]) => `${label}|santa_${menuId}_${key}`));
}
