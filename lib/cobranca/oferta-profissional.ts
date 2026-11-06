export const PRECO_PROFISSIONAL_CENTS = 29_700;
export const PRECO_TESTE_ASAAS_CENTS = 500;
export const CUPOM_PROFISSIONAL = "TOPMARKETINGBH";
export const CHAVE_CUPOM_PROFISSIONAL = "TOPMARKETINGBH_ATIVO";
const DESCONTO_CENTS = 15_000;

export function cotarProfissional(codigo?: string, ativo = process.env.TOPMARKETINGBH_ATIVO !== "0") {
  const normalizado = codigo?.trim().toUpperCase();
  if (normalizado && (normalizado !== CUPOM_PROFISSIONAL || !ativo)) {
    return null;
  }
  const descontoCents = normalizado ? DESCONTO_CENTS : 0;
  return {
    cupom: normalizado || null,
    precoOriginalCents: PRECO_PROFISSIONAL_CENTS,
    descontoCents,
    precoCents: PRECO_PROFISSIONAL_CENTS - descontoCents,
  };
}
