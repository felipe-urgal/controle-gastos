# Calendário — Linha do Tempo Financeira Orbit (#296)

Status: **integrado em `main`; fidelidade à Timeline aprovada em correção pela #357 após finding da QA #342**.

> A auditoria estática da #342 detectou que a grade mensal permaneceu visualmente dominante na implementação integrada, apesar do protótipo aprovado definir o calendário como contexto e a timeline como superfície principal. A validação visual final continua pendente até a correção #357 e a matriz manual da #342.

## Fonte visual normativa

O protótipo `ux/296-calendar-timeline-prototype` em `prototypes/296-calendar-timeline/index.html` é a **especificação visual normativa** desta rota.

A implementação final deve reproduzir o que foi desenhado: header e controles, faixa de resumo, layout em três áreas, proporções das colunas, mini-calendário, linha visual da timeline, cards de eventos, agenda lateral/próximos compromissos e comportamento mobile.

Não basta ficar “próximo”, “equivalente” ou preservar apenas a intenção. A grade/calendário legado pode ser refatorada ou substituída, novos componentes podem ser criados e bibliotecas podem ser atualizadas/adicionadas quando necessário para atingir a paridade aprovada com qualidade de produção.

Qualquer diferença inevitável deve ser documentada na #357 antes do merge, com motivo e impacto visual. Forecast, recorrências e Transferências demonstrativas não podem ser inventadas sem contrato real.

## Modelo aprovado

A rota segue a composição do protótipo:

`contexto mensal → dia selecionado → linha do tempo financeira → próximos compromissos`

No desktop, essa composição aparece como:

1. **mini-calendário/contexto**;
2. **timeline central como superfície principal**;
3. **agenda/próximos compromissos na lateral**.

A posição, densidade e proporções dessas áreas devem seguir o desenho aprovado. O calendário não pode voltar a dominar a rota apenas por reutilização do grid existente.

## Linha do tempo do dia

Os lançamentos do dia preservam os estados reais:

- **Realizado** — `COMPLETED`;
- **Pendente** — `PENDING`;
- **Cancelado** — `CANCELLED`.

A apresentação deve reproduzir a linha temporal e os cards do protótipo tanto quanto os dados reais permitirem. A UI não soma pendências com realizado e não muda status ao navegar.

## Próximos compromissos

O painel lateral lista somente transações `PENDING` posteriores à data de referência dentro do mês carregado. É uma lista de lançamentos concretos existentes, não uma projeção financeira.

Não há cálculo de saldo projetado, previsão de caixa, tendência ou recorrência futura materializada pela interface sem contrato próprio.

## Contratos preservados

- navegar no calendário continua read-only;
- transações concretas permanecem a fonte de verdade;
- `COMPLETED` é o único estado que compõe totais realizados;
- multi-moeda permanece isolada e cada valor usa a moeda da própria conta;
- `showValues=false` mascara valores;
- ações de edição/exclusão continuam seguindo contratos existentes;
- nenhuma funcionalidade de Forecast (#287), recorrência flexível (#289) ou Transferência (#284) é antecipada.

## Acessibilidade e responsividade

- desktop deve reproduzir mini-calendário + timeline principal + agenda lateral nas proporções aprovadas;
- mobile deve reproduzir a composição temporal própria do protótipo, não comprimir nem apenas empilhar o desktop;
- situação financeira é expressa por rótulo além da cor;
- o dia selecionado permanece como contexto após fechar detalhe;
- valores longos podem quebrar linha sem reduzir tipografia;
- controles preservam foco, touch targets e rótulos acessíveis.

## Validação exigida

A issue #296 só deve ser considerada plenamente validada após:

- comparação visual lado a lado com o protótipo aprovado;
- confirmação de paridade de header, resumo, três áreas, timeline, agenda e mobile;
- documentação de qualquer diferença inevitável;
- `pnpm check` no head final;
- auto code review completo;
- resolução do finding #357;
- revisão visual manual em 320px/mobile/desktop;
- consolidação da evidência em `docs/quality/orbit-first-wave-qa.md`.
