/**
 * GET /api/v1/cobranca/assinatura/pix — o Pix da cobrança aberta, para a tela de
 * ativar conta mostrar o QR Code e o "copia e cola" sem mandar a pessoa para
 * fora. Lê só a cobrança que o checkout desta empresa gravou
 * (`cobranca_assinaturas.checkout_sessao_id`): nenhum id vem da URL.
 */
import { randomUUID } from "node:crypto";

import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { adaptador } from "@/lib/cobranca/provedores";
import { ErroDoProvedor } from "@/lib/cobranca/provedores/contrato";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "cobranca_assinaturas", permiteOrgSuspensa: true });
  if (!authz.ok) return authz.response;
  const admin = createAdminClient();
  if (!(await moduloLigado(admin, "cobranca"))) return fail("not_found", "Not found", 404, { requestId });
  const orgId = authz.org.orgId;

  const taxa = await checkRateLimit(`cobranca-pix:${orgId}`, 20, 60);
  if (!taxa.allowed) return fail("rate_limited", "Aguarde alguns segundos.", 429, { requestId, headers: { "Retry-After": "10" } });

  const { data, error } = await admin
    .from("cobranca_assinaturas")
    .select("provedor, checkout_sessao_id, estado")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) return fail("internal_error", "Não foi possível ler a cobrança.", 500, { requestId });
  const linha = data as { provedor: string | null; checkout_sessao_id: string | null; estado: string } | null;
  if (!linha || linha.provedor !== "asaas" || !linha.checkout_sessao_id || linha.estado === "ativa") {
    return fail("sem_pix", "Não há cobrança Pix aberta.", 404, { requestId });
  }

  const asaas = adaptador("asaas");
  if (!asaas.pixDaCobranca) return fail("sem_pix", "Não há cobrança Pix aberta.", 404, { requestId });
  try {
    const pix = await asaas.pixDaCobranca(linha.checkout_sessao_id);
    return ok(
      { imagem: `data:image/png;base64,${pix.imagemBase64}`, copia_e_cola: pix.copiaECola, expira_em: pix.expiraEm },
      { requestId },
    );
  } catch (e) {
    logger.warn("cobranca.pix_indisponivel", {
      organizationId: orgId,
      codigo: e instanceof ErroDoProvedor ? e.codigo : "desconhecido",
      status: e instanceof ErroDoProvedor ? e.status : null,
    });
    return fail("pix_indisponivel", "O Pix desta cobrança não está disponível agora.", 502, { requestId });
  }
}
