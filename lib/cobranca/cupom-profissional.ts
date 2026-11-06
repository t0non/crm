import type { SupabaseClient } from "@supabase/supabase-js";

import { CHAVE_CUPOM_PROFISSIONAL } from "@/lib/cobranca/oferta-profissional";

export async function cupomProfissionalAtivo(admin: SupabaseClient): Promise<boolean> {
  if (process.env.TOPMARKETINGBH_ATIVO === "0") return false;
  const { data, error } = await admin.from("platform_config").select("valor")
    .eq("chave", CHAVE_CUPOM_PROFISSIONAL).maybeSingle();
  if (error) throw new Error("Não foi possível consultar o cupom Profissional.");
  return data === null || data.valor === "1";
}
