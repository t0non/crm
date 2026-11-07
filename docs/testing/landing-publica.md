# Landing pública — apresentação e continuidade comercial

Destino: núcleo, apresentação da rota pública já existente. A operação autenticada continua disponível sem ativar extensões.

Referência visual solicitada: https://www.kommo.com/br/. Imagens e fontes ficam em `public/landing-reference/`; não há scripts, formulários, analytics ou solicitações de cadastro enviados à referência. As demonstrações são imagens editoriais da referência, identificadas como tal. A marca vem de `marcaDaSaida`, e a oferta vem de `PRECO_PROFISSIONAL_CENTS`. Não são reproduzidas promessas de teste gratuito, avaliações ou certificações da outra empresa.

## Living System Checklist

1. Entrada: visitante em `/`, sessão validada em `app/page.tsx` por `getUser()` e marca resolvida por `marcaDaSaida(null)`.
2. Saída: `CAMINHO_CADASTRO_COMERCIAL`, `CAMINHO_LOGIN_COMERCIAL`, documentos legais e âncoras da própria página. Usuário autenticado continua redirecionado a `/app`.
3. Registro: nenhum registro novo; apresentação pública sem mutações. Cadastros e pagamentos continuam nas jornadas existentes.
4. Superfície: `LandingPage` em `app/landing-page.tsx`, renderizada por `app/page.tsx`.
5. Porta: raiz `/`, existente; menus internos ligam demonstração, recursos, plano e perguntas.
6. Anti-morte: CTA de cadastro e retorno ao login disponíveis no topo, plano e rodapé. Não nasce demanda persistente nesta página.
7. Configuração: marca no resolvedor existente e preço no módulo de oferta comercial existente. Nenhuma variável ou configuração nova.
8. Continuidade: não há turno de IA nem transferência humana nesta apresentação; as imagens são demonstrações visuais, sem execução de operações.
9. Retorno: não há decisão automática nem aprendizado novo; a página é de leitura, com estado local descartável para menus, abas e aviso.
10. Mapa: `landing-publica.architecture.json` conecta sessão, marca, apresentação e destinos comerciais.

## Verificação

Com uma sessão ativa, `/?preview=landing` permite visualizar a mesma landing dos visitantes sem sair da conta. A raiz sem esse parâmetro continua levando a sessão ativa ao CRM.

Abas por clique e setas do teclado, menus desktop e móvel, perguntas, dispensa do aviso e destinos comerciais verificados no navegador local. Sem rolagem horizontal em 390 px. Evidências: `landing-desktop.png` e `landing-mobile.png` na raiz do workspace. Testes de interação em `app/landing-page.test.tsx`.

A prova em ambiente fresco estilo VPS e a suíte E2E com banco local não foram realizadas: este workspace não contém `.env.e2e`. Não houve alteração de banco, API ou configuração de instalação.

Validação final: três testes de interação passaram; lint dos arquivos alterados e verificação de tipos isolada do componente e testes passaram. A checagem de tipos do repositório inteiro não foi concluída: a primeira execução excedeu a memória e a repetição foi interrompida. Não foi executada a suíte unitária completa.

Ao abrir o CTA principal no navegador, `/signup?contratar=1` mostrou a mensagem existente de cadastro Profissional temporariamente indisponível. O destino do link funciona; não foi habilitada a configuração comercial nem criado cadastro/pagamento neste trabalho.

Tipografia: Euclid Circular A original, pesos regular/medium/bold, carregada por next/font/local com pré-carregamento e variável restrita à landing. Fonte computada confirmada em títulos, textos e abas no navegador. Três testes de interação passaram novamente após a alteração. Evidência: landing-euclid.png.

## Login sobre a landing, sem navegação

Os links de iniciar sessão em `LandingPage` abrem um `Dialog` Radix em tela inteira, mantendo a URL `/`. A rota `/login` permanece disponível para links diretos, MFA e retornos externos. Fechar pelo botão ou Escape descarta os campos e retorna à landing.

A apresentação usa `LoginForm` com `apresentacao="landing"`, reaproveitando `loginSchema`, `signInWithPassword`, `useEnvioComTeto`, mensagens de erro e continuidade para MFA. Nenhuma validação ou política de autenticação foi alterada. `EntrarComGoogle` mantém a integração existente. Recuperação continua em `/login/forgot`. Não foram adicionadas integrações novas de passkey ou Facebook; a tela expõe os métodos existentes no CRM.

Checklist complementar: entrada pelos links de login; saída pela ação autenticada e pelos destinos existentes de MFA, recuperação e cadastro; auditoria nas ações existentes; superfície visível no diálogo; próximo passo por erros inline e recuperação; configuração nas integrações existentes; sem turno de IA ou decisão automática nova. Destino: núcleo, alteração de apresentação da porta pública existente.

Validação: 12 testes passaram em `app/landing-page.test.tsx`, `components/auth/LoginForm.test.tsx` e `components/auth/PasswordVisibility.test.tsx`; lint dos arquivos alterados passou. No navegador foram conferidos URL inalterada, abrir/fechar, validação de campos vazios e tela móvel em 390 px. Não foi enviado login com credenciais reais, nem executada a suíte E2E em banco fresco.
