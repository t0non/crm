"use client";
/**
 * Início: a primeira tela do dia. Responde três perguntas, nesta ordem:
 * 1. Quem está esperando resposta agora? (os números da inbox, clicáveis)
 * 2. O que falta para o sistema funcionar inteiro? (primeiros passos)
 * 3. Por onde começo uma ação? (atalhos)
 *
 * Só lê rotas que já existem; nada aqui grava.
 */
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import imagemInicio from "@/imagem_inicio.png";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useMetasDoMes } from "@/hooks/metrics/useMetasDoMes";
import { apiClient } from "@/lib/api/client";
import { ROLE_RANK, escreveComoPlatformAdmin } from "@/lib/auth/types";
import { janelaDoMes, mesLocal } from "@/lib/metas/periodo";
import { ArrowRight, Check, Kanban, Megaphone, PaperPlaneTilt, Plus, Users } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { MetaDoMesPanel } from "../metrics/_components/MetaDoMesPanel";

type Contagens = Partial<Record<"fila" | "automatico" | "mine" | "all", number>>;

async function quantos(url: string): Promise<number> {
  try {
    const r = await apiClient.get<{ data: unknown }>(url);
    return Array.isArray(r.data) ? r.data.length : 0;
  } catch {
    return 0;
  }
}

function MetaDoMesNoInicio({ podeConfigurar, moeda }: { podeConfigurar: boolean; moeda: string }) {
  const consulta = useMetasDoMes(janelaDoMes(mesLocal()), "valor_vendas_ganhas");
  const dados = consulta.data?.data;
  const metas = dados?.metas.filter((meta) => meta.escopo === "empresa") ?? [];
  const estado = consulta.isLoading ? "carregando" : consulta.isError ? "erro" : metas.length ? "ok" : "vazio";

  return (
    <MetaDoMesPanel
      estado={estado}
      periodo={dados?.periodo ?? null}
      metas={metas}
      podeConfigurar={podeConfigurar}
      moeda={moeda}
    />
  );
}

