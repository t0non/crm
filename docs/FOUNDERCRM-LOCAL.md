# FounderCRM local no Windows

Execute os comandos na raiz `DeskcommCRM-main`, pelo PowerShell. Este fluxo não usa o instalador de VPS e não inicia WAHA, IA, workers ou cron. O código e a licença originais são preservados.

## Preparação

Node >=22 (CI usa 22), pnpm **9.15.9**. O pnpm 11 ignora os overrides e patches deste projeto; não use essa versão para instalar.

```powershell
npx.cmd --yes pnpm@9.15.9 install --frozen-lockfile
node scripts/founder-local.mjs prepare
node scripts/founder-local.mjs check
```

`prepare` cria `.env.local` somente se não existir. Não imprime segredos nem sobrescreve configuração. O arquivo já é ignorado por `.gitignore`. `check` é offline e retorna código 1 enquanto faltar configuração; não comprova conexão ou schema.

Preencha `.env.local` exclusivamente com um projeto Supabase NOVO de desenvolvimento:

| Variável                      | Informação                                                               |
| ----------------------------- | ------------------------------------------------------------------------ |
| NEXT_PUBLIC_SUPABASE_URL      | Project URL, como https://SEU_REF.supabase.co                            |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chave anon do mesmo projeto, pública e sujeita a RLS                     |
| SUPABASE_SERVICE_ROLE_KEY     | Chave service_role do mesmo projeto; somente servidor                    |
| SUPABASE_DB_URL               | URI Postgres do projeto novo; preferir Session pooler se não houver IPv6 |
| OWNER_EMAIL                   | E-mail do proprietário a criar                                           |
| OWNER_PASSWORD                | Senha forte para o proprietário                                          |
| OWNER_ORG_NAME                | Nome da organização, inicialmente FounderCRM                             |

Coloque senhas e URIs entre aspas duplas quando contiverem `#`; codifique caracteres especiais da senha dentro da URI. Não coloque service_role, senha de banco ou tokens em NEXT_PUBLIC_*. Não publique este arquivo.

## Banco — procedimento manual, ainda não executado

### Instalador restrito ao projeto de desenvolvimento autorizado

O projeto `uofchiacoqlfbtnkzbqd` foi confirmado pelo proprietário como novo e exclusivo para desenvolvimento. Para esse destino, há uma alternativa ao `psql` usando a dependência `pg` já instalada:

```powershell
node scripts/founder-db.mjs check
node scripts/founder-db.mjs install
```

Preencha primeiro `SUPABASE_DB_URL` no `.env.local` com a URI Session pooler, incluindo a senha real do banco. `[YOUR-PASSWORD]` é um placeholder e será recusado. Use a senha do banco, não a senha OWNER_PASSWORD do administrador do CRM. Codifique os caracteres especiais da senha na URI.

O script aceita somente a URL pública e o usuário do projeto autorizado, no host `aws-0-us-east-2.pooler.supabase.com`, porta 5432 e banco `postgres`. Não aceita parâmetros na URI. Exige TLS com validação de certificado e recusa instalação se encontrar relações da aplicação no schema public. O modo check não aplica o baseline. O modo install cria as três extensões, aplica o baseline inteiro numa transação e verifica as tabelas centrais; não cria o administrador. Não desative a validação TLS se ocorrer erro de certificado.

Preparação verificada com `node --test scripts/founder-db.test.mjs` e ESLint dos arquivos novos. Nenhuma conexão PostgreSQL foi feita durante essa preparação, pois SUPABASE_DB_URL ainda estava vazia.

### Alternativa original via psql

Instale o cliente PostgreSQL (`psql`) se não estiver disponível. Antes de executar, confirme no painel que o projeto é novo, vazio e separado da produção. Não use `supabase db reset` nem `db push`: a cadeia inicial contém stubs; o instalador usa o baseline completo.

Carregue a URI em uma variável de ambiente nesta sessão, sem colar seu valor no histórico do terminal:

```powershell
node --env-file=.env.local -e 'if (!process.env.SUPABASE_DB_URL) process.exit(1); const {spawnSync}=require("node:child_process"); const r=spawnSync("psql",["-v","ON_ERROR_STOP=1","-c","create extension if not exists vector with schema public; create extension if not exists citext with schema public; create extension if not exists pg_trgm with schema public;"],{stdio:"inherit",env:{...process.env,PGDATABASE:process.env.SUPABASE_DB_URL}}); process.exit(r.status ?? 1);'
```

