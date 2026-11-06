import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { receiveInstanceWebhook } from "@/lib/channels/instance-webhook";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const path = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .safeParse((await ctx.params).token);
  if (!path.success) return fail("unauthorized", "Webhook inválido.", 401);
  const budget = await checkRateLimit("instance-hook", 600, 60);
  if (!budget.allowed) return fail("rate_limited", "Aguarde antes de reenviar eventos.", 429);
  // Limita bytes reais, inclusive em requisições sem Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return fail("validation_failed", "Corpo obrigatório.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      return fail("validation_failed", "Corpo excede o limite.", 413);
    }
    chunks.push(part.value);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return fail("validation_failed", "JSON inválido.", 400);
  }
  try {
    const result = await receiveInstanceWebhook(createAdminClient(), path.data, payload);
    if (!result.accepted) return fail("unauthorized", "Webhook inválido.", 401);
    return ok(result);
  } catch {
    return fail(
      "internal_error",
      "Evento não processado. Consulte a conexão e reconcilie o evento.",
      503,
    );
  }
}
