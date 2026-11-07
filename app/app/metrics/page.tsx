import type { Metadata } from "next";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { ROLE_RANK } from "@/lib/auth/types";

import { MetricsClient } from "./_components/MetricsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Desempenho" };

export default async function MetricsPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // spec 13 §6.1: agent vê as próprias (RLS); a comparação por atendente é manager+.
  const canCompare = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  // `t` local em vez do hook: esta página é componente de SERVIDOR, e lá o
  // idioma vem resolvido em `user.idioma` (a cadeia pessoa → organização →
  // padrão vive em `lib/auth/server.ts`), sem reler o `locale` cru.
  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <header className="space-y-1.5 border-b border-border pb-4 sm:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("Desempenho")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {canCompare
            ? t("Como estão as vendas e o atendimento da equipe.")
            : t("Como estão as suas vendas e o seu atendimento.")}
        </p>
      </header>

      <MetricsClient canCompare={canCompare} currentUserId={user.id} />
    </div>
  );
}
