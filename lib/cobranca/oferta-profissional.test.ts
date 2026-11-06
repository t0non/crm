import { afterEach, expect, it, vi } from "vitest";

import { cotarProfissional } from "./oferta-profissional";

afterEach(() => vi.unstubAllEnvs());

it.each(["topmarketingbh", "TOPMARKETINGBH", "  TopMarketingBH  "])("normaliza %s e cobra R$ 147 por mês", (codigo) => {
  vi.stubEnv("TOPMARKETINGBH_ATIVO", "1");
  expect(cotarProfissional(codigo)).toEqual({ cupom: "TOPMARKETINGBH", precoOriginalCents: 29700, descontoCents: 15000, precoCents: 14700 });
});

it("distingue preço oficial de cupom inválido, cumulativo ou desativado", () => {
  expect(cotarProfissional()?.precoCents).toBe(29700);
  expect(cotarProfissional("outro")).toBeNull();
  expect(cotarProfissional("TOPMARKETINGBH TOPMARKETINGBH")).toBeNull();
  vi.stubEnv("TOPMARKETINGBH_ATIVO", "0");
  expect(cotarProfissional("TOPMARKETINGBH")).toBeNull();
  expect(cotarProfissional()?.precoCents).toBe(29700);
});
