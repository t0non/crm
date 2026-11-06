import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { replayInstanceReceipts } from "@/lib/channels/instance-webhook";
import {
  bindInstance,
  observeInstance,
  registerInstanceWebhook,
  startInstance,
  instanceCredentialsRejected,
} from "@/lib/channels/instance-channel";

export const dynamic = "force-dynamic";
export async function GET() {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId });
  if (!auth.ok) return auth.response;
  if (!auth.org) return fail("forbidden_tenant", "Selecione uma organização.", 403, { requestId });
  try {
    return ok(await observeInstance(createAdminClient(), auth.org.orgId), { requestId });
  } catch (error) {
    if (instanceCredentialsRejected(error))
      return fail(
        "invalid_credentials",
        "O serviço do WhatsApp recusou o token da instância. Confira a credencial e a validade da instância no painel do provedor.",
        422,
        { requestId },
      );
    return fail(
      "internal_error",
      "Não foi possível consultar a instância. Confira a configuração no servidor e a conexão.",
      502,
      { requestId },
    );
  }
}
const actionSchema = z
  .object({ action: z.enum(["bind", "connect", "webhook", "replay"]) })
  .strict();
export async function POST(req: Request) {
  const requestId = randomUUID();
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const auth = await requireRole("admin", { requestId });
  if (!auth.ok) return auth.response;
  if (!auth.org) return fail("forbidden_tenant", "Selecione uma organização.", 403, { requestId });
  const input = actionSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail("validation_failed", "Ação inválida.", 422, { requestId });
  try {
    const admin = createAdminClient();
    const result =
      input.data.action === "connect"
        ? await startInstance(admin, auth.org.orgId, auth.user.id)
        : input.data.action === "bind"
          ? await bindInstance(admin, auth.org.orgId, auth.user.id)
          : input.data.action === "replay"
            ? await replayInstanceReceipts(admin, auth.org.orgId)
            : await registerInstanceWebhook(admin, auth.org.orgId);
    await audit({
      action: "channel.connection_updated",
      actorUserId: auth.user.id,
      organizationId: auth.org.orgId,
      requestId,
      metadata: { action: input.data.action },
    });
    return ok(result, { requestId });
  } catch {
    return fail(
      "validation_failed",
      "Operação não concluída. Confira a instância e as credenciais no servidor. Para webhooks é necessário um endereço público HTTPS.",
      422,
      { requestId },
    );
  }
}
