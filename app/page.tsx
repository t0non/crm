import { ArrowRight, Check, GitBranch, LayoutGrid, MessageCircle, MessagesSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { marcaDaSaida } from "@/lib/branding/saida";
import { CAMINHO_CADASTRO_COMERCIAL, CAMINHO_LOGIN_COMERCIAL } from "@/lib/cobranca/jornada";
import { PRECO_PROFISSIONAL_CENTS } from "@/lib/cobranca/oferta-profissional";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const recursos = [
  { icon: MessagesSquare, titulo: "Conversas em um só lugar", descricao: "Organize o atendimento do WhatsApp e encontre o histórico de cada contato." },
  { icon: GitBranch, titulo: "Um funil que a equipe acompanha", descricao: "Veja em que etapa cada oportunidade está e mantenha o próximo passo à vista." },
  { icon: Sparkles, titulo: "IA com atendimento humano", descricao: "Use agentes para responder e qualificar leads. Passe a conversa para a equipe quando precisar." },
];

const etapas = [
  ["Crie sua conta", "Informe seus dados e confirme seu e-mail."],
  ["Revise seu plano", "Confira o valor mensal e aplique seu cupom, se tiver."],
  ["Conclua no Asaas", "Pague com cartão. O CRM libera o acesso após a confirmação."],
];

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const cta = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff7028] px-5 py-3 text-sm font-semibold text-[#22130b] transition hover:bg-[#ff8a50] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const marca = await marcaDaSaida(null);
  return (
    <div className="min-h-screen bg-[#f9f8f5] text-[#171821]">
      <div className="bg-[#151721] text-white">
        <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#ff7028] text-[#22130b]"><LayoutGrid aria-hidden="true" className="size-5" /></span>
            {marca.nome}
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-4 text-sm sm:gap-7">
            <a href="#recursos" className="hidden text-zinc-300 hover:text-white sm:inline">Recursos</a>
            <a href="#plano" className="text-zinc-300 hover:text-white">Plano</a>
            <Link href="/login" className="rounded-lg border border-white/20 px-3 py-2 font-medium hover:bg-white/10">Entrar</Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:pt-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-orange-200">
              <MessageCircle aria-hidden="true" className="size-4" /> CRM para vendas no WhatsApp
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
              Do primeiro oi ao fechamento.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-300">
              Acompanhe conversas, oportunidades e próximos passos em um só lugar. Dê à sua equipe o contexto para continuar cada atendimento.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link href={CAMINHO_CADASTRO_COMERCIAL} className={cta}>Começar agora <ArrowRight aria-hidden="true" className="size-4" /></Link>
              <a href="#plano" className="text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Ver preço e condições</a>
            </div>
          </div>

          <figure className="rounded-2xl border border-white/15 bg-[#222532] p-4 shadow-2xl shadow-black/35 sm:p-6">
            <figcaption className="mb-5 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">Funil de vendas</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">Exemplo ilustrativo</span>
            </figcaption>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { etapa: "Novos contatos", item: "Pedido de orçamento", detalhe: "Chegou pelo WhatsApp" },
                { etapa: "Em negociação", item: "Proposta comercial", detalhe: "Retornar amanhã" },
                { etapa: "Fechamento", item: "Contrato em revisão", detalhe: "Aguardando retorno" },
              ].map(({ etapa, item, detalhe }, index) => (
                <div key={etapa} className="min-w-0 rounded-xl bg-[#161925] p-3">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                    <span className={["size-2 shrink-0 rounded-full bg-sky-400", "size-2 shrink-0 rounded-full bg-orange-400", "size-2 shrink-0 rounded-full bg-emerald-400"][index]} />
                    {etapa}
                  </p>
                  <p className="rounded-lg border border-white/10 bg-[#282c3a] p-3 text-sm font-medium">
                    {item}
                    <span className="mt-2 block text-xs font-normal text-zinc-300">{detalhe}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-zinc-200">
              <MessagesSquare aria-hidden="true" className="size-5 shrink-0 text-orange-300" />
              Histórico, responsável e próximo passo juntos na mesma conversa.
            </div>
          </figure>
        </section>
      </div>

      <main>
        <section id="recursos" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">O que sua equipe faz no CRM</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {recursos.map(({ icon: Icon, titulo, descricao }) => (
              <article key={titulo} className="rounded-2xl border border-[#e5e1db] bg-white p-6">
                <Icon aria-hidden="true" className="mb-5 size-6 text-[#b83c08]" />
                <h3 className="font-semibold">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-[#55545b]">{descricao}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="plano" className="border-y border-[#e5e1db] bg-[#f2eee8]">
          <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.75fr] lg:gap-20">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Como começar</h2>
              <ol className="mt-7 space-y-5">
                {etapas.map(([titulo, descricao], index) => (
                  <li key={titulo} className="flex gap-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffe2d1] text-sm font-semibold text-[#8b300a]">{index + 1}</span>
                    <div><p className="font-semibold">{titulo}</p><p className="text-[#55545b]">{descricao}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <article className="rounded-2xl border border-[#ded7cf] bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-xl font-semibold">Plano Profissional</h3>
              <p className="mt-4 text-4xl font-semibold tracking-tight">{reais.format(PRECO_PROFISSIONAL_CENTS / 100)} <span className="text-base font-normal text-[#55545b]">/ mês</span></p>
              <p className="mt-3 flex gap-2 text-sm text-[#55545b]"><Check aria-hidden="true" className="size-4 shrink-0 text-[#b83c08]" /> Se tiver um cupom, aplique antes de pagar.</p>
              <Link href={CAMINHO_CADASTRO_COMERCIAL} className={cta + " mt-6 w-full"}>Criar conta</Link>
              <Link href={CAMINHO_LOGIN_COMERCIAL} className="mt-4 block text-center text-sm font-medium underline underline-offset-4">Já tenho conta</Link>
            </article>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-7 text-sm text-[#55545b] sm:px-8">
        <p className="font-semibold text-[#171821]">{marca.nome}</p>
        <nav aria-label="Documentos legais" className="flex flex-wrap gap-4">
          <Link href="/legal/privacy#dados-do-google" className="underline underline-offset-4">Política de Privacidade</Link>
          <Link href="/legal/terms" className="underline underline-offset-4">Termos de Uso</Link>
        </nav>
      </footer>
    </div>
  );
}
