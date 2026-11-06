# Integração UAZAPI

Transporte registrado no seam `ChannelAdapter`, com texto individual, status real,
QR Code, webhook autenticado e recibos duráveis sem tokens. O código WAHA permanece.

Arquivos:

- `client.ts`: chamadas server-side conforme a documentação oficial da versão da instância.
- Credenciais: `UAZAPI_SERVER_URL` e `UAZAPI_INSTANCE_TOKEN` no ambiente do servidor.
  A instância remota é vinculada a uma única organização ativa em `channel_sessions`.
  Nenhum token é gravado no banco, devolvido ao navegador ou incluído em logs.
- `webhook.ts`: autenticação, validação Zod e remoção do token antes de logs/arquivo.
- `ingest.ts`: normalização e persistência usando as regras compartilhadas de entrada e leads.
- `../adapters/uazapi.ts`: implementação de `ChannelAdapter` de `../types.ts`.

As migrations 0800 e 0801 também estão no baseline. `WHATSAPP_PROVIDER=uazapi`
seleciona o transporte do onboarding, dispensando o WAHA. Não há fallback de envio
para outro provider. A matriz não anuncia grupos, modelos, agenda ou edição.
O adaptador envia e recebe fotos e áudios individuais, além de texto. O Inbox
existente faz upload e gravação; fotos usam `/send/media` com `type:image`,
e notas de voz usam `type:ptt`. Vídeos e documentos continuam sem suporte aqui.

No recebimento, `/message/download` recupera a mídia por ID, sem transcrição
(`transcribe:false`) nem base64. O backend baixa o `fileURL` com guarda de destino,
sem redirects ou tokens de instância, limita o stream a 50 MiB e salva no bucket
privado `whatsapp-media` em `{org}/{conversa}/{mensagem}.{ext}`. O Inbox usa sua
rota autenticada de mídia e URLs assinadas existentes. O link temporário do
provedor não é salvo. Reentregas retomam downloads incompletos sem nova mensagem;
falhas ficam em `webhook_events_log` e podem ser reprocessadas em Conexões.
Não há mudança de schema, ativação de IA ou reenvio automático.

Contratos: https://docs.uazapi.com/reference/sendMedia.md e
https://docs.uazapi.com/reference/downloadMessage.md (consultados em 27/10/2026).
Destino: núcleo, no adaptador de canal existente; demais canais preservados.

IDs locais `owner:messageid` e IDs WhatsApp são normalizados para `uazapi:messageid`.
Ecos marcados `wasSentByApi` não criam outra mensagem. Mensagens do celular são
registradas como `external_device`. O índice existente por organização/external_id
barra reentregas. Os efeitos compartilhados preservam opt-out e lead em modo manual,
sem chamar o despacho de IA, campanhas, follow-up ou dreno de eventos.

`/api/v1/channel-sessions/instance`: administração autenticada por organização;
GET consulta status, POST aceita `bind`, `connect`, `webhook` e `replay`.
`/api/v1/webhooks/instance/[token]`: somente POST com token aleatório do path e
token de instância validado por comparação constante. O corpo é limitado a 1 MiB.
O payload bruto nunca é arquivado. Campos de uma whitelist são persistidos em
`webhook_events_log` antes do processamento, com reprocessamento manual limitado.
Status de entrega/leitura só avançam, por organização e sessão.

Registro remoto do webhook usa `action:add/update`, preservando outros destinos.
`UAZAPI_WEBHOOK_BASE_URL` permite usar túnel sem trocar a URL local do aplicativo.
O proxy `scripts/founder-webhook-proxy.mjs` só encaminha o POST do caminho exato;
login, APIs administrativas, GET e caminhos derivados retornam 404.

Quick Tunnel temporário: `.runtime/bin/cloudflared.exe tunnel --url http://127.0.0.1:3400 --no-autoupdate --protocol http2`.
O proxy lê `.runtime/instance-webhook.json` (ignorado pelo Git). A URL muda ao reiniciar
o túnel. Fechar o proxy ou o cloudflared interrompe o recebimento. Não registrar destino
antes de testar bloqueio de rotas e rejeição de token inválido.

Referências oficiais consultadas: https://docs.uazapi.com/openapi-bundled.json,
https://docs.uazapi.com/webhook/messages e https://docs.uazapi.com/webhook/messages_update.
Contrato consultado em 27/10/2026: 2.6.9. Homologação real exige parear o WhatsApp,
registrar um destino público verificado e testar texto nos dois sentidos. Fixtures
unitárias não substituem essa homologação.
