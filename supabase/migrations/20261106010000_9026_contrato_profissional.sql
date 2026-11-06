-- manifest: Guarda o preço mensal contratado e o cupom da oferta Profissional.
alter table public.cobranca_assinaturas
  add column if not exists preco_contratado_cents integer,
  add column if not exists cupom_contratado text;

alter table public.cobranca_assinaturas drop constraint if exists cobranca_contrato_profissional_valido;
alter table public.cobranca_assinaturas add constraint cobranca_contrato_profissional_valido check (
  case
    when cupom_contratado is null then preco_contratado_cents is null or preco_contratado_cents = 29700
    else cupom_contratado = 'TOPMARKETINGBH' and preco_contratado_cents is not null and preco_contratado_cents = 14700
  end
);

notify pgrst, 'reload schema';
