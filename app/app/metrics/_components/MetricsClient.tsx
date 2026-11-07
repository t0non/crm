"use client";
/**
 * Desempenho — o painel do dono, em linguagem de dono.
 *
 * Na frente, só três perguntas: (1) vou bater a meta do mês? (2) quanto
 * vendi e perdi nos últimos 30 dias? (3) onde estão os clientes agora?
 * Os relatórios técnicos (atrito, perdas, previsão, canais, série) não
 * sumiram: ficam em "Relatórios detalhados", fechados por padrão.
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { definirMetaMensal } from "@/app/actions/settings/definirMetaMensal";
import { EmptyState } from "@/components/empty/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendantMetrics, type AttendantMetric } from "@/hooks/metrics/useAttendantMetrics";
import { useMetasDoMes } from "@/hooks/metrics/useMetasDoMes";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { formatarDuracao } from "@/lib/metrics/canais";
import { janelaDoMes, mesLocal } from "@/lib/metas/periodo";
import { PencilSimple, Plus, WarningOctagon } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { AtritoPanel } from "./AtritoPanel";
import { CanaisPanel } from "./CanaisPanel";
import { PerdasPanel } from "./PerdasPanel";
import { PrevisaoPanel } from "./PrevisaoPanel";
import { SeriePanel } from "./SeriePanel";

const ALL = "__all__";

function attendantLabel(a: AttendantMetric, t: (texto: string) => string): string {
  return a.name ?? a.email ?? `${t("Atendente")} ${a.user_id.slice(0, 8)}`;
}

const CARTAO = "rounded-xl border border-border bg-card p-5";

interface Props {
  canCompare: boolean;
  currentUserId: string;
}

export function MetricsClient({ canCompare, currentUserId }: Props) {
  const t = useT();
  const [owner, setOwner] = useState<string>(ALL);
  const selectedOwner = owner === ALL ? null : owner;
  const { data, isLoading, isError, refetch } = useAttendantMetrics(selectedOwner);
  const team = useTeamMembers({ enabled: canCompare });

  const [janelaDaMeta] = useState(() => janelaDoMes(mesLocal()));
  const metasDoMes = useMetasDoMes(janelaDaMeta);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t("Carregando o desempenho")}>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={WarningOctagon}
        headline="Não consegui carregar o desempenho"
        subcopy="Pode ser uma falha de rede. Tente de novo em instantes."
        primary={{ label: t("Tentar de novo"), onClick: () => void refetch() }}
      />
    );
  }

  const metrics = data.data;
  const somar = (f: (a: AttendantMetric) => number) => metrics.attendants.reduce((acc, a) => acc + f(a), 0);
  const ganhos = somar((a) => a.won);
  const perdidos = somar((a) => a.lost);
  const conversas = somar((a) => a.conversations_handled);
  const tempos = metrics.attendants
    .map((a) => a.avg_first_response_seconds)
    .filter((v): v is number => typeof v === "number");
  const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

  const etapasComGente = metrics.funnel.filter((s) => s.count > 0);
  const maior = Math.max(1, ...etapasComGente.map((s) => s.count));

  const meta = metasDoMes.data?.data.metas?.find((m) => m.escopo === "empresa") ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {canCompare && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="filtro-atendente" className="text-sm font-medium">
            {t("Ver os números de")}
          </label>
          <select
            id="filtro-atendente"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-10 min-w-0 rounded-md border border-border bg-card px-3 text-sm sm:w-64"
          >
            <option value={ALL}>{t("Toda a equipe")}</option>
            {(team.data?.data ?? [])
              .filter((m) => m.role !== "viewer")
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.email ?? m.user_id.slice(0, 8)}
                  {m.user_id === currentUserId ? ` ${t("(você)")}` : ""}
                </option>
              ))}
          </select>
        </div>
      )}

      <MetaSimples
        carregando={metasDoMes.isLoading}
        alvo={meta?.alvo ?? null}
        realizado={meta?.realizado ?? 0}
        podeEditar={canCompare}
        onSalvo={() => void metasDoMes.refetch()}
      />

      <section aria-label={t("Últimos 30 dias")} className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("Últimos 30 dias")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Numero rotulo={t("Vendas fechadas")} valor={String(ganhos)} cor="text-emerald-600" />
          <Numero rotulo={t("Vendas perdidas")} valor={String(perdidos)} cor="text-red-600" />
          <Numero rotulo={t("Conversas atendidas")} valor={String(conversas)} />
          <Numero rotulo={t("Tempo médio para responder")} valor={formatarDuracao(tempoMedio)} />
        </div>
      </section>

      <section className={CARTAO}>
        <h2 className="text-lg font-semibold">{t("Onde estão seus clientes agora")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("Quantos clientes estão em cada etapa do funil, neste momento.")}
        </p>
        {etapasComGente.length === 0 ? (
          <p className="text-base text-muted-foreground">{t("Nenhum cliente em andamento no funil.")}</p>
        ) : (
          <ul className="space-y-3">
            {etapasComGente.map((s) => (
              <li key={s.stage_id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base">{s.stage_name}</span>
                  <span className="text-base font-semibold tabular-nums">{s.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(s.count / maior) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canCompare && metrics.attendants.length > 0 && (
        <section className={CARTAO}>
          <h2 className="mb-3 text-lg font-semibold">{t("Cada atendente")}</h2>
          <ul className="divide-y divide-border">
            {metrics.attendants.map((a) => (
              <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
                <span className="text-base font-medium">
                  {attendantLabel(a, t)}
                  {a.user_id === currentUserId ? <span className="text-muted-foreground"> {t("(você)")}</span> : null}
                </span>
                <span className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-emerald-600">{a.won}</strong> {t("fechadas")}
                  </span>
                  <span>
                    <strong className="text-red-600">{a.lost}</strong> {t("perdidas")}
                  </span>
                  <span>
                    <strong className="text-foreground">{a.conversations_handled}</strong> {t("conversas")}
                  </span>
                  <span>
                    {t("responde em")} <strong className="text-foreground">{formatarDuracao(a.avg_first_response_seconds)}</strong>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-medium">
          <Plus size={14} aria-hidden className="transition-transform group-open:rotate-45" />
          {t("Relatórios detalhados")}
          <span className="text-sm font-normal text-muted-foreground">
            {t("(atrito, perdas, previsão, por número e evolução)")}
          </span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-border p-5">
          <AtritoPanel podeEditarRegua={canCompare} />
          {canCompare ? <PerdasPanel /> : null}
          <PrevisaoPanel />
          <CanaisPanel owner={selectedOwner} />
          <SeriePanel />
        </div>
      </details>
    </div>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className={CARTAO}>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", cor)}>{valor}</p>
    </div>
  );
}

/** A meta do mês da EMPRESA, em vendas fechadas, editável aqui mesmo. */
function MetaSimples({
  carregando,
  alvo,
  realizado,
  podeEditar,
  onSalvo,
}: {
  carregando: boolean;
  alvo: number | null;
  realizado: number;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [salvando, startTransition] = useTransition();
  const agora = new Date();
  const periodo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const nomeDoMes = agora.toLocaleDateString("pt-BR", { month: "long" });

  function salvar() {
    const numero = Number.parseInt(valor, 10);
    if (!Number.isInteger(numero) || numero <= 0) {
      toast.error(t("Digite quantas vendas você quer fechar, um número maior que zero."));
      return;
    }
    startTransition(async () => {
      const r = await definirMetaMensal({ periodo, alvo: numero });
      if (r.ok) {
        toast.success(t("Meta salva."));
        setEditando(false);
        onSalvo();
      } else {
        toast.error(t("Não consegui salvar a meta agora. Tente de novo."));
      }
    });
  }

  const pct = alvo ? Math.round((realizado / alvo) * 100) : 0;
  const falta = alvo ? Math.max(0, alvo - realizado) : 0;

  return (
    <section className={CARTAO}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("Meta de")} {nomeDoMes}
          </h2>
          <p className="text-sm text-muted-foreground">{t("Quantas vendas a empresa quer fechar este mês.")}</p>
        </div>
        {podeEditar && !editando && (
          <Button
            variant="outline"
            onClick={() => {
              setValor(alvo ? String(alvo) : "");
              setEditando(true);
            }}
          >
            <PencilSimple size={16} aria-hidden />
            {alvo ? t("Mudar meta") : t("Definir meta")}
          </Button>
        )}
      </div>

      {editando ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            aria-label={t("Meta de vendas do mês")}
            className="h-11 w-40 text-base"
            placeholder={t("Ex.: 30")}
          />
          <span className="text-base">{t("vendas")}</span>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? t("Salvando…") : t("Salvar")}
          </Button>
          <Button variant="ghost" onClick={() => setEditando(false)}>
            {t("Cancelar")}
          </Button>
        </div>
      ) : carregando ? (
        <Skeleton className="mt-4 h-10 w-full" />
      ) : alvo ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-base">
              <strong className="text-3xl tabular-nums">{realizado}</strong>{" "}
              <span className="text-muted-foreground">
                {t("de")} {alvo} {t("vendas")}
              </span>
            </p>
            <p className={cn("text-base font-semibold", pct >= 100 ? "text-emerald-600" : "text-foreground")}>
              {pct >= 100 ? t("Meta batida!") : `${t("Faltam")} ${falta}`}
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-[width]", pct >= 100 ? "bg-emerald-500" : "bg-accent")}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {pct}% {t("da meta")}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-base text-muted-foreground">
          {podeEditar
            ? t("Você ainda não definiu a meta deste mês. Clique em \"Definir meta\".")
            : t("A meta deste mês ainda não foi definida.")}
        </p>
      )}
    </section>
  );
}
