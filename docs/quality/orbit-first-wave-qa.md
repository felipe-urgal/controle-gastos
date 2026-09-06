# QA — Primeira onda Orbit

Status: **em andamento**.

Issue de coordenação: #342.

Este documento registra a evidência da validação pós-implementação da primeira onda Orbit:

- Dashboard — #293 / PR #337;
- Transações — #294 / PR #338;
- Contas — #295 / PR #339;
- Calendário — #296 / PR #340;
- Categorias/Limites — #298 / PR #341.

A validação segue `AGENTS.md` e `docs/design/orbit-spec.md`. CI verde não é evidência suficiente de fidelidade visual, responsividade ou acessibilidade. Da mesma forma, uma comparação estática de código não substitui a execução em navegador/dispositivo.

## Regra de aceite da primeira onda

Os protótipos explicitamente aprovados são **especificações visuais normativas**.

A QA não deve responder apenas “a intenção foi preservada”. Ela deve verificar se a implementação reproduz o que foi desenhado: hierarquia, ordem, agrupamentos, proporções, densidade, espaçamentos, superfícies, shell, interações e comportamento responsivo.

O critério é **paridade visual e estrutural com o protótipo aprovado**, usando dados e contratos reais do produto.

Não considerar como aceite suficiente:

- “ficou parecido”;
- “aproximou da proposta”;
- “é equivalente”;
- “mantém a intenção”;
- “foi adaptado para reutilizar o componente existente”.

Reutilização não possui precedência sobre o desenho aprovado. Novos componentes, refatorações de primitives/shell e atualização ou adição de bibliotecas são permitidos quando necessários para reproduzir corretamente o protótipo com qualidade de produção.

Uma diferença só pode ser aceita quando houver incompatibilidade concreta com domínio, contrato funcional, segurança, privacidade, acessibilidade, performance ou ausência de uma feature/dado demonstrativo. Toda diferença deve ser documentada na issue e no documento da rota **antes do merge**, com motivo e impacto visual. Desvio silencioso é finding.

Features fictícias do protótipo continuam fora de escopo: paridade visual não autoriza inventar Forecast, Transferência, Reconciliação, origem de importação ou regra financeira.

## Baseline auditado

Auditoria estática realizada em 06/09/2026 sobre `main` na revision:

`e52e4b28f5ca5bc6e77ffd4c1f435e327192f790`

A rodada comparou:

```text
protótipo aprovado
vs
contrato Orbit documentado
vs
implementação integrada em main
```

Não foram marcados como concluídos nesta rodada:

- validação visual real em 320px, 360/390px, 768px e desktop;
- zoom 200%;
- dark/light em navegador;
- `showValues=true/false` em ambiente executável;
- teclado/foco em browser;
- `prefers-reduced-motion`;
- touch real;
- Lighthouse;
- validação em tecnologia assistiva.

Esses itens permanecem abertos até execução sobre a revision candidata final.

## Resultado da auditoria estática

### Dashboard — finding P1

Referências: #293, PR #337, `docs/design/dashboard-orbit.md` e protótipo `ux/293-dashboard-orbit-prototype`.

A direção aprovada usa contexto compacto, navegação interna `Resumo / Gastos / Limites / Contas`, Mapa do mês como hero e drill-down dos pontos.

Na revision auditada, o Dashboard usa composição diferente, com `PageHeader`, painel explicativo separado e grids de painéis. O Mapa do mês existe, mas não reproduz integralmente a interação aprovada.

Correção obrigatória: #354 — `fix/354-dashboard-orbit-fidelity` — reproduzir fielmente o protótipo aprovado.

### Transações — finding P1

Referências: #294, PR #338, `docs/design/transactions-inbox-orbit.md` e protótipo `ux/294-transactions-inbox-prototype`.

A direção aprovada define topo operacional, segmentos, faixa de resumo, Inbox como workspace, detalhe contextual desktop, filtros/detalhe em sheet e FAB mobile.

A implementação integrada alterou ordem e composição e o shell compartilhado divergiu das dimensões/estado ativo desenhados.

Correção obrigatória: #355 — `fix/355-transactions-orbit-fidelity` — reproduzir fielmente a Inbox e o shell aprovados.

### Contas — finding P1

