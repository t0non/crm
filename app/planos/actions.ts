"use server";

import { cotarProfissional } from "@/lib/cobranca/oferta-profissional";
import { cupomProfissionalAtivo } from "@/lib/cobranca/cupom-profissional";
import { createAdminClient } from "@/lib/supabase/admin";

export async function aplicarCupom(codigo: string) {
  if (typeof codigo !== "string" || !codigo.trim() || codigo.length > 80) return null;
  if (!cotarProfissional(codigo)) return null;
  return cotarProfissional(codigo, await cupomProfissionalAtivo(createAdminClient()));
}
