/** Fachada neutra para rotas e telas. Credenciais nunca saem deste lado. */
import { randomBytes } from "node:crypto";
import { metadataInicialDoCanal } from "@/lib/ai/elegibilidade/pre-go-live";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INSTANCE_PROVIDER,
  INSTANCE_LABEL,
  connectInstance,
  instanceCredentials,
  instanceRequest,
  readInstance,
  parseWebhookDestinations,
} from "./uazapi/client";

export { INSTANCE_LABEL };
export function instanceCredentialsRejected(error: unknown): boolean {
  return error instanceof Error && /^uazapi_http_(401|403)$/.test(error.message);
}
export async function instanceStateForWelcome(
  db: SupabaseClient,
  organizationId: string,
): Promise<string> {
  try {
    const { data, error } = await db
      .from("channel_sessions")
      .select("uazapi_instance_id")
      .eq("organization_id", organizationId)
      .eq("provider", INSTANCE_PROVIDER)
      .is("archived_at", null)
      .maybeSingle();
    if (error) return "unavailable";
    if (!data || !instanceCredentials()) return "not_configured";
    const remote = await readInstance();
    return remote.id === data.uazapi_instance_id ? remote.state : "unavailable";
  } catch {
    return "unavailable";
  }
}
export async function observeInstance(admin: SupabaseClient, organizationId: string) {
  const { data: session, error } = await admin
    .from("channel_sessions")
    .select("id, uazapi_instance_id, webhook_path_token")
    .eq("organization_id", organizationId)
    .eq("provider", INSTANCE_PROVIDER)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error("instance_lookup_failed");
  if (!instanceCredentials())
    return {
      state: "not_configured",
      qr: null,
      sessionId: session?.id ?? null,
      label: INSTANCE_LABEL,
    };
  if (!session)
    return { state: "not_configured", qr: null, sessionId: null, label: INSTANCE_LABEL };
  const remote = await readInstance();
  if (session && session.uazapi_instance_id !== remote.id) throw new Error("instance_mismatch");
  if (session) {
    const { error: updateError } = await admin
      .from("channel_sessions")
      .update({
        status: remote.status,
        phone_number: remote.phone,
        last_health_check_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("organization_id", organizationId);
    if (updateError) throw new Error("instance_status_write_failed");
  }
  return {
    state: remote.state,
    qr: remote.qr,
    sessionId: session?.id ?? null,
    label: INSTANCE_LABEL,
  };
}

export async function bindInstance(admin: SupabaseClient, organizationId: string, userId: string) {
  const remote = await readInstance();
  const { data: existing, error } = await admin
    .from("channel_sessions")
    .select("id, organization_id")
    .eq("provider", INSTANCE_PROVIDER)
    .eq("uazapi_instance_id", remote.id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error("instance_lookup_failed");
  if (existing && existing.organization_id !== organizationId)
    throw new Error("instance_owned_elsewhere");
  if (!existing) {
    await admin
      .from("channel_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("provider", INSTANCE_PROVIDER)
      .is("archived_at", null);

    const { error: insertError } = await admin.from("channel_sessions").insert({
      organization_id: organizationId,
      created_by: userId,
      provider: INSTANCE_PROVIDER,
      uazapi_instance_id: remote.id,
      status: remote.status,
      phone_number: remote.phone,
      display_name: remote.name || INSTANCE_LABEL,
      webhook_path_token: randomBytes(32).toString("hex"),
      metadata: metadataInicialDoCanal(),
    });
    if (insertError && insertError.code !== "23505") throw new Error("instance_bind_failed");
    // Em disputa, a releitura também verifica o dono; nunca adota sessão alheia.
    if (insertError) return bindInstance(admin, organizationId, userId);
  }
  return observeInstance(admin, organizationId);
}

export async function startInstance(admin: SupabaseClient, organizationId: string, userId: string) {
  await bindInstance(admin, organizationId, userId);
  await connectInstance();
  return observeInstance(admin, organizationId);
}

export async function registerInstanceWebhook(admin: SupabaseClient, organizationId: string) {
  const base = new URL(
    process.env.UAZAPI_WEBHOOK_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  );
  if (base.protocol !== "https:" || /^(localhost|127\.|\[::1\])/.test(base.hostname))
    throw new Error("public_https_required");
  const { data, error } = await admin
    .from("channel_sessions")
    .select("webhook_path_token")
    .eq("organization_id", organizationId)
    .eq("provider", INSTANCE_PROVIDER)
    .is("archived_at", null)
    .single();
  if (error || !data) throw new Error("instance_session_missing");
  const url = `${base.origin}/api/v1/webhooks/instance/${data.webhook_path_token}`;
  // Adiciona somente nosso destino, preservando integrações preexistentes.
  const response = await instanceRequest("/webhook");
  // A instância real devolve null quando ainda não há destinos (contrato público: array).
  const hooks = parseWebhookDestinations(response);
  // O Quick Tunnel muda de host ao reiniciar. O path secreto identifica NOSSO
  // destino; atualizar esse id evita manter o webhook antigo morto ou duplicado.
  const existing = hooks.find((h) => new URL(h.url).pathname === new URL(url).pathname);
  await instanceRequest("/webhook", {
    ...(existing ? { action: "update", id: existing.id } : { action: "add" }),
    enabled: true,
    url,
    events: ["messages", "messages_update", "connection"],
    excludeMessages: ["isGroupYes"],
    addUrlEvents: false,
    addUrlTypesMessages: false,
  });
  return { registered: true };
}
