# Calendário — Linha do Tempo Financeira Orbit (#296)

Status: **correção de fidelidade implementada na PR #360; gate técnico verde no head final. QA visual pós-integração permanece na #342**.

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

Ainda é obrigatório na #342, após integração:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.