# Dashboard Orbit (#293)

Status: **implementação em revisão** na branch `ux/293-dashboard-orbit-implementation`.

Este documento registra a composição implementada para o Dashboard após a fundação Orbit da #302. O contrato funcional e as invariantes financeiras continuam definidos por `AGENTS.md`, pelos serviços de Dashboard e por `docs/product/monthly-dashboard.md`.

## Composição implementada

A rota deixa de priorizar uma grade uniforme de cards e passa a organizar a leitura em camadas:

1. **contexto do período** — mês e moeda dos agregados;
2. **Mapa do mês** — leitura visual do saldo realizado, conta, categorias e limite com dados reais já retornados pelo Dashboard;
3. **Como está o mês** — receitas, despesas e saldo realizado com comparação ao mês anterior;
4. **Atenção agora** — somente limites reais com utilização a partir de 80%;
5. **categorias e limites** — distribuição de despesas e limites ordenados por utilização;
6. **análise complementar** — evolução dos últimos seis meses e saldos atuais por conta.

O mapa possui também uma representação textual/navegável para que a informação não dependa da geometria visual.

## Regras preservadas

- apenas transações `COMPLETED` alimentam os agregados realizados;
- `PENDING` e `CANCELLED` não passam a compor saldo/realizado por causa da nova UI;
- BRL, USD e EUR não são somados nem convertidos;
- os agregados respeitam a moeda selecionada;
- saldos de contas são exibidos individualmente na moeda própria;
- `showValues=false` mascara todos os valores monetários da composição;
- leitura do Dashboard continua sem writes;
- categoria continua sendo a fonte de verdade do tipo financeiro.

## Deliberadamente fora desta entrega

O protótipo histórico da #293 apresentava conceitos que ainda não possuem contrato de produto suficiente. Por isso não foram levados ao código real:

- saldo projetado/forecast;
- ritmo ideal de gasto diário;
- próximos compromissos derivados de projeção;
- insights ou alertas inventados;
- agregação entre moedas.

Esses itens só podem entrar quando suas respectivas features definirem semântica, dados e critérios de aceite próprios.

## Acessibilidade e responsividade

- a visualização orbital é complementar e não contém informação exclusiva;
- os destinos textuais permanecem navegáveis por teclado e possuem foco visível;
- valores longos podem quebrar linha sem reduzir tipografia;
- a composição troca para uma coluna em larguras menores em vez de comprimir o desktop;
- cores financeiras continuam acompanhadas de rótulos/texto.

## Validação

A entrega só deve ser considerada concluída depois de:

- `pnpm check` no head final (via ambiente local ou CI obrigatório);
- auto code review completo no head final;
- revisão visual manual em desktop, 320px e mobile comum quando houver ambiente de navegador disponível;
- atualização da issue #293 com o resultado real dos gates.
