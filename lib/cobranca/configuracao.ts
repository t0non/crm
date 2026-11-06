/**
 * A CONFIGURAÇÃO DA COBRANÇA NA INSTALAÇÃO (spec cobrança do revendedor §10).
 *
 * Todas as chaves moram em `platform_config` e são escritas SÓ pela tela de
 * Cobrança: a Conexão confere a chave com o provedor, registra o webhook e
 * recusa trocar o provedor de quem tem assinatura viva; a Régua valida o
 * intervalo. Por isso aqui vale só o que veio do BANCO (`fonte === "banco"`):
 * uma STRIPE_SECRET_KEY esquecida no `.env` não pode virar a chave de cobrança
 * sem passar por nada disso. A única exceção é um par de credenciais Asaas
 * declarado explicitamente para o Sandbox, sem conexão gravada. Lido a cada uso, sem memo: trocar pela tela vale
 * no worker na hora (mesmo contrato de `lib/instalacao/config.ts`).
 */
import { PROVEDORES_DE_COBRANCA, type ProvedorDeCobranca } from "@/lib/cobranca/vocabulario";
import { valorDaInstalacao, type ValorDaInstalacao } from "@/lib/instalacao/config";

/** D-5: 7 dias por padrão, ajustável de 5 a 30. O piso mora aqui também (boleto + fim de semana). */
export const TOLERANCIA_PADRAO_DIAS = 7;
export const TOLERANCIA_MINIMA_DIAS = 5;
export const TOLERANCIA_MAXIMA_DIAS = 30;

function doBanco(v: ValorDaInstalacao): string | null {
  return v.fonte === "banco" ? v.valor : null;
}

export async function toleranciaDias(): Promise<number> {
  const bruto = doBanco(await valorDaInstalacao("COBRANCA_TOLERANCIA_DIAS"));
  const dias = bruto === null ? Number.NaN : Number(bruto);
  if (!Number.isInteger(dias)) return TOLERANCIA_PADRAO_DIAS;
  return Math.min(TOLERANCIA_MAXIMA_DIAS, Math.max(TOLERANCIA_MINIMA_DIAS, dias));
}

/** O provedor das assinaturas NOVAS (D-8). As antigas seguem no provedor da linha. */
export async function provedorDaInstalacao(): Promise<ProvedorDeCobranca | null> {
  const bruto = doBanco(await valorDaInstalacao("COBRANCA_PROVEDOR"));
  return PROVEDORES_DE_COBRANCA.find((p) => p === bruto) ?? (conexaoSandboxDoAmbiente() ? "asaas" : null);
}

export function checkoutSandboxHabilitado(): boolean {
  return process.env.ASAAS_CHECKOUT_TESTE === "1" && process.env.ASAAS_API_URL === "https://api-sandbox.asaas.com/v3";
}

function conexaoSandboxDoAmbiente() {
  if (!checkoutSandboxHabilitado()) return null;
  const chave = process.env.ASAAS_API_KEY?.trim();
  const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!chave || !/^\$aact_hmlg_\S{16,}$/.test(chave) || !token || token.length < 32 || token === chave) return null;
  return { chave, token };
}

/**
 * A chave de API do provedor. Um literal por provedor, de propósito: a cerca
 * `painel-nao-promete-o-que-nao-cumpre` procura `valorDaInstalacao("<CHAVE>")`.
 */
export async function chaveDoProvedor(id: ProvedorDeCobranca): Promise<string | null> {
  const chave = doBanco(id === "stripe" ? await valorDaInstalacao("STRIPE_SECRET_KEY") : await valorDaInstalacao("ASAAS_API_KEY"));
  if (chave !== null || id !== "asaas" || doBanco(await valorDaInstalacao("COBRANCA_PROVEDOR")) !== null) return chave;
  if (doBanco(await valorDaInstalacao("ASAAS_WEBHOOK_TOKEN")) !== null) return null;
  return conexaoSandboxDoAmbiente()?.chave ?? null;
}

/** O segredo com que o aviso do provedor é conferido: o `whsec_` da Stripe, o token do Asaas. */
export async function segredoDoWebhook(id: ProvedorDeCobranca): Promise<string | null> {
  const token = doBanco(id === "stripe" ? await valorDaInstalacao("STRIPE_WEBHOOK_SECRET") : await valorDaInstalacao("ASAAS_WEBHOOK_TOKEN"));
  if (token !== null || id !== "asaas" || doBanco(await valorDaInstalacao("COBRANCA_PROVEDOR")) !== null) return token;
  if (doBanco(await valorDaInstalacao("ASAAS_API_KEY")) !== null) return null;
  return conexaoSandboxDoAmbiente()?.token ?? null;
}
