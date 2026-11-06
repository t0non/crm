import type { SupabaseClient } from "@supabase/supabase-js";
import { INSTANCE_PROVIDER } from "./client";

export async function assertInstanceSession(
  admin: SupabaseClient,
  organizationId: string,
  instanceId: string,
) {
  const { data, error } = await admin
    .from("channel_sessions")
    .select("id, organization_id, uazapi_instance_id, webhook_path_token")
    .eq("organization_id", organizationId)
    .eq("provider", INSTANCE_PROVIDER)
    .eq("uazapi_instance_id", instanceId)
    .is("archived_at", null)
    .single();
  if (error || !data) throw new Error("uazapi_session_not_authorized");
  return data;
}