export function InicioClient() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const nivel = activeOrg ? ROLE_RANK[activeOrg.role] : 0;
  const podeVerMeta = !!activeOrg && (
    nivel >= ROLE_RANK.agent || (user.is_platform_admin && !user.support)
  );
  const primeiroNome = (user.full_name ?? "").trim().split(/\s+/)[0] || "";

  const contagens = useQuery({
    queryKey: ["inicio", "contagens"],
    queryFn: async () => (await apiClient.get<{ data: Contagens }>("/api/v1/conversations/counts")).data,
    refetchInterval: 30_000,
  });

  const passos = useQuery({
    queryKey: ["inicio", "passos"],
    queryFn: async () => {
      const canais = await apiClient
        .get<{ data: Array<{ status: string }> }>("/api/v1/channel-sessions")
        .then((r) => r.data)
        .catch(() => []);
      const [funis, modelos, bots, transmissoes] = await Promise.all([
        quantos("/api/v1/pipelines"),
        quantos("/api/v1/message-templates"),
        quantos("/api/v1/ai/followup-flows"),
        quantos("/api/v1/campaigns?limit=1"),
      ]);
      return {
        whatsapp: canais.some((c) => c.status === "WORKING"),
        funil: funis > 0,
        modelo: modelos > 0,
        bot: bots > 0,
        transmissao: transmissoes > 0,
      };
    },
  });

  const c = contagens.data ?? {};
  const numeros = [
    { rotulo: "Conversas abertas", valor: c.all, href: "/app/inbox?filter=all", destaque: false },
    { rotulo: "Esperando resposta", valor: c.fila, href: "/app/inbox?filter=unassigned", destaque: true },
    { rotulo: "Atribuídas a mim", valor: c.mine, href: "/app/inbox?filter=mine", destaque: false },
    { rotulo: "Com o robô", valor: c.automatico, href: "/app/inbox?filter=ai", destaque: false },
  ];

  const p = passos.data;
  const lista = [
    { feito: p?.whatsapp, titulo: "Conectar seu WhatsApp", texto: "Leia o QR code com o celular da empresa.", href: "/app/connections", botao: "Conectar" },
    { feito: p?.funil, titulo: "Montar seu funil de vendas", texto: "As etapas por onde o cliente passa até comprar.", href: "/app/kanban", botao: "Abrir funil" },
    { feito: p?.modelo, titulo: "Criar uma mensagem pronta", texto: "Respostas que você usa todo dia, a um clique.", href: "/app/templates", botao: "Criar modelo" },
    { feito: p?.bot, titulo: "Criar um follow-up automático", texto: "O sistema chama de volta quem parou de responder.", href: "/app/ai/followups", botao: "Criar" },
    { feito: p?.transmissao, titulo: "Enviar sua primeira transmissão", texto: "Uma mensagem para vários clientes de uma vez.", href: "/app/campaigns/new", botao: "Começar" },
  ];
  const feitos = lista.filter((x) => x.feito).length;

  const atalhos = [
    { titulo: "Iniciar conversa", href: "/app/inbox", Icon: Plus },
    { titulo: "Ver o funil", href: "/app/kanban", Icon: Kanban },
    { titulo: "Nova transmissão", href: "/app/campaigns/new", Icon: Megaphone },
    { titulo: "Meus contatos", href: "/app/contacts", Icon: Users },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <section className="grid items-center gap-5 rounded-xl border border-border bg-card p-6 sm:p-8 md:grid-cols-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t("Início")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {primeiroNome ? `${t("Olá")}, ${primeiroNome}!` : t("Olá!")}
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            {t("Aqui está o resumo do seu atendimento. Comece pelas conversas que estão esperando resposta.")}
          </p>
          <Link
            href="/app/inbox"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-base font-semibold text-accent-foreground hover:opacity-90"
          >
            <PaperPlaneTilt size={18} aria-hidden />
            {t("Abrir conversas")}
          </Link>
          {podeVerMeta && (
            <div className="mt-5">
              <MetaDoMesNoInicio
                podeConfigurar={nivel >= ROLE_RANK.manager || (escreveComoPlatformAdmin(user) && !user.support)}
                moeda={activeOrg?.currency ?? "BRL"}
              />
            </div>
          )}
        </div>
        <Image
          src={imagemInicio}
          alt=""
          sizes="(min-width: 1024px) 450px, (min-width: 768px) 45vw, 90vw"
          className="h-auto w-full"
        />
      </section>

      <section aria-label={t("Resumo das conversas")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numeros.map((n) => (
          <Link
            key={n.rotulo}
            href={n.href}
            className={cn(
              "rounded-xl border bg-card p-4 transition-colors hover:border-accent",
              n.destaque && (n.valor ?? 0) > 0 ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : "border-border",
            )}
          >
            <p className="text-sm text-muted-foreground">{t(n.rotulo)}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{contagens.isLoading ? "…" : (n.valor ?? 0)}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{t("Primeiros passos")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Faça na ordem. Cada passo leva poucos minutos.")}
            </p>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {feitos} {t("de")} {lista.length} {t("feitos")}
          </span>
        </header>
        <ol className="divide-y divide-border">
          {lista.map((item, i) => (
            <li key={item.titulo} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  item.feito ? "bg-emerald-500 text-white" : "bg-muted text-foreground",
                )}
              >
                {item.feito ? <Check size={16} weight="bold" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-base font-medium", item.feito && "text-muted-foreground line-through")}>
                  {t(item.titulo)}
                </p>
                <p className="text-sm text-muted-foreground">{t(item.texto)}</p>
              </div>
              {!item.feito && (
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold hover:border-accent hover:text-accent"
                >
                  {t(item.botao)}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label={t("Atalhos")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {atalhos.map(({ titulo, href, Icon }) => (
          <Link
            key={titulo}
            href={href}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 text-base font-medium hover:border-accent hover:text-accent"
          >
            <Icon size={20} aria-hidden />
            {t(titulo)}
          </Link>
        ))}
      </section>
    </div>
  );
}
