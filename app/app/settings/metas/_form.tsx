"use client";

/**
 * O cadastro da meta mensal (issue #3025, fatia 1).
 *
 * O formulário cadastra o alvo de faturamento da empresa para o mês escolhido.
 *
 * Cada recusa vira uma frase que diz O QUE FAZER, como as vizinhas de
 * Configurações: "forbidden_role" mandaria um atendente tentar de novo para
 * falhar igual, então ela diz quem pode.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { definirMetaMensal } from "@/app/actions/settings/definirMetaMensal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/i18n/useT";
import { formatarMoeda } from "@/lib/propostas/moeda";

const ERRO_EM_PORTUGUES: Record<string, string> = {
  validation_failed: "Confira o mês e o valor da meta.",
  unauthenticated: "Sua sessão expirou. Entre de novo.",
  forbidden_tenant: "Você não está em nenhuma organização ativa.",
  forbidden_role: "Só quem administra a empresa pode definir a meta.",
  erro_ao_gravar: "Não consegui gravar a meta agora. Tente de novo em instantes.",
};

export function FormularioDaMeta({
  mes,
  alvoAtual,
  moeda,
}: {
  mes: string;
  alvoAtual: number | null;
  moeda: string;
}) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [periodo, setPeriodo] = useState(mes);
  const [alvo, setAlvo] = useState(alvoAtual === null ? "" : formatarMoeda(alvoAtual, moeda));

  const [reais = "", centavos = ""] = alvo.replace(/[^\d,]/g, "").split(",");
  const numero = Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
  const podeSalvar = /^\d{4}-\d{2}$/.test(periodo) && numero > 0 && numero <= 2_147_483_647;

  function editarAlvo(texto: string) {
    const [inteiro = "", fracao] = texto.replace(/[^\d,]/g, "").split(",");
    if (!inteiro && fracao === undefined) {
      setAlvo("");
      return;
    }
    const valor = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(inteiro));
    setAlvo(fracao === undefined ? valor : `${valor},${fracao.slice(0, 2)}`);
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!podeSalvar) {
      toast.error(t("Confira o mês e o valor da meta."));
      return;
    }
    startTransition(async () => {
      const resultado = await definirMetaMensal({
        periodo,
        alvo: numero,
        indicador: "valor_vendas_ganhas",
      });
      if (resultado.ok) {
        toast.success(t("Meta salva."));
        router.refresh();
        return;
      }
      toast.error(t(ERRO_EM_PORTUGUES[resultado.error] ?? "Não consegui salvar a meta agora."));
    });
  }

  return (
    <Card className="max-w-xl p-6">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="periodo">{t("Mês")}</Label>
          <Input
            id="periodo"
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t("A meta vale para o mês escolhido, do dia 1º ao último.")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="alvo">{t("Meta de faturamento")}</Label>
          <Input
            id="alvo"
            type="text"
            inputMode="decimal"
            placeholder={formatarMoeda(0, moeda)}
            value={alvo}
            onChange={(e) => editarAlvo(e.target.value)}
            onBlur={() => {
              if (alvo && Number.isSafeInteger(numero)) setAlvo(formatarMoeda(numero, moeda));
            }}
          />
          <p className="text-xs text-muted-foreground">
            {alvoAtual === null
              ? t("Ainda não há meta para este mês.")
              : t("Salvar de novo corrige a meta deste mês — nada é duplicado.")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending || !podeSalvar}>
            {isPending ? t("Salvando…") : t("Salvar meta")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
