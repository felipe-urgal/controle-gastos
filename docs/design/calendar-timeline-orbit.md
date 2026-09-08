# Calendário — Linha do Tempo Financeira Orbit (#296)

Status: **correção estrutural de fidelidade integrada na PR #360; finding visual pós-integração #382 em correção. QA visual completa permanece na #342**.

## Fonte visual normativa

O protótipo `ux/296-calendar-timeline-prototype` em `prototypes/296-calendar-timeline/index.html` é a especificação visual normativa desta rota.

A composição aprovada é:

`contexto mensal → dia selecionado → timeline financeira → próximos compromissos`

No desktop: mini-calendário contextual, timeline central como superfície principal e agenda lateral. No mobile, a composição deve preservar a prioridade temporal sem comprimir o desktop.

## Correção #357 / PR #360

A correção:

- retira a grade mensal grande da posição dominante;
- usa mini-calendário como contexto;
- coloca a timeline no centro do workspace;
- mantém próximos compromissos em painel lateral;
- preserva seleção de dia, estados financeiros e `showValues`;
- isola a implementação Orbit do modal legado.

### Interação validada contra o protótipo

O review final encontrou um desvio de interação e ele foi corrigido antes do merge:

- clicar em um **dia** apenas seleciona o dia e atualiza a timeline;
- clicar em um **evento/compromisso** abre o detalhe contextual;
- fechar o detalhe não perde o contexto do dia selecionado.

Isso reproduz o comportamento do protótipo sem executar writes durante navegação.

## Ajuste pós-QA #382

Os screenshots atuais de desktop/mobile mostraram que a composição temporal já estava alinhada, mas parte da rota ainda herdava `--primary` verde do baseline anterior em elementos de identidade.

A correção #382 mantém a composição aprovada e simplifica pontos que não entregavam informação ou ação suficiente:

- `Novo compromisso`, seleção do dia e foco passam a usar tokens dedicados `--orbit-*`;
- compromissos `PENDING` usam o roxo Orbit como identidade, sem alterar o status financeiro;
- receita e saldo positivo continuam verdes; despesa continua vermelha;
- a `Visão rápida do mês` é removida porque o gráfico representava apenas quantidade relativa de lançamentos, sem eixo, valor, data ou tooltip;
- o chip estático `Todos` é removido da agenda porque aparentava ser um filtro sem existir outra opção ou ação correspondente.

Esses dois elementos existiam no protótipo, mas a remoção é deliberada após QA da implementação real: o objetivo é preservar a hierarquia temporal aprovada sem manter decoração ou affordance falsa que não ajude a leitura financeira.

## Contratos preservados

- `COMPLETED` é o único estado que compõe totais realizados;
- `PENDING` e `CANCELLED` preservam sua semântica;
- cada valor usa a moeda da própria conta;
- `showValues=false` mascara valores;
- navegação no calendário é read-only;
- próximos compromissos são transações `PENDING` concretas, não projeção criada pela tela;
- ações de edição/exclusão continuam seguindo contratos existentes.

## Validação

O head final da PR #360 passou `pnpm check` no CI e o finding de interação dia/modal foi corrigido antes do gate final.

A #382 precisa passar novamente o gate canônico no head final. A validação visual completa continua obrigatória na #342:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.
