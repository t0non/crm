"use client";
/**
 * Mexer nas etapas DIRETO NO QUADRO do funil: criar, mudar de lugar e excluir,
 * sem ir a uma tela de configuração. Renomear já acontecia no cabeçalho da
 * coluna (`NomeDaEtapaNoQuadro`).
 *
 * Escreve pelas MESMAS rotas da tela "Etapas do funil"
 * (`/api/v1/pipelines/:id/stages[/:stageId]`, `manager`+), então regra,
 * auditoria e validação são as dela. Depois de qualquer resposta, relê o
 * quadro e o mapeamento do funil — as rotas não têm concorrência otimista.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chaveDoFunil } from "@/hooks/pipelines/useAgentMapping";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { Stage } from "@/lib/kanban/types";
import { CaretLeft, CaretRight, DotsThree, Plus, Trash } from "@/lib/ui/icons";

const rota = (pipelineId: string) => `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/stages`;
const daEtapa = (pipelineId: string, stageId: string) =>
  `${rota(pipelineId)}/${encodeURIComponent(stageId)}`;

function mensagem(e: unknown, padrao: string): string {
  return e instanceof Error && e.message ? e.message : padrao;
}

function useEtapasNoQuadro(pipelineId: string) {
  const qc = useQueryClient();
  const t = useT();
  const reler = () => {
    void qc.invalidateQueries({ queryKey: chaveDoQuadro(pipelineId) });
    void qc.invalidateQueries({ queryKey: chaveDoFunil(pipelineId) });
  };
  const criar = useMutation({
    mutationFn: (name: string) => apiClient.post<unknown>(rota(pipelineId), { name }),
    onError: (e) => toast.error(mensagem(e, t("Não consegui criar a etapa."))),
    onSettled: reler,
  });
  const mover = useMutation({
    mutationFn: ({ stageId, depoisDe }: { stageId: string; depoisDe: string | null }) =>
      apiClient.patch<unknown>(daEtapa(pipelineId, stageId), { depois_de: depoisDe }),
    onError: (e) => toast.error(mensagem(e, t("Não consegui mudar a etapa de lugar."))),
    onSettled: reler,
  });
  const excluir = useMutation({
    mutationFn: (stageId: string) => apiClient.delete<unknown>(daEtapa(pipelineId, stageId)),
    onError: (e) => toast.error(mensagem(e, t("Não consegui excluir a etapa."))),
    onSuccess: () => toast.success(t("Etapa excluída.")),
    onSettled: reler,
  });
  return { criar, mover, excluir };
}

/** O "⋯" do cabeçalho da coluna: mover para os lados e excluir. */
export function MenuDaEtapa({
  pipelineId,
  stage,
  etapas,
  quantosNegocios,
}: {
  pipelineId: string;
  stage: Stage;
  etapas: Stage[];
  quantosNegocios: number;
}) {
  const t = useT();
  const { mover, excluir } = useEtapasNoQuadro(pipelineId);
  const [confirmando, setConfirmando] = useState(false);
  const i = etapas.findIndex((e) => e.id === stage.id);
  const podeEsquerda = i > 0;
  const podeDireita = i >= 0 && i < etapas.length - 1;
  const vazia = quantosNegocios === 0;

  return (
    <DropdownMenu onOpenChange={(aberto) => !aberto && setConfirmando(false)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("Opções da etapa")} ${stage.name}`}
          className="shrink-0 rounded-md p-1 text-text-muted hover:bg-muted hover:text-text"
        >
          <DotsThree size={16} weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={!podeEsquerda || mover.isPending}
          onSelect={() =>
            mover.mutate({ stageId: stage.id, depoisDe: i >= 2 ? etapas[i - 2]!.id : null })
          }
        >
          <CaretLeft size={14} aria-hidden /> {t("Mover para a esquerda")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!podeDireita || mover.isPending}
          onSelect={() => mover.mutate({ stageId: stage.id, depoisDe: etapas[i + 1]!.id })}
        >
          <CaretRight size={14} aria-hidden /> {t("Mover para a direita")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!vazia || excluir.isPending}
          className="text-error-fg"
          onSelect={(e) => {
            if (!confirmando) {
              e.preventDefault();
              setConfirmando(true);
              return;
            }
            excluir.mutate(stage.id);
          }}
        >
          <Trash size={14} aria-hidden />
          {!vazia
            ? t("Esvazie a etapa para excluir")
            : confirmando
              ? t("Clique de novo para excluir")
              : t("Excluir etapa")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A coluna "+ Nova etapa" no fim do quadro. */
export function NovaEtapaNoQuadro({ pipelineId }: { pipelineId: string }) {
  const t = useT();
  const { criar } = useEtapasNoQuadro(pipelineId);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");

  function salvar() {
    const limpo = nome.trim();
    if (!limpo) {
      setEditando(false);
      return;
    }
    criar.mutate(limpo, {
      onSuccess: () => {
        setNome("");
        setEditando(false);
      },
    });
  }

  return (
    <div className="w-72 shrink-0" data-nova-etapa="">
      {editando ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <input
            autoFocus
            value={nome}
            maxLength={80}
            disabled={criar.isPending}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") {
                setNome("");
                setEditando(false);
              }
            }}
            onBlur={salvar}
            placeholder={t("Nome da etapa")}
            aria-label={t("Nome da nova etapa")}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          <p className="mt-2 text-[11px] text-text-muted">
            {t("Enter para criar, Esc para cancelar.")}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-text-muted hover:border-accent hover:text-accent"
        >
          <Plus size={14} aria-hidden /> {t("Nova etapa")}
        </button>
      )}
    </div>
  );
}
