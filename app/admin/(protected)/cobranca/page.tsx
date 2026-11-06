import Link from "next/link";
import { notFound } from "next/navigation";

import { CopiarLinkDePagamento } from "@/components/admin/cobranca/CopiarLinkDePagamento";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { toleranciaDias } from "@/lib/cobranca/configuracao";
import { cupomProfissionalAtivo } from "@/lib/cobranca/cupom-profissional";
import { ROTULO_DO_ERRO, ROTULO_DO_ESTADO } from "@/lib/cobranca/rotulos";
import { leituraAtrasada, lerVisaoGeral, montarChecklist } from "@/lib/cobranca/visao-geral";
import type { ErroDeLeitura, EstadoDaAssinatura } from "@/lib/cobranca/vocabulario";
import { traduzir } from "@/lib/i18n/dicionario";
import { normalizarIdioma } from "@/lib/i18n/idiomas";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { COLUNAS_DO_PLANO } from "@/lib/schemas/cobranca-plano";
import { createAdminClient } from "@/lib/supabase/admin";

import { AbasDaCobranca } from "./_abas";
import { ABAS_DA_COBRANCA, type AbaDaCobranca } from "./_abas-lista";
import { ConexaoDaCobranca } from "./_conexao";
import { PlanosDaInstalacao, type PlanoDaTela } from "./_planos";
import { ReguaDaCobranca } from "./_regua";
import { FaixaDoModoDeTeste, VisaoGeral } from "./_visao-geral";
import { atualizarCupom } from "./cupom-actions";

export const metadata = { title: "Cobrança — Admin Plataforma" };
export const dynamic = "force-dynamic";

interface ClienteDaTela {
  id: string;
  display_name: string;
  cobranca_assinaturas: {
    plano_id: string;
    plano_agendado_id: string | null;
    estado: EstadoDaAssinatura;
    trial_ate: string | null;
    prazo_extra_ate: string | null;
    proximo_vencimento: string | null;
    relida_em: string | null;
    ultimo_erro: ErroDeLeitura | null;
    provedor: string | null;
    vencida_desde: string | null;
    link_de_pagamento: string | null;
  };
}

/**
 * /admin/cobranca (spec da cobrança do revendedor §9), em abas: Visão geral
 * (checklist, saúde, problemas), Conexão, Régua, Planos e Clientes. Chave
 * desligada → 404. Dar prazo, isentar e trocar plano moram no card do tenant
 * (o "Abrir" leva lá, Divergência 45); a lista tem o que recupera receita já:
 * "Em atraso desde" e "Copiar link de pagamento". Leitura que falha LANÇA.
 */
