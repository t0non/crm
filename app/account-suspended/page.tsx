import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/app/actions/auth/signOut";
import { LgpdRequestDetail } from "@/app/app/lgpd/requests/[id]/_client";
import { RequestsTable } from "@/app/app/lgpd/requests/RequestsTable";
import { OutrasOrganizacoes } from "@/app/onboarding/_components/OutrasOrganizacoes";
import { AcoesDaAssinatura } from "@/components/cobranca/AcoesDaAssinatura";
import { PainelDaAssinatura } from "@/components/cobranca/PainelDaAssinatura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { orgAtivaSemPortao, requireAuth } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { emailDeSuporte } from "@/lib/branding/saida";
import { lerPainelDoHub, oQueOHubMostra } from "@/lib/cobranca/hub";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";
import { traduzir } from "@/lib/i18n/dicionario";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { ehOperante, tipoDaSuspensao } from "@/lib/organizacao/operante";
import { Lock } from "@/lib/ui/icons";
import { FaixaDeCor } from "@/components/branding/FaixaDeCor";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ativar conta",
};

const PEDIDO = z.uuid();

/**
 * O HUB de quem está numa empresa suspensa (spec da cobrança do revendedor, §9).
 *
 * Fica fora de `app/app/` de propósito: quem manda a empresa suspensa para cá é
 * o layout de `/app`, então nada aqui pode depender dele. Não lê `x-pathname`:
 * a tela não precisa do caminho.
 *
 * Esta tela entregava o NOSSO endereço de suporte ao cliente de um revendedor,
 * e aqui isso é ativamente errado: quem suspendeu a conta foi o revendedor, e
 * escrever para nós não desbloqueia nada. O endereço sai de `SUPPORT_EMAIL`
 * (o do operador) e, quando ninguém configurou, o parágrafo do contato NÃO
 * renderiza.
 *
 * Suspensão de kind `cobranca` com a chave ligada: o painel de pagamento
 * (`lib/cobranca/hub.ts` decide), e quem paga volta sozinho.
 */
