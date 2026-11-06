-- manifest: Recibos duráveis e sanitizados dos webhooks UAZAPI, sem tokens no arquivo.
ALTER TABLE public.webhook_events_log DROP CONSTRAINT IF EXISTS webhook_events_log_provider_check;
ALTER TABLE public.webhook_events_log ADD CONSTRAINT webhook_events_log_provider_check
 CHECK (provider IN ('waha','nuvemshop','generic','meta_cloud','zernio','datafy','stripe','asaas','uazapi'));
NOTIFY pgrst, 'reload schema';
