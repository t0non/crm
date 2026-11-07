# Composição da área de vendas

Destino: núcleo. A alteração compõe telas já existentes; a operação comum depende delas e não exige ativação de extensão.

## Escopo e referência

`AppShell.module.css` aplica a composição de trabalho às rotas de Inbox e funil. `InboxLayout` ordena lista → ficha → conversa, mantendo as divisórias, o recolhimento e as preferências locais. `CRMSidePanel` mantém as ações reais e oferece atalhos para suas seções. Os cartões continuam usando os leads da organização, sem dados copiados da conta de referência.

A inspeção da Kommo autenticada em 07/11/2026 confirmou PT Sans 15px no menu, menu de 240px, colunas do funil de 312px e barra superior de 64px. `fonte-crm.ts` serve PT Sans regular e bold localmente, com licença em `public/fonts/pt-sans/OFL.txt`. A página pública e seu login continuam com Euclid.

## Evidência e limites

Os testes de divisórias, recolhimento, seleção, carteira, exclusão e troca de funil passaram: 95 casos em nove arquivos na execução desta adaptação. O typecheck com escopo nos componentes alterados passou. Isso não representa typecheck global nem teste E2E completo.

A referência e a Inbox local autenticadas foram inspecionadas pelo navegador interno. Foi aberta uma conversa existente, sem enviar mensagens, e a composição em três colunas foi observada em 1920×920; a visualização estreita conserva a conversa e esconde a ficha lateral. A fonte calculada do shell confirmou o arquivo local PT Sans. Uma rodada adicional dos testes de cartões e larguras passou com 13 casos. Não há prova de igualdade visual nem de instalação fresca: os filtros locais continuam mais altos e a ficha mantém os recursos próprios. `.env.e2e` não está disponível; nenhuma sessão foi contornada para produzir uma prova artificial.

## Verificação pela tela pendente

Entrar no preview local, abrir Inbox, selecionar conversa e confirmar lista/ficha/histórico. Arrastar e ajustar as duas divisórias pelo teclado, recolher a ficha e recarregar para conferir preferências. Abrir um funil existente, filtrar e selecionar um cartão. Conferir menus, erros de envio, notas internas, tema escuro e telas estreitas. Não enviar mensagens ou alterar leads reais apenas para comparar aparência.

## Living System Checklist

1. Entrada: `AppShell`, `InboxLayout` e o cliente de pipelines recebem o estado autenticado e os hooks existentes.
2. Saída: seleção alimenta `CRMSidePanel` e `ChatThread`; etapas renderizam `KanbanCard`.
3. Registro: aparência e largura local não criam mutação de negócio; os handlers existentes conservam auditoria.
4. Tela: Inbox e quadro de etapas apresentam os mesmos dados reais em nova composição.
5. Porta: Sidebar e catálogo existentes; não há nova rota.
6. Anti-morte: nenhum novo processo assíncrono. Composer, tarefas e ações existentes continuam acessíveis.
7. Configuração: divisórias, recolhimento, filtros e etapas mantêm seus controles e estados de erro.
8. Continuidade: `ChatThread`, `Composer` e ficha mantêm histórico, handoff e ações existentes; a mudança não decide quem atende.
9. Retorno: erros de negócio continuam nos componentes originais. Ajustes de largura podem ser revertidos pelo controle de redefinição; não há decisão automática nova.
10. Mapa: `docs/architecture/workspace-vendas.architecture.json` registra os consumidores concretos.
