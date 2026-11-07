# Primeiro acesso — conversas e preferências pessoais

Destino: núcleo. Apresentação da entrada e da navegação existentes, sem extensão obrigatória. Referência visual: captura fornecida pela pessoa e avatares públicos da página Kommo. Não há scripts nem autenticação enviados ao serviço de referência.

## Comportamento

O login da landing envia a autenticação existente para `/app/inbox`. A autorização, suspensão, configuração obrigatória da empresa e MFA continuam decididas pelos portões existentes em `app/app/layout.tsx`. Esta alteração não pula esses portões. Quando a pessoa chega à interface autenticada, `BoasVindasGate`, dentro de `AppShell`, abre o modal se `AuthUser.boas_vindas` estiver ausente ou inválido. Contas existentes sem essa preferência também o veem uma vez. Acompanhamento de suporte não recebe o modal e não pode alterar essas preferências.

`salvarBoasVindas` valida todo input com `boasVindasSchema`, usa a identidade de `loadAuthUser` e a API de perfil da própria sessão (`supabase.auth.updateUser`). Não aceita `user_id`, organização nem URL de avatar do cliente. Os avatares vêm de um catálogo local fixo. Não há tabela nova nem migration: são preferências pessoais, no mesmo `user_metadata` que já contém o avatar e o idioma.

A conclusão só é registrada com sucesso da gravação. Falha mantém campos e escolhas, com mensagem e nova tentativa. O telefone é opcional e normalizado para formato internacional; sua preferência não autoriza nem dispara mensagens. O telefone fica no perfil, sem ser copiado para auditoria. Fechar por Escape ou Agora não adia apenas nesta montagem: não falsifica uma conclusão persistida.

A fonte Euclid é compartilhada entre landing, casca e modal por `lib/ui/fonte-euclid.ts`. O menu conserva o catálogo e as permissões existentes, com grupos expansíveis e os novos rótulos Comunicações, Pipelines, Agente de IA e Insights. A identidade e o avatar aparecem também no rodapé da barra. O estado sem conversa selecionada oferece acesso aos contatos e, para manager+, às Conexões existentes.

## Living System Checklist

1. **Entrada:** `signInWithPassword` / `signInWithGoogle` existentes, `loadAuthUser` e marca resolvida da organização/instalação.
2. **Saída:** Inbox, menu do usuário e rodapé via `avatar_url`; Perfil via `PreferenciasBoasVindas`; Conexões e Contatos via `InicioConversas`.
3. **Registro:** `profile.updated` em `api_audit_log`, somente após sucesso, com ator da sessão e organização resolvida. Sem telefone no log.
4. **Tela:** `BoasVindasGate` no `AppShell`; revisão em `/app/settings/profile`; avatar no `UserMenu` e no `Sidebar`.
5. **Porta:** login público já existente e destino `/app/inbox`; Perfil já está no catálogo e no menu pessoal. Nenhuma rota nova.
6. **Anti-morte:** falha preserva os campos e permite tentar novamente; `useEnvioComTeto` impede espera sem mensagem. Adiar não conclui. Quem concluiu não recebe o modal novamente, inclusive em outro navegador.
7. **Configuração:** as mesmas preferências são editáveis no Perfil. Sem variável de ambiente nova e sem configurações invisíveis.
8. **Continuidade:** esta etapa não executa IA, envia mensagens ou transfere atendimentos; a Inbox continua utilizando as conversas reais e seus fluxos existentes.
9. **Retorno:** seleção humana simples, sem decisão automática ou aprendizado novo. Erro de validação ou gravação retorna ao mesmo formulário.
10. **Mapa:** `docs/architecture/primeiro-acesso.architecture.json` liga login, portões, perfil, auditoria e consumidores do avatar.

## Validação e limites

42 testes passaram em sete arquivos: modelo e normalização, gravação na identidade da sessão, recusa em suporte, privacidade da auditoria, conclusão somente após sucesso, primeiro acesso, persistência lida, falha recuperável, links de login e regressões da barra lateral. A verificação de tipos foi executada no conjunto de arquivos envolvidos, incluindo as declarações globais. Os arquivos novos passaram no lint; Sidebar e InboxLayout têm avisos preexistentes de efeitos de estado e imagem.

O modal real foi renderizado em uma bancada visual isolada e conferido no navegador em desktop e em 390×844, sem rolagem horizontal. Evidências: `boas-vindas-preview.png` e `boas-vindas-mobile.png`. O fundo dessa bancada é uma composição neutra para avaliar o modal, não uma sessão autenticada nem prova do layout completo da Inbox. A bancada temporária não é rota do produto e foi removida após a captura.

Não foi executado o login real com uma conta, nem a gravação real no Supabase, nem o E2E de instalação fresca. O preview não tinha sessão autenticada e o workspace não possui `.env.e2e`. Nenhum usuário, senha, conta ou banco foi criado ou alterado para contornar isso. A suíte unitária completa e o build de produção também não foram executados nesta alteração.
