import { redirect } from "next/navigation";

import { FaixaDeCor } from "@/components/branding/FaixaDeCor";
import { FormularioDoPlano } from "@/components/cobranca/FormularioDoPlano";
import { loadAuthUser, orgAtivaSemPortao } from "@/lib/auth/server";
import { checkoutSandboxHabilitado } from "@/lib/cobranca/configuracao";
import { CAMINHO_LOGIN_COMERCIAL } from "@/lib/cobranca/jornada";
import { PRECO_PROFISSIONAL_CENTS, PRECO_TESTE_ASAAS_CENTS } from "@/lib/cobranca/oferta-profissional";

import { aplicarCupom } from "./actions";

export const metadata = { title: "Plano Profissional | Data Sales CRM" };

export default async function Planos({ searchParams }: { searchParams: Promise<{ cupom?: string; contratar?: string }> }) {
  const { cupom, contratar } = await searchParams;
  const user = await loadAuthUser();
  if (contratar === "1") {
    if (!user) redirect(CAMINHO_LOGIN_COMERCIAL);
    if (!(await orgAtivaSemPortao(user))) redirect("/get-started");
  }
  const inicial = typeof cupom === "string" ? await aplicarCupom(cupom).catch(() => null) : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-12 text-foreground sm:py-20">
      <FaixaDeCor />
      <div className="relative z-10 mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground">DATA SALES CRM</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Plano Profissional</h1>
          <p className="mt-3 text-muted-foreground">Assinatura mensal com renovação automática no cartão.</p>
        </header>
        <FormularioDoPlano precoOficial={PRECO_PROFISSIONAL_CENTS} inicial={inicial} autenticado={Boolean(user)} precoTeste={checkoutSandboxHabilitado() ? PRECO_TESTE_ASAAS_CENTS : undefined} />
      </div>
    </main>
  );
}
