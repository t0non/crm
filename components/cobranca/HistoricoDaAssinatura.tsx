import { Card } from "@/components/ui/card";
import type { CobrancaDaAssinatura } from "@/lib/cobranca/provedores/contrato";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const status: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  OVERDUE: "Em atraso",
  REFUNDED: "Estornado",
};

function dia(valor: string | null) {
  const timestamp = valor ? Date.parse(valor) : Number.NaN;
  return Number.isNaN(timestamp) ? "—" : data.format(timestamp);
}

export function HistoricoDaAssinatura({ pagamentos }: { pagamentos: CobrancaDaAssinatura[] | null }) {
  return (
    <Card className="max-w-3xl space-y-3 p-6">
      <h2 className="font-semibold">Histórico de pagamentos</h2>
      <p className="text-sm text-muted-foreground">Forma de pagamento recorrente: cartão de crédito.</p>
      {pagamentos === null ? (
        <p className="text-sm text-muted-foreground">O histórico está temporariamente indisponível.</p>
      ) : pagamentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr><th>Vencimento</th><th>Pagamento</th><th>Valor</th><th>Situação</th><th>Documentos</th></tr></thead>
            <tbody>
              {pagamentos.map((pagamento) => (
                <tr key={pagamento.id} className="border-t">
                  <td className="py-2 pr-3">{dia(pagamento.venceEm)}</td>
                  <td className="pr-3">{dia(pagamento.pagaEm)}</td>
                  <td className="pr-3">{pagamento.valorCents == null ? "—" : moeda.format(pagamento.valorCents / 100)}</td>
                  <td className="pr-3">{status[pagamento.status] ?? pagamento.status}</td>
                  <td>
                    {pagamento.faturaUrl && <a className="mr-3 underline" href={pagamento.faturaUrl} target="_blank" rel="noreferrer">Fatura</a>}
                    {pagamento.comprovanteUrl && <a className="underline" href={pagamento.comprovanteUrl} target="_blank" rel="noreferrer">Comprovante</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
