-- manifest: Permite o preço de R$ 5 exclusivamente para contratos Asaas em modo de teste.
alter table public.cobranca_assinaturas drop constraint if exists cobranca_contrato_profissional_valido;
alter table public.cobranca_assinaturas add constraint cobranca_contrato_profissional_valido check (
  case
    when cupom_contratado is null then preco_contratado_cents is null or preco_contratado_cents = 29700
      or (preco_contratado_cents = 500 and modo is not distinct from 'teste' and provedor is not distinct from 'asaas')
    else cupom_contratado = 'TOPMARKETINGBH' and preco_contratado_cents is not null and preco_contratado_cents = 14700
  end
);

notify pgrst, 'reload schema';
