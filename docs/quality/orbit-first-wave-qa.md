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

## Baseline auditado

Auditoria estática realizada em 06/09/2026 sobre `main` na revision:

`e52e4b28f5ca5bc6e77ffd4c1f435e327192f790`

A rodada comparou:

```text
proposta/protótipo aprovado
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

A direção aprovada usa uma composição de visão geral com contexto compacto, navegação interna `Resumo / Gastos / Limites / Contas`, Mapa do mês como hero e drill-down dos pontos.

Na revision auditada, o Dashboard usa `PageHeader`, painel explicativo separado para o contexto de mês/moeda e três linhas de grids de painéis. O Mapa do mês existe, mas os elementos da órbita são predominantemente posicionados de forma absoluta e não reproduzem o drill-down aprovado.

Risco adicional: a órbita precisa ser validada em 320px para excluir colisão/sobreposição de labels e valores.

Correção: #354 — `fix/354-dashboard-orbit-fidelity`.

### Transações — finding P1

Referências: #294, PR #338, `docs/design/transactions-inbox-orbit.md` e protótipo `ux/294-transactions-inbox-prototype`.

A direção aprovada transforma a rota em um workspace operacional: busca, filtros, importação e nova transação no topo; Inbox como visão principal; Histórico como visão secundária; detalhe contextual no desktop; interação compacta no mobile.

Na revision auditada, a rota ainda segue a sequência `PageHeader → painel explicativo → resumo → DynamicFilters → Inbox/Histórico`, fazendo a lista começar tarde e preservando parte do empilhamento criticado na auditoria original.

O refino do shell aprovado na #294 também não está totalmente refletido: a sidebar compartilhada continua com `--app-sidebar-width: 264px` e ainda utiliza marcador vertical lateral no item ativo, enquanto a referência aprovada pede maior densidade, largura próxima de 232px e preenchimento Orbit como indicação principal do estado ativo.

Correção: #355 — `fix/355-transactions-orbit-fidelity`.

### Contas — finding P1

Referências: #295, PR #339, `docs/design/accounts-orbit.md` e protótipo `ux/295-accounts-portfolio-prototype`.

A decisão aprovada pede lista densa e escaneável, saldo/atividade em primeiro plano, detalhe contextual da conta selecionada no desktop, drill-down apropriado no mobile e busca/filtro simples por tipo **sem bloco genérico de filtros**.

Na revision auditada, a rota usa um painel “Portfólio de contas” contendo `DynamicFilters`, mantém alternância lista/cards e renderiza `IndexPage`/`AccountCard`, sem master-detail/contexto da conta selecionada na mesma superfície.

Correção: #356 — `fix/356-accounts-orbit-fidelity`.

### Calendário — finding P1

Referências: #296, PR #340, `docs/design/calendar-timeline-orbit.md` e protótipo `ux/296-calendar-timeline-prototype`.

A decisão aprovada é explícita: a rota deixa de ser uma grade mensal como superfície principal e passa a seguir `contexto mensal → dia selecionado → timeline financeira → próximos compromissos`, usando o calendário como contexto/navegação.

Na revision auditada, a maior coluna do desktop continua contendo `MonthlySummary + WeekDaysHeader + CalendarGrid`, enquanto timeline e próximos compromissos ficam empilhados em uma coluna lateral menor. A hierarquia final ainda privilegia a grade mensal.

Correção: #357 — `fix/357-calendar-orbit-fidelity`.

### Categorias/Limites — finding P1

Referências: #298, PR #341, `docs/design/categories-spending-map-orbit.md` e protótipo `ux/298-categories-spending-map-prototype`.

A direção aprovada prioriza orçamento/atenção, Spending Map e detalhe/drill-down da categoria, deixando administração completa como camada secundária. O protótipo também prevê acesso a `Todas / Críticas / Receitas / Sem limite` e ação para consultar transações da categoria, sem incluir receitas nos agregados de despesa.

Na revision auditada, o mapa/contexto é seguido por uma lista administrativa extensa com métricas, progresso, edição inline e remoção. O recorte de limites trabalha com `Todas / Críticas / Sem limite`, e o drill-down para transações não está materializado de forma equivalente ao aprovado.

Correção: #358 — `fix/358-categories-orbit-fidelity`.

## Regras para as correções

As cinco frentes devem preservar todas as invariantes do domínio. Em especial:

- `COMPLETED` continua sendo o único realizado;
- `PENDING` e `CANCELLED` não entram silenciosamente no realizado;
- saldos continuam derivados das transações concretas elegíveis;
- BRL/USD/EUR não são somados nem convertidos implicitamente;
- `showValues=false` precisa cobrir qualquer nova superfície;
- nenhuma navegação ou visualização executa write;
- protótipos não autorizam Forecast, Transferência, origem de importação, Reconciliação ou outras features sem contrato real;
- correção de fidelidade não é autorização para reabrir o design já escolhido.

## Gates por frente

Cada branch corretiva deve cumprir o fluxo de `AGENTS.md`:

1. implementar o menor conjunto coerente que restaure a direção aprovada;
2. adicionar/ajustar testes quando houver comportamento ou regressão automatizável;
3. executar `pnpm check` no head final;
4. executar auto code review completo no mesmo head;
5. corrigir findings relevantes;
6. repetir os gates depois de qualquer correção;
7. atualizar a issue e o documento de design da rota;
8. abrir PR somente com o estado real dos gates;
9. não considerar a QA visual concluída antes da matriz manual final.

## Matriz visual pendente

Após integrar as correções, executar no mínimo:

| Rota | 320px | 360/390px | 768px | desktop | dark/light | showValues | teclado/foco | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Transações | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Contas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Calendário | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Categorias | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |

Também validar:

- zoom/reflow 200% quando disponível;
- valores e nomes longos;
- loading/error/empty quando reproduzíveis;
- `prefers-reduced-motion`;
- touch targets críticos próximos de 44px;
- nenhuma informação financeira dependente somente de cor ou geometria;
- nenhuma regressão nas ações de criar/editar/importar/filtrar já suportadas.

## Critério de encerramento

A #342 só deve ser encerrada quando:

- as correções P1 forem integradas ou explicitamente reclassificadas com justificativa;
- a revision final candidata estiver identificada;
- a matriz visual/acessível tiver evidência real;
- documentação de cada rota refletir a implementação final;
- nenhum P0/P1 conhecido ficar sem correção ou issue explícita;
- health de produção permanecer saudável após a promoção final.
