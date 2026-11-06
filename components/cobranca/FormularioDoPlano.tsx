"use client";

import { CircleCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { aplicarCupom } from "@/app/planos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { linkDePagamentoSeguro } from "@/lib/cobranca/link";

type Cotacao = Awaited<ReturnType<typeof aplicarCupom>>;
const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const reais = (centavos: number) => formatador.format(centavos / 100);

export function FormularioDoPlano({ precoOficial, inicial, precoTeste }: { precoOficial: number; inicial: Cotacao; precoTeste?: number }) {
  const [cotacao, setCotacao] = useState(inicial);
  const [codigo, setCodigo] = useState(inicial?.cupom ?? "");
  const [documento, setDocumento] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pedirLogin, setPedirLogin] = useState(false);
  const [teste, setTeste] = useState(false);
  const cupom = cotacao?.cupom;
  const preco = reais(cotacao?.precoCents ?? precoOficial);
  const destino = cupom ? `/planos?cupom=${encodeURIComponent(cupom)}` : "/planos";

  async function validar() {
    setOcupado(true);
    setErro("");
    try {
      const resultado = await aplicarCupom(codigo);
      if (resultado) setCotacao(resultado);
      else setErro("Cupom inválido ou indisponível.");
    } catch {
      setErro("Não foi possível consultar o cupom. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  async function contratar() {
    setOcupado(true);
    setErro("");
    try {
      const { data } = await apiClient.post<{ data: { url: string } }>("/api/v1/cobranca/assinatura/checkout", {
        profissional: teste ? { teste: true } : cupom ? { cupom } : {},
        ...(documento.trim() ? { documento } : {}),
      });
      const url = linkDePagamentoSeguro(data.url);
      if (!url) throw new Error("Checkout sem endereço válido.");
      window.location.assign(url);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setPedirLogin(true);
      else setErro(error instanceof ApiError ? error.message : "Não foi possível abrir o checkout. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div aria-live="polite">
        {cupom && <p className="text-sm text-muted-foreground line-through">{reais(precoOficial)}/mês</p>}
        <p className="text-4xl font-semibold tracking-tight">{preco}<span className="ml-1 text-base font-normal text-muted-foreground">/mês</span></p>
        {cotacao && cupom && (
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-muted-foreground">Desconto mensal de −{reais(cotacao.descontoCents)}</p>
            <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
              <CircleCheck aria-hidden="true" className="size-4" />
              Cupom aplicado! Você economiza R$ 150 todos os meses.
            </p>
          </div>
        )}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void validar(); }} className="space-y-2">
        <Label htmlFor="cupom">Possui um cupom de desconto?</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="cupom" className="min-w-40 flex-1" maxLength={80} value={codigo} disabled={ocupado} onChange={(event) => setCodigo(event.target.value)} />
          <Button variant="outline" disabled={ocupado || !codigo.trim()}>Aplicar cupom</Button>
        </div>
        {cupom && <Button type="button" variant="ghost" disabled={ocupado} onClick={() => { setCotacao(null); setCodigo(""); setErro(""); }}>Remover cupom</Button>}
      </form>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {pedirLogin ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href={`/login?next=${encodeURIComponent(destino)}`}>Entrar para contratar</Link>
          <Link className="underline" href="/signup">Criar conta</Link>
        </div>
      ) : confirmando ? (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void contratar(); }}>
          {teste && precoTeste !== undefined && <p className="text-sm">Você está iniciando um teste de {reais(precoTeste)}/mês no Sandbox.</p>}
          <Label htmlFor="documento">CPF ou CNPJ do pagador, se for a primeira contratação</Label>
          <Input id="documento" value={documento} maxLength={32} disabled={ocupado} onChange={(event) => setDocumento(event.target.value)} />
          <Button className="w-full" disabled={ocupado}>Continuar para o Asaas</Button>
        </form>
      ) : (
        <div className="space-y-2">
          <Button className="w-full" disabled={ocupado} onClick={() => setConfirmando(true)}>{cupom ? `Assinar por ${preco}/mês` : "Começar agora"}</Button>
          {precoTeste !== undefined && (
            <Button className="w-full" variant="outline" disabled={ocupado} onClick={() => { setTeste(true); setConfirmando(true); }}>
              Testar por {reais(precoTeste)}/mês no Sandbox
            </Button>
          )}
        </div>
      )}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <CreditCard aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        O pagamento é concluído no Asaas. A assinatura renova pelo valor contratado.
      </p>
    </section>
  );
}