Somente após sucesso das extensões, aplique o arquivo inteiro (dump + apêndices, em ordem):

```powershell
node --env-file=.env.local -e 'if (!process.env.SUPABASE_DB_URL) process.exit(1); const {spawnSync}=require("node:child_process"); const r=spawnSync("psql",["-v","ON_ERROR_STOP=1","-f","supabase/baseline.sql"],{stdio:"inherit",env:{...process.env,PGDATABASE:process.env.SUPABASE_DB_URL}}); process.exit(r.status ?? 1);'
```

O baseline altera o schema; esses comandos são somente para o projeto novo confirmado. Se falhar, interrompa e guarde o erro sem divulgar credenciais. Não continue para o bootstrap com instalação parcial.

Em Supabase Auth / URL Configuration, configure Site URL `http://localhost:3000` e Redirect URLs `http://localhost:3000/auth/callback` e `http://localhost:3000/**`. Verifique Storage privado `whatsapp-media`, tabelas, policies e publicação Realtime após aplicar o baseline. Não torne buckets ou tabelas públicos para contornar erros.

## Primeiro usuário e execução

O aplicativo não oferece cadastro público. Após instalar o baseline e preencher OWNER_*:

```powershell
npx.cmd --yes pnpm@9.15.9 exec tsx --env-file=.env.local scripts/bootstrap-owner.ts
node scripts/founder-local.mjs check
npx.cmd --yes pnpm@9.15.9 dev
```

O bootstrap existente escreve no Supabase: cria usuário confirmado, organização, associação admin e platform admin. Se o usuário já existir, redefine sua senha; execute apenas no ambiente novo confirmado. Remova OWNER_PASSWORD do arquivo após criar a conta. Acesse http://localhost:3000/login. Reinicie o dev server após alterar o ambiente.

Sem suas chaves e o baseline aplicado, login e banco não podem ser homologados. Não use placeholders para declarar login funcionando.

## Verificação

```powershell
npx.cmd --yes pnpm@9.15.9 typecheck
npx.cmd --yes pnpm@9.15.9 lint
npx.cmd --yes pnpm@9.15.9 lint:channels
npx.cmd --yes pnpm@9.15.9 test:unit
```

Testes de banco exigem Docker e Bash; E2E exige Supabase de teste e usuário semeado. Não aponte testes para produção. Não inicie `worker`/`dev:crons` nesta fase.

### Resultado da preparação em 27/10/2026

- Dependências instaladas com pnpm 9.15.9 e `--frozen-lockfile`.
- Node disponível: 24.18.0; atende ao mínimo 22 do projeto.
- Next.js 16.4.2 iniciou em 127.0.0.1:3000 e informou Ready; servidor temporário encerrado após a verificação. Isso não comprova renderização ou login.
- Preparador local: 1 teste passou, incluindo preservação do arquivo existente, campos de conexão vazios e segredos distintos.
- ESLint dos dois scripts novos: passou sem warnings. Prettier dos arquivos novos e package.json: passou.
- Arquitetura de canais: passou, sem dívida nova.
- `channel-adapter-waha.test.ts`, `branding.test.ts` e `app/auth/callback/route.test.ts`: 3 arquivos e 88 testes passaram usando placeholders de teste no processo, sem credenciais reais. A primeira execução falhou na importação porque os campos Supabase locais estão vazios; a repetição usou o host reservado `test-placeholder.invalid`, sem preencher o ambiente real.
- Typecheck global: não concluído por esgotamento de memória, inclusive com limite de heap ampliado para 8 GB. Não há aprovação global de tipos.
- ESLint global: terminou com código 1 sem diagnóstico emitido; não foi considerado aprovado.
- Banco, build de produção e E2E: não validados. Nenhum baseline ou bootstrap executado; `psql` e Docker não encontrados no PATH.

O `founder:check` retorna código 1 neste momento, corretamente: faltam as três variáveis Supabase obrigatórias. Não há banco ou login real conectado.

## Próxima integração

UAZAPI entrará em `lib/channels/adapters/uazapi.ts` e `lib/channels/uazapi/`, com registro, capabilities, referências, credenciais cifradas e ingestão no seam existente. Ainda não há adaptador, endpoint, token ou schema UAZAPI ativo. Não reutilizar campos WAHA para simular outro provider. Sua implementação será uma etapa posterior validada; `lib/waha/` permanece intacto.
