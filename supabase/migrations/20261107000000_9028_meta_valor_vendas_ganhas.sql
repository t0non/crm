-- manifest: Permite cadastrar o alvo mensal de valor das vendas ganhas em centavos, separado da meta por quantidade.

alter table public.crm_metas
  drop constraint if exists crm_metas_indicador_conhecido,
  add constraint crm_metas_indicador_conhecido
    check (indicador in ('vendas_ganhas', 'valor_vendas_ganhas'));
