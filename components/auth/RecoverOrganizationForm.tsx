"use client";

import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { recoverOrganization } from "@/app/actions/auth/recoverOrganization";
import { AvisoSemResposta, useEnvioComTeto } from "@/components/auth/teto-da-espera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanoDoCadastro } from "@/lib/cobranca/cadastro";

/**
 * As frases em português são as CHAVES do dicionário — a mesma convenção do
 * resto da casa (`lib/i18n/dicionario.ts`). Passar por `t()` na hora de exibir é
 * o que separa "acrescentei um idioma" de "mudei a tela de quem já usava".
 */
const MENSAGENS: Record<string, string> = {
  validation_error: "Informe um nome de empresa com 2 a 120 caracteres.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  invite_pending:
    "Esta conta tem um convite pendente ou inválido. Use o link do convite ou peça um novo ao administrador.",
  somente_convite:
    "Esta instalação aceita cadastro apenas por convite. Peça um convite a quem administra o sistema.",
  provision_failed:
    "Não foi possível concluir a organização agora. Tente novamente ou contate o administrador da instalação.",
  // Diz a verdade sobre o que aconteceu. Antes, quem tinha o acesso revogado
  // recebia a frase de `invite_pending` — por acaso, porque o convite ainda
  // estava no `user_metadata` — e ia procurar um link de convite que não
  // resolveria nada.
  access_revoked:
    "Seu acesso a esta organização foi retirado. Fale com quem administra a empresa — criar uma organização nova não devolve o acesso.",
  pedido_recusado:
    "Quem administra esta instalação não aprovou o pedido. Se você recebeu um convite, use o link que chegou no seu e-mail.",
  plano_obrigatorio: "Escolha um plano para criar a empresa.",
};

/**
 * `nomeSugerido` é o nome de empresa que a pessoa digitou no CADASTRO e que
 * viajou até aqui pelo `user_metadata` — o mesmo canal que `/auth/confirm` usa
 * para provisionar. Ele só semeia o campo: quem valida continua sendo o Zod da
 * action, e a pessoa pode trocar antes de enviar. Sem isto, quem cai na
 * recuperação precisa digitar de novo um dado que o sistema já tem, no momento
 * em que ela está mais propensa a desistir.
 */
export function RecoverOrganizationForm({
  nomeSugerido,
  comAprovacao = false,
  planos = [],
  planoInicial,
}: {
  nomeSugerido?: string;
  /** Instalação em `com_aprovacao`: o envio vira pedido, e o botão diz isso. */
  comAprovacao?: boolean;
  /** Planos oferecidos no cadastro (#2846): com eles, a empresa nasce no escolhido. */
  planos?: readonly PlanoDoCadastro[];
  planoInicial?: string;
}) {
  const t = useT();
  const [name, setName] = useState(nomeSugerido ?? "");
  const [plano, setPlano] = useState(planoInicial ?? "");
  const [error, setError] = useState<string | null>(null);
  const { pendente: isPending, semResposta, enviar } = useEnvioComTeto();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // O caminho de sucesso não volta: a action redireciona (onboarding, ou a
    // própria tela mostrando o pedido enviado).
    void enviar(
      () => recoverOrganization(name, plano || undefined),
      (result) => {
        if (!result.ok) setError(t(MENSAGENS[result.error] ?? MENSAGENS.provision_failed!));
      },
    );
  }

  return (
    <form method="post" className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="recovery-org-name">{t("Nome da empresa")}</Label>
        <Input
          id="recovery-org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="organization"
          autoFocus
          disabled={isPending}
          aria-invalid={Boolean(error)}
        />
      </div>
      {planos.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium">{t("Seu plano")}</legend>
          {planos.map((p) => {
            const ativo = plano === p.id;
            const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.preco_cents / 100);
            return (
              <label
                key={p.id}
                className={
                  "block cursor-pointer rounded-xl border-2 p-5 transition-colors " +
                  (ativo ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50")
                }
              >
                <input
                  type="radio"
                  name="plano"
                  value={p.id}
                  checked={ativo}
                  onChange={() => setPlano(p.id)}
                  disabled={isPending}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{p.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.trial_dias > 0
                        ? `${p.trial_dias} ${t("dias grátis para testar")}`
                        : t("Acesso completo a partir de hoje")}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={
                      "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 " +
                      (ativo ? "border-primary bg-primary" : "border-muted-foreground/40")
                    }
                  >
                    {ativo && <span className="size-2 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="mt-3">
                  <span className="text-3xl font-bold tracking-tight">{preco}</span>
                  <span className="text-sm text-muted-foreground"> /{p.intervalo === "ano" ? t("ano") : t("mês")}</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {[
                    "Atendimento do WhatsApp num lugar só, com a equipe toda",
                    "Agente de IA que responde e qualifica seus clientes",
                    "Funil de vendas para não perder nenhuma oportunidade",
                    "Transmissões e follow-ups automáticos",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span aria-hidden className="mt-0.5 font-bold text-emerald-600">✓</span>
                      <span>{t(item)}</span>
                    </li>
                  ))}
                </ul>
              </label>
            );
          })}
        </fieldset>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {semResposta && <AvisoSemResposta />}
      <Button className="h-12 w-full text-base font-semibold" type="submit" disabled={isPending || name.trim().length < 2}>
        {isPending
          ? t("Preparando seu ambiente…")
          : comAprovacao
            ? t("Enviar pedido")
            : planos.length > 0
              ? t("Começar agora")
              : t("Continuar para o onboarding")}
      </Button>
      {planos.length > 0 && !comAprovacao && (
        <p className="text-center text-xs text-muted-foreground">
          {t("Pagamento seguro. Você revisa tudo antes de confirmar.")}
        </p>
      )}
    </form>
  );
}