export default async function AccountSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; voltou?: string }>;
}) {
  const user = await requireAuth();
  const ativa = await orgAtivaSemPortao(user);
  if (!ativa) redirect("/app");

  // Service role com ids que vieram da SESSÃO (a org ativa e os vínculos do
  // próprio usuário), nunca da URL. Uma leitura responde as duas perguntas:
  // a ativa opera? e quais das outras operam?
  const ids = [...new Set([ativa.orgId, ...user.organizations.map((o) => o.organization_id)])];
  const admin = createAdminClient();
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, status, suspended_kind")
    .in("id", ids);
  // Leitura que não aconteceu não vira resposta: redirecionar por palpite
  // prenderia a pessoa num laço com o layout de `/app`.
  if (error) throw new Error(`account_suspended_status_indisponivel: ${error.message}`);
  const statusDe = new Map((orgs ?? []).map((o) => [o.id, o.status]));
  const tipoDaAtiva = tipoDaSuspensao(
    statusDe.get(ativa.orgId),
    (orgs ?? []).find((o) => o.id === ativa.orgId)?.suspended_kind ?? null,
  );
  // Volta para `/app` só quando AS DUAS réguas que o layout de `/app` usa dizem
  // que a org opera: a da sessão (`org_status`, a do `resolveActiveOrg`) e a do
  // banco (a leitura por service role, a do `orgRow.status` do layout). O layout
  // manda para cá quando QUALQUER uma diz parada; olhar só uma aqui faria da
  // divergência um laço de 307.
  // Com `?pedido=` (o e-mail de prazo da LGPD chega aqui por
  // `app/lgpd/pedido/[id]/route.ts`), volta ao PEDIDO: é aqui que o link decide
  // no clique se a empresa opera.
  const { pedido, voltou } = await searchParams;
  const pedidoValido = PEDIDO.safeParse(pedido).success ? pedido : undefined;
  if (ehOperante(ativa.org_status) && ehOperante(statusDe.get(ativa.orgId))) {
    redirect(pedidoValido ? `/app/lgpd/requests/${pedidoValido}` : "/app");
  }

  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);
  // A MESMA régua da página `/app/lgpd/requests` e das rotas `/api/v1/lgpd/**`.
  const administra =
    (user.is_platform_admin && !user.support) || ROLE_RANK[ativa.role] >= ROLE_RANK.admin;
  // Spec da cobrança §9: suspensa POR FALTA DE PAGAMENTO + quem administra →
  // o painel de pagamento. Leitura do painel que falha NÃO derruba o hub: cai para "contato".
  const cobrancaLigada = administra && tipoDaAtiva === "cobranca" && (await moduloLigado(admin, "cobranca"));
  const painel = cobrancaLigada ? await lerPainelDoHub(admin, ativa.orgId) : null;
  const mostra = oQueOHubMostra({ administra, tipo: tipoDaAtiva, cobrancaLigada, temAssinatura: painel?.assinatura != null });
  const suporte = administra && mostra === "contato" ? await emailDeSuporte() : "";
  const outras = user.organizations
    .filter((o) => o.organization_id !== ativa.orgId && ehOperante(statusDe.get(o.organization_id)))
    .map((o) => ({ id: o.organization_id, nome: o.organization_name }));
  const pedidoAberto = administra ? pedidoValido : undefined;
  // CONTA NOVA, AINDA SEM O PRIMEIRO PAGAMENTO: não é "suspensa", é "falta
  // ativar". Quem acabou de assinar não pode ler que foi punido.
  const primeiroPagamento =
    mostra === "pagamento" && painel?.assinatura != null && !painel.assinatura.periodo_pago_desde;

  if (primeiroPagamento && painel?.assinatura) {
    const a = painel.assinatura;
    // Só o primeiro nome, como se fala com alguém: "Ei, Maria, falta pouco!".
    const primeiroNome = (user.full_name ?? "").trim().split(/\s+/)[0] ?? "";
    const precoCents = a.preco_contratado_cents ?? painel.plano?.preco_cents ?? null;
    const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const anual = painel.plano?.intervalo === "ano";
    // O valor do mês dividido pelos dias, arredondado para cima: R$ 147 → "Só R$ 4,90 por dia".
    const porDia = precoCents === null ? null : reais(Math.ceil(precoCents / (anual ? 365 : 30)));
    return (
      <IdiomaProvider locale={idioma}>
        <style>{`
          @keyframes ok-pop { 0% { transform:scale(0); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }
          @keyframes ok-onda { 0% { transform:scale(1); opacity:.6; } 100% { transform:scale(2.2); opacity:0; } }
          @keyframes ok-sobe { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:none; } }
          @keyframes botao-brilho { 0% { transform:translateX(-120%); } 55%,100% { transform:translateX(120%); } }
          .botao-brilho { position:relative; overflow:hidden; isolation:isolate; }
          .botao-brilho::after { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.45) 50%,transparent 75%); animation: botao-brilho 3.2s ease-in-out infinite; }
          .botao-premium { height:3.25rem; border-radius:.875rem; border:0; color:#fff; font-weight:600; letter-spacing:-.01em;
            background:linear-gradient(135deg,#3b82f6 0%,#2563eb 45%,#4f46e5 100%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(15,23,42,.15), 0 10px 24px -10px rgba(37,99,235,.65);
            transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
          .botao-premium:hover { transform: translateY(-1px); filter: brightness(1.05);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 2px 4px rgba(15,23,42,.15), 0 16px 32px -12px rgba(79,70,229,.7); }
          .botao-premium:active { transform: translateY(0) scale(.99); }
          .botao-premium:focus-visible { outline: 3px solid rgba(37,99,235,.35); outline-offset: 3px; }
          .botao-premium .seta { transition: transform .18s ease; }
          .botao-premium:hover .seta { transform: translateX(4px); }
          .ok-circulo { animation: ok-pop .6s cubic-bezier(.2,.9,.3,1.3) both; }
          .ok-onda { animation: ok-onda 1.4s ease-out .3s infinite; }
          .ok-texto { animation: ok-sobe .5s ease-out .35s both; }
          @media (prefers-reduced-motion: reduce) { .botao-brilho::after, .ok-circulo, .ok-onda, .ok-texto { animation:none !important; } }
        `}</style>
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
          <FaixaDeCor />

          <div className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
              <p className="truncate text-sm text-muted-foreground">{ativa.name}</p>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  {t("Sair")}
                </Button>
              </form>
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="space-y-8">
              <header className="space-y-2 text-center">
                <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  {primeiroNome ? `${t("Ei,")} ${primeiroNome}, ${t("falta pouco!")}` : t("Falta pouco!")}
                </h1>
                <p className="mx-auto max-w-sm text-balance text-lg font-light text-blue-600 dark:text-blue-400">
                  {t("Você tomou a decisão certa.")}
                </p>
              </header>

              {precoCents !== null && (
                <div className="space-y-1 text-center">
                  <p className="text-sm text-muted-foreground">{t("Tudo liberado por")}</p>
                  <p className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold tracking-tight">{reais(precoCents)}</span>
                    <span className="text-base text-muted-foreground">{anual ? t("/ano") : t("/mês")}</span>
                  </p>
                  {porDia && (
                    <p className="text-sm text-muted-foreground">
                      {t("Só")}{" "}
                      <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{porDia}</strong>{" "}
                      {t("por dia")}
                    </p>
                  )}
                </div>
              )}

              <AcoesDaAssinatura
                estado={a.estado}
                temProvedor={a.provedor !== null}
                assinaturasVivas={a.assinaturas_vivas}
                linkDePagamento={a.link_de_pagamento}
                cancelaNoFim={a.cancela_no_fim}
                planosParaTroca={[]}
                planoAtual={painel.plano ? { id: painel.plano.id, nome: painel.plano.nome, preco_cents: painel.plano.preco_cents, intervalo: painel.plano.intervalo, max_assentos: painel.plano.max_assentos, max_canais: painel.plano.max_canais, teto_ia_usd_cents: painel.plano.teto_ia_usd_cents } : null}
                periodoPagoDesde={a.periodo_pago_desde}
                proximoVencimento={a.proximo_vencimento}
                trocaPagamentoUrl={a.troca_pagamento_url}
                trocaStatus={a.troca_status}
                instanteCalculo={new Date().toISOString()}
                provedor={painel.checkout.provedor}
                documentoDoCadastro={painel.checkout.documentoDoCadastro}
                paginaDoPlano={painel.checkout.paginaDoPlano}
                fuso={painel.fuso}
                voltouDoCheckout={voltou === "1"}
                noHub
                destaque
              />

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock size={13} className="shrink-0" aria-hidden />
                {t("Pagamento seguro pelo")}
                <img src="/marcas/asaas.png" alt="Asaas" width={48} height={15} className="h-[15px] w-auto" />
              </p>
            </div>

            {outras.length > 0 && (
              <div className="flex justify-center">
                <OutrasOrganizacoes outras={outras} />
              </div>
            )}
          </div>
        </main>
      </IdiomaProvider>
    );
  }

  return (
    <IdiomaProvider locale={idioma}>
      <main className="flex min-h-screen flex-col items-center gap-8 p-4 sm:p-8">
        <Card className="w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">
            {primeiroPagamento ? t("Falta só ativar sua conta") : t("Conta suspensa")}
          </h1>
          {/* Quem participa de várias empresas precisa saber QUAL parou. Dado, não interface: sem t(). */}
          <p className="text-base font-medium">{ativa.name}</p>
          {primeiroPagamento ? (
            <p className="text-sm text-muted-foreground">
              {t("Sua conta está criada. Conclua o pagamento abaixo e o sistema é liberado na hora, assim que o pagamento for confirmado.")}
            </p>
          ) : mostra === "pagamento" ? (
            <p className="text-sm text-muted-foreground">
              {t("A conta foi suspensa por falta de pagamento. Assim que o pagamento for confirmado, tudo volta a funcionar na hora.")}
            </p>
          ) : !administra ? (
            <p className="text-sm text-muted-foreground">
              {t("Sua conta está suspensa. Avise o administrador da sua empresa.")}
            </p>
          ) : suporte ? (
            <p className="text-sm text-muted-foreground">
              {t("Sua conta está suspensa. Entre em contato com")}{" "}
              <a
                href={`mailto:${suporte}`}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                {suporte}
              </a>{" "}
              {t("para mais informações.")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                "Sua conta está suspensa. Fale com quem administra este sistema para saber o motivo e como reativá-la.",
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <OutrasOrganizacoes outras={outras} />
            {/* Encerra a sessão, como a irmã /acesso-revogado: um link para /login
                deixava a pessoa logada, e o próximo /app a trazia de volta aqui. */}
            <form action={signOut}>
              <Button type="submit" variant="outline">
                {t("Sair")}
              </Button>
            </form>
          </div>
        </Card>
        {mostra === "pagamento" && painel?.assinatura && (
          <section aria-label={t("Pagamento")} className="w-full max-w-xl space-y-4">
            <PainelDaAssinatura dados={painel} idioma={idioma} />
            <AcoesDaAssinatura
              estado={painel.assinatura.estado}
              temProvedor={painel.assinatura.provedor !== null}
              assinaturasVivas={painel.assinatura.assinaturas_vivas}
              linkDePagamento={painel.assinatura.link_de_pagamento}
              cancelaNoFim={painel.assinatura.cancela_no_fim}
              planosParaTroca={[]}
              planoAtual={painel.plano ? { id: painel.plano.id, nome: painel.plano.nome, preco_cents: painel.plano.preco_cents, intervalo: painel.plano.intervalo, max_assentos: painel.plano.max_assentos, max_canais: painel.plano.max_canais, teto_ia_usd_cents: painel.plano.teto_ia_usd_cents } : null}
              periodoPagoDesde={painel.assinatura.periodo_pago_desde}
              proximoVencimento={painel.assinatura.proximo_vencimento}
              trocaPagamentoUrl={painel.assinatura.troca_pagamento_url}
              trocaStatus={painel.assinatura.troca_status}
              instanteCalculo={new Date().toISOString()}
              provedor={painel.checkout.provedor}
              documentoDoCadastro={painel.checkout.documentoDoCadastro}
              paginaDoPlano={painel.checkout.paginaDoPlano}
              fuso={painel.fuso}
              voltouDoCheckout={voltou === "1"}
              noHub
            />
          </section>
        )}
        {administra && !primeiroPagamento && (
          <section aria-labelledby="lgpd-no-hub" className="w-full max-w-5xl space-y-4">
            <header className="space-y-1">
              <h2 id="lgpd-no-hub" className="text-lg font-semibold">
                {t("Solicitações LGPD")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("Os pedidos de LGPD dos seus clientes continuam com prazo durante a suspensão.")}
              </p>
            </header>
            {pedidoAberto ? (
              <LgpdRequestDetail id={pedidoAberto} hrefDaLista="/account-suspended" />
            ) : (
              <RequestsTable baseDoPedido="/account-suspended?pedido=" />
            )}
          </section>
        )}
      </main>
    </IdiomaProvider>
  );
}
