# FounderCRM: canal de instância com atendimento manual

Destino da mudança: núcleo e infraestrutura. O adaptador implementa o contrato de transporte existente; o proxy de desenvolvimento limita a exposição pública a um webhook. A operação comum dos outros providers permanece disponível.

Fluxo de saída: Inbox → `app/api/v1/messages/_handler.ts` → `getAdapter` → adaptador de instância → API externa. O handler mantém seu ledger e guards; não há envio direto do frontend para o provider.

Fluxo de entrada: Cloudflare → proxy local porta 3400 → POST exclusivo em `/api/v1/webhooks/instance/[token]` → token do path + token da instância → recibo sanitizado → RPCs de contato/conversa → messages → pós-entrada manual → lead/kanban e Realtime.

A origem da organização é a linha de sessão encontrada pelo token do path; o body não escolhe tenant. A sessão ativa tem índice único por instância, e a saída verifica organização e id remoto antes do envio. Credenciais ficam somente no ambiente do backend. Mídia, grupos e ações não implementadas não são anunciados como suportados.

Retorno de falhas: o cartão apresenta erro quando a consulta remota não pode ser confirmada; a ausência de resposta nunca vira conectado. Recibos com erro permanecem no arquivo existente e podem ser reprocessados pelo administrador no cartão, com lote máximo de 20, sem cron nem ativação de IA. O reprocessamento reaproveita a chave única de mensagem e o nascimento idempotente do lead. O arquivo não contém o token de API. A recuperação de eventos que nem chegaram ao receptor depende de reconciliação no provider; não se presume reentrega automática da UAZAPI.

Instalação: migrations 0800/0801 + apêndices no baseline. Nenhuma tabela paralela de CRM e nenhuma remoção do transporte anterior. A configuração do tunnel usa `UAZAPI_WEBHOOK_BASE_URL`; `NEXT_PUBLIC_APP_URL` continua local.
