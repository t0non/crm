"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requirePlatformAdminEscrita } from "@/lib/auth/requirePlatformAdmin";
import { CHAVE_CUPOM_PROFISSIONAL, CUPOM_PROFISSIONAL } from "@/lib/cobranca/oferta-profissional";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { gravarPelaTela } from "@/lib/instalacao/config";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { createAdminClient } from "@/lib/supabase/admin";

export async function atualizarCupom(form: FormData) {
  if (await requireSupportWrite()) throw new Error("Operação indisponível em modo de suporte.");
  const { user } = await requirePlatformAdminEscrita();
  const valor = form.get("ativo");
  if (valor !== "0" && valor !== "1") throw new Error("Estado do cupom inválido.");
  if (!(await moduloLigado(createAdminClient(), "cobranca"))) throw new Error("Cobrança desabilitada.");
  const resultado = await gravarPelaTela(CHAVE_CUPOM_PROFISSIONAL, valor, { ehSegredo: false, ator: user.id });
  if (!resultado.ok) throw new Error("Não foi possível salvar o cupom.");
  await audit({
    action: "cobranca.cupom_atualizado",
    actorUserId: user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "platform_config",
    metadata: { cupom: CUPOM_PROFISSIONAL, ativo: valor === "1" },
  });
  revalidatePath("/admin/cobranca");
}
