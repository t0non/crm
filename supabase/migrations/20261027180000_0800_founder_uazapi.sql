-- manifest: Canal UAZAPI por instância, preservando os providers e dados existentes.
ALTER TABLE public.channel_sessions ADD COLUMN IF NOT EXISTS uazapi_instance_id text;
ALTER TABLE public.channel_sessions DROP CONSTRAINT IF EXISTS channel_sessions_provider_check;
ALTER TABLE public.channel_sessions ADD CONSTRAINT channel_sessions_provider_check
  CHECK (provider IN ('waha','meta_cloud','zernio','wacalls','zernio_social','datafy','uazapi'));
ALTER TABLE public.channel_sessions DROP CONSTRAINT IF EXISTS channel_sessions_provider_ref_check;
ALTER TABLE public.channel_sessions ADD CONSTRAINT channel_sessions_provider_ref_check CHECK (
 (provider='waha' AND waha_session_name IS NOT NULL) OR
 (provider='meta_cloud' AND meta_phone_number_id IS NOT NULL) OR
 (provider IN ('zernio','zernio_social') AND zernio_account_id IS NOT NULL) OR
 (provider='wacalls' AND wacalls_session_id IS NOT NULL) OR
 (provider='datafy' AND datafy_phone_number_id IS NOT NULL) OR
 (provider='uazapi' AND uazapi_instance_id IS NOT NULL));
-- Este provider autentica pelo token server-side e token aleatório do path.
-- Nenhum segredo simulado é gravado para satisfazer a coluna dos providers HMAC.
ALTER TABLE public.channel_sessions ALTER COLUMN webhook_secret_encrypted DROP NOT NULL;
ALTER TABLE public.channel_sessions DROP CONSTRAINT IF EXISTS channel_sessions_webhook_secret_required;
ALTER TABLE public.channel_sessions ADD CONSTRAINT channel_sessions_webhook_secret_required
 CHECK (provider='uazapi' OR webhook_secret_encrypted IS NOT NULL);
-- Uma instância desta instalação pertence a uma única organização ativa.
CREATE UNIQUE INDEX IF NOT EXISTS channel_sessions_uazapi_active_unique
 ON public.channel_sessions(uazapi_instance_id) WHERE provider='uazapi' AND archived_at IS NULL;
NOTIFY pgrst, 'reload schema';
