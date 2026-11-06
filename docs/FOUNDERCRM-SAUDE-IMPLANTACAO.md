# Instituto do Sono — configuração e homologação

Configuração aplicada em 27/10/2026 à conta de desenvolvimento autorizada.
Nome de exibição: Instituto do Sono. Fuso: America/Sao_Paulo; idioma: pt-BR;
moeda: BRL. Dados legais e política de retenção preexistentes preservados.
Não foram cadastrados pacientes ou enviados contatos externos.

Fonte pública consultada: https://institutodosonobh.com.br/.
As informações do site são referência administrativa; cobertura, preços,
preparos, prazos e disponibilidade precisam ser confirmados pela recepção.

## O que foi salvo no sistema

### Funis

- Instituto do Sono · Exames (padrão para novas entradas).
- Instituto do Sono · Consultas.

Etapas em ambos: Novo contato → Atendimento iniciado → Solicitação identificada
→ Informações enviadas → Escolhendo horário → Exame agendado/Consulta agendada
(ganho) → Não agendado (perda). Cada funil tem sete etapas e seu mapeamento dos
sete passos. Agendado não significa realizado, faturado ou pago. O funil Pedidos
e seus registros foram preservados. Contatos existentes não foram transferidos.

Links:
- Exames: http://127.0.0.1:3000/app/pipelines/ba7ec300-4937-42ca-93f9-b02050bf56e8
- Consultas: http://127.0.0.1:3000/app/pipelines/4274c7ba-bd81-4733-ae26-2965c577aaa3

### Follow-ups em rascunho

| Fluxo | Sequência proposta | Estado |
|---|---|---|
| Sono · Retomar consulta | Esperar 24h → mensagem neutra → esperar 48h → último contato → fim | Rascunho, entrada manual |
| Sono · Retomar exame | Esperar 24h → oferecer ajuda → esperar 72h → último contato → fim | Rascunho, entrada manual |
| Sono · Conferir confirmação | Criar tarefa prioritária para o dono do lead conferir compromisso | Rascunho, entrada manual |
| Sono · Apoiar remarcação | Criar tarefa de revisão de falta/cancelamento, prazo de um dia | Rascunho, entrada manual |

Todos usam cancel_on_reply=true e handoff_policy=cancel. As cadências são
propostas de configuração, não políticas publicadas pela clínica. Os textos
externos não citam doenças, nomes de exames ou dados pessoais. Nenhum fluxo foi
publicado, nenhum contato inscrito e nenhum disparo, IA ou n8n ativado. As tarefas
internas também só passam a ser criadas após publicação e inscrição apropriadas.
Não existe lembrete vinculado automaticamente à data da agenda nesta entrega.

Acesso: http://127.0.0.1:3000/app/ai/followups.

### Respostas rápidas

15 respostas compartilhadas, atalhos começando com sono-: recepção, solicitação,
polissonografia, EEG, outros exames, consultas, convênios, valores, localização,
horário da recepção, preparo, resultados, remarcação, encerramento e não contatar.
Elas ficam fora da barra fixa para não poluir o Inbox; podem ser escolhidas no
seletor de respostas rápidas. Inserir um texto não significa enviá-lo.

Acesso: http://127.0.0.1:3000/app/templates.

### Serviços identificados no site

Polissonografia na clínica e domiciliar; EEG convencional e poligrafia neonatal;
EEG quantitativo e mapeamento cerebral; vídeo-EEG; potenciais evocados;
consultas especializadas em neurologia/medicina do sono; avaliação
neuropsicológica. O rodapé também menciona TLMS e titulação de CPAP/BiPAP.
Não foram cadastrados preços zero no catálogo: o cadastro de produtos exige
preço, e o site não fornece uma tabela para esta configuração.

A resposta de localização usa Rua dos Aimorés, 3018, sala 704, Barro Preto,
Belo Horizonte. O expediente de recepção publicado é segunda a sexta, 8h–18h;
a programação dos exames noturnos é tratada separadamente. Não há promessa de
horário livre, cobertura de plano, preparo ou prazo de resultado.

## Testes executados

- 84 testes automatizados passaram nos validadores de publicação, fluxos somente
  internos e reatividade durante espera. Eles complementam, sem substituir, a
  homologação real dos fluxos desta conta.
- Oito conferências de configuração pela API autenticada: estrutura dos dois
  funis, estado e política dos quatro rascunhos, quinze respostas compartilhadas,
  funil padrão e preservação do funil anterior.
- Quatro grafos reais salvos passaram por flowGraphSchema e
  validateFlowForPublish; nenhuma publicação foi executada.
- Dois cards TESTE, sem paciente real, telefone ou valor, foram criados nos novos
  funis. A movimentação entre três etapas foi persistida; o board e a timeline
  foram consultados para conferir o resultado. Ambos voltaram a Novo contato.
- A primeira tentativa técnica de movimentação foi recusada por faltar o timestamp
  de concorrência. O teste foi corrigido para enviar expected_updated_at e passou.
- Nenhum teste acima comprova envio agendado, comparecimento, agenda integrada,
  autorização de paciente ou atendimento clínico.

Cards de demonstração:
- Exames: 7e7f0168-a09a-42c2-9f5c-fd882c85cc82.
- Consultas: 00e80d78-852a-4088-9616-9bad774093c8.

A validação foi pela API, não pela tela: o preview está sem sessão e o controle do
navegador apresentou indisponibilidade. A homologação visual permanece pendente.
Os cards de homologação ficam identificados e podem aparecer nas contagens.

## Próximo teste acompanhado

1. Entrar no CRM, conferir o nome, abrir cada funil e localizar seu card TESTE.
2. Inserir uma resposta rápida no editor e ler antes de enviar.
3. Usar um segundo número controlado pelo usuário para mandar texto, foto e áudio
   de teste. Confirmar uma única conversa e lead, recebimento e reprodução.
4. Responder pelo Inbox ao número de teste e conferir entrega no aparelho.
5. Abrir cada rascunho e revisar os textos e tempos. Conferir visualmente que os
   dois fluxos de tarefas não contêm mensagem externa.
6. Depois de autorização explícita de publicação, preparar uma cópia de teste
   com espera de cinco minutos, inscrever SOMENTE o contato de teste e observar
   execução e cancelamento por resposta. Não acelerar o fluxo que se pretende
   usar em produção nem testar com todos os contatos.
7. Testar STOP, atendimento assumido, desconexão do WhatsApp, reinício do servidor
   e túnel interrompido: não pode haver envio duplicado ou mensagem recuperada
   automaticamente sem decisão prevista no fluxo.
8. Para agenda, definir profissionais, disponibilidade e duração real de cada
   serviço; só então criar compromisso de teste, confirmar, remarcar e registrar
   falta. Não publicar lembretes de agenda sem passar por esse teste.

## Informações ainda necessárias

Tabela de preços; durações e disponibilidade de consultas/exames; responsáveis
pela agenda; política de cancelamento/remarcação; orientações oficiais de preparo;
canal autorizado de entrega de resultados; confirmação cadastral legal e contato
de privacidade; equipe e permissões. Não foram inventados esses dados.

Publicação: somente após revisar estes rascunhos e autorizar a publicação. A
skill do repositório deskcomm-cliente-novo/SKILL.md estabelece: “Publicar é ato
humano.” Ela foi aplicada deixando os fluxos prontos para revisão, sem disparos.