Referências: #295, PR #339, `docs/design/accounts-orbit.md` e protótipo `ux/295-accounts-portfolio-prototype`.

A decisão aprovada define resumo, busca/filtro simples, lista densa, saldo/atividade em primeiro plano, master-detail desktop, detalhe mobile e ação de criação conforme protótipo.

A implementação integrada usa composição administrativa diferente, com `DynamicFilters`, alternância lista/cards e navegação obrigatória para detalhe.

Correção obrigatória: #356 — `fix/356-accounts-orbit-fidelity` — reproduzir fielmente o Portfólio aprovado.

### Calendário — finding P1

Referências: #296, PR #340, `docs/design/calendar-timeline-orbit.md` e protótipo `ux/296-calendar-timeline-prototype`.

O protótipo aprovado define header/controles, faixa de resumo e layout em três áreas: mini-calendário contextual, timeline central e próximos compromissos, com comportamento mobile próprio.

A implementação integrada privilegia a grade mensal e usa composição diferente da referência aprovada.

Correção obrigatória: #357 — `fix/357-calendar-orbit-fidelity` — reproduzir fielmente a Timeline aprovada.

### Categorias/Limites — finding P1

Referências: #298, PR #341, `docs/design/categories-spending-map-orbit.md` e protótipo `ux/298-categories-spending-map-prototype`.

A direção aprovada define resumo, filtros `Todas / Críticas / Receitas / Sem limite`, Spending Map, categorias críticas, detalhe/drill-down e administração secundária.

A implementação integrada mantém uma página administrativa longa e não reproduz integralmente a composição/interação aprovada.

Correção obrigatória: #358 — `fix/358-categories-orbit-fidelity` — reproduzir fielmente o Spending Map aprovado.

## Regras para as correções

As cinco frentes devem preservar todas as invariantes do domínio. Em especial:

- `COMPLETED` continua sendo o único realizado;
- `PENDING` e `CANCELLED` não entram silenciosamente no realizado;
- saldos continuam derivados das transações concretas elegíveis;
- BRL/USD/EUR não são somados nem convertidos implicitamente;
- `showValues=false` precisa cobrir qualquer nova superfície;
- nenhuma navegação ou visualização executa write;
- protótipos não autorizam features sem contrato real;
- fidelidade ao protótipo não pode ser sacrificada apenas para reutilizar abstrações legadas.

## Gates por frente

Cada branch corretiva deve cumprir o fluxo de `AGENTS.md`:

1. usar o protótipo aprovado como fonte visual normativa;
2. reproduzir a composição e interação desenhadas com dados reais;
3. criar/refatorar componentes ou dependências quando necessário para paridade;
4. adicionar/ajustar testes quando houver comportamento ou regressão automatizável;
5. executar `pnpm check` no head final;
6. executar auto code review completo no mesmo head;
7. corrigir findings relevantes;
8. repetir os gates depois de qualquer correção;
9. executar comparação visual lado a lado com o protótipo em cada breakpoint relevante;
10. documentar toda diferença inevitável antes do merge;
11. atualizar a issue e o documento de design da rota;
12. não considerar a frente concluída enquanto houver desvio visual não documentado.

## Matriz visual pendente

Após as correções, executar no mínimo:

| Rota | 320px | 360/390px | 768px | desktop | dark/light | showValues | teclado/foco | paridade com protótipo | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Transações | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Contas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Calendário | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Categorias | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |

Também validar:

- comparação lado a lado protótipo × implementação;
- zoom/reflow 200% quando disponível;
- valores e nomes longos;
- loading/error/empty quando reproduzíveis;
- `prefers-reduced-motion`;
- touch targets críticos próximos de 44px;
- nenhuma informação financeira dependente somente de cor ou geometria;
- nenhuma regressão nas ações de criar/editar/importar/filtrar já suportadas.

## Critério de encerramento

A #342 só deve ser encerrada quando:

- as correções P1 reproduzirem os protótipos aprovados ou toda diferença inevitável estiver explicitamente documentada e aprovada;
- a revision final candidata estiver identificada;
- a matriz visual/acessível tiver evidência real;
- houver comparação lado a lado para cada rota/breakpoint relevante;
- documentação de cada rota refletir a implementação final;
- nenhum P0/P1 conhecido ficar sem correção ou issue explícita;
- health de produção permanecer saudável após a promoção final.
