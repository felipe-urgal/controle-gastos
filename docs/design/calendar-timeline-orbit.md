# Calendário — Linha do Tempo Financeira Orbit (#296)

Status: **implementação em revisão** na branch `ux/296-calendar-timeline-implementation`.

## Modelo implementado

A rota passa a seguir a direção aprovada:

`contexto mensal → dia selecionado → linha do tempo financeira → próximos compromissos`

A grade mensal permanece como navegação e contexto. Ao escolher um dia, a seleção continua visível depois que o modal de detalhe é fechado, permitindo consultar a linha do tempo sem perder o contexto temporal.

## Linha do tempo do dia

Os lançamentos do dia são apresentados em grupos explícitos:

- **Realizado** — `COMPLETED`;
- **Pendente** — `PENDING`;
- **Cancelado** — `CANCELLED`.

A UI não soma pendências com realizado e não muda status ao navegar.

## Próximos compromissos

O painel lateral lista somente transações `PENDING` posteriores à data de referência dentro do mês já carregado. É uma lista de lançamentos concretos existentes, não uma projeção financeira.

Não há cálculo de saldo projetado, previsão de caixa, tendência ou recorrência futura materializada pela interface.

## Contratos preservados

- navegar no calendário continua read-only;
- transações concretas permanecem a fonte de verdade;
- `COMPLETED` é o único estado que compõe os totais realizados existentes;
- multi-moeda permanece isolada e cada valor é mostrado com a moeda da própria conta;
- `showValues=false` mascara valores nos novos painéis;
- ações de edição/exclusão continuam no detalhe já existente, sem criar nova regra de write;
- nenhuma funcionalidade de Forecast (#287), recorrência flexível (#289) ou Transferência (#284) é antecipada.

## Acessibilidade e responsividade

- o desktop usa calendário + timeline lado a lado;
- telas menores recebem o mesmo modelo mental em sequência, sem reduzir a tipografia para “caber”;
- situação financeira é expressa por rótulo além da cor;
- o dia selecionado permanece como contexto após fechar o modal;
- valores longos podem quebrar linha;
- os controles de navegação existentes preservam foco e rótulos acessíveis.

## Validação exigida

A issue #296 só deve ser concluída após `pnpm check` no head final, auto code review e revisão visual manual quando houver navegador disponível. O resultado real dos gates deve ser atualizado na issue.