export default async function CobrancaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { user } = await requirePlatformAdmin();
  const idioma = normalizarIdioma((user.user_metadata?.locale as string | undefined) ?? null);
  const t = (texto: string) => traduzir(texto, idioma);
  const admin = createAdminClient();
  if (!(await moduloLigado(admin, "cobranca"))) notFound();
  const { aba } = await searchParams;
  const inicial: AbaDaCobranca = ABAS_DA_COBRANCA.find((a) => a === aba) ?? "visao-geral";

  const [planos, clientes, visao, tolerancia] = await Promise.all([
    admin.from("cobranca_planos").select(COLUNAS_DO_PLANO).order("nome"),
    admin
      .from("organizations")
      .select(
          "id, display_name, cobranca_assinaturas!inner(plano_id, plano_agendado_id, estado, trial_ate, prazo_extra_ate, proximo_vencimento, relida_em, ultimo_erro, provedor, vencida_desde, link_de_pagamento)",
      )
      .order("display_name"),
    lerVisaoGeral(admin),
    toleranciaDias(),
  ]);
  if (planos.error || clientes.error) {
    throw new Error(`cobrança: leitura falhou (${planos.error?.code ?? clientes.error?.code})`);
  }
  const lista = (planos.data ?? []) as PlanoDaTela[];
  const nomeDoPlano = new Map(lista.map((p) => [p.id, p.nome]));
  const pagantes = (clientes.data ?? []) as unknown as ClienteDaTela[];
  const data = new Intl.DateTimeFormat(idioma, { dateStyle: "short" });
  const quando = (v: string | null) => (v ? data.format(new Date(v)) : "—");
  const agora = new Date();
  const contagens = visao.modo ? await Promise.all(
    (["ativa", "em_atraso", "cancelada"] as const).flatMap((estado) => [29700, 14700].map((valor) =>
      admin.from("cobranca_assinaturas").select("organization_id", { count: "exact", head: true })
        .eq("provedor", "asaas").eq("modo", visao.modo).eq("estado", estado).eq("preco_contratado_cents", valor),
    )),
  ) : [];
  const contagensLegiveis = contagens.length > 0 && contagens.every((item) => !item.error && item.count !== null);
  const [ativasOficiais = 0, ativasComCupom = 0, atrasoOficial = 0, atrasoComCupom = 0, canceladasOficiais = 0, canceladasComCupom = 0] =
    contagens.map((item) => item.count ?? 0);
  const reais = new Intl.NumberFormat(idioma, { style: "currency", currency: "BRL" });
  const cupomAtivo = await cupomProfissionalAtivo(admin).catch(() => null);

  const clientesDaTela =
    pagantes.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("Nenhuma empresa paga ainda. Atribua um plano no painel da empresa, em Tenants.")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t("Empresa")}</th>
              <th className="pr-4 font-medium">{t("Plano")}</th>
              <th className="pr-4 font-medium">{t("Situação")}</th>
              <th className="pr-4 font-medium">{t("Próximo vencimento")}</th>
              <th className="pr-4 font-medium">{t("Em atraso desde")}</th>
              <th className="pr-4 font-medium">{t("Última leitura")}</th>
              <th className="pr-4 font-medium">{t("Problema")}</th>
              <th><span className="sr-only">{t("Abrir")}</span></th>
            </tr>
          </thead>
          <tbody>
            {pagantes.map((c) => {
              const a = c.cobranca_assinaturas;
              const atrasada = a.provedor !== null && leituraAtrasada(a.relida_em, agora, 26);
              return (
                <tr key={c.id} className="border-t">
                  <td className="py-2 pr-4">{c.display_name}</td>
                  <td className="pr-4">
                    {nomeDoPlano.get(a.plano_id) ?? "—"}
                    {a.plano_agendado_id && ` → ${nomeDoPlano.get(a.plano_agendado_id) ?? "—"}`}
                  </td>
                  <td className="pr-4">{t(ROTULO_DO_ESTADO[a.estado])}</td>
                  <td className="pr-4">{quando(a.estado === "trial" ? a.trial_ate : a.proximo_vencimento)}</td>
                  <td className={a.estado === "em_atraso" ? "pr-4 text-error-fg" : "pr-4"}>{a.estado === "em_atraso" ? quando(a.vencida_desde) : "—"}</td>
                  <td className={atrasada ? "pr-4 text-error-fg" : "pr-4"}>{a.provedor ? quando(a.relida_em) : "—"}</td>
                  <td className="pr-4">{a.ultimo_erro ? t(ROTULO_DO_ERRO[a.ultimo_erro]) : "—"}</td>
                  <td className="py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.link_de_pagamento && <CopiarLinkDePagamento link={a.link_de_pagamento} />}
                      <Link href={`/admin/tenants/${c.id}`} className="underline">{t("Abrir")}</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Cobrança dos seus clientes")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Os planos que você vende e as empresas que pagam. Empresa sem plano é isenta: não paga e não tem limites.")}
        </p>
      </header>
      <FaixaDoModoDeTeste modo={visao.modo} idioma={idioma} />
      <AbasDaCobranca
        inicial={inicial}
        paineis={{
          "visao-geral": (
            <div className="space-y-6">
              {contagensLegiveis && (
                <section className="space-y-3 rounded-xl border p-5">
                  <h2 className="font-semibold">Plano Profissional · checkout recorrente</h2>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt>Ativas por R$ 297</dt><dd>{ativasOficiais}</dd></div>
                    <div><dt>Ativas por R$ 147</dt><dd>{ativasComCupom}</dd></div>
                    <div><dt>Em atraso</dt><dd>{atrasoOficial + atrasoComCupom}</dd></div>
                    <div><dt>Canceladas</dt><dd>{canceladasOficiais + canceladasComCupom}</dd></div>
                    <div><dt>MRR das assinaturas ativas</dt><dd>{reais.format(ativasOficiais * 297 + ativasComCupom * 147)}</dd></div>
                    <div><dt>MRR de TOPMARKETINGBH</dt><dd>{reais.format(ativasComCupom * 147)}</dd></div>
                  </dl>
                </section>
              )}
              {cupomAtivo !== null && (
                <form action={atualizarCupom} className="space-y-2 rounded-xl border p-5 text-sm">
                  <h2 className="font-semibold">Cupom TOPMARKETINGBH</h2>
                  <p>{cupomAtivo ? "Ativo para novas contratações." : "Indisponível para novas contratações."}</p>
                  {process.env.TOPMARKETINGBH_ATIVO === "0" ? <p>Desativado pela configuração do ambiente.</p> : (
                    <button className="rounded-md border px-3 py-2" name="ativo" value={cupomAtivo ? "0" : "1"}>
                      {cupomAtivo ? "Desativar cupom" : "Ativar cupom"}
                    </button>
                  )}
                </form>
              )}
              <VisaoGeral dados={visao} checklist={montarChecklist(visao)} idioma={idioma} agora={agora} />
            </div>
          ),
          conexao: <ConexaoDaCobranca provedor={visao.provedor} modo={visao.modo} last4={visao.chaveLast4} urlDoWebhook={visao.urlDoWebhook} />,
          regua: <ReguaDaCobranca tolerancia={tolerancia} />,
          planos: <PlanosDaInstalacao planos={lista} />,
          clientes: clientesDaTela,
        }}
      />
    </div>
  );
}
