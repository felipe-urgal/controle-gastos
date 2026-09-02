# Dashboard financeiro mensal

Status: **✅ base implementada na #154 / PR #197; multi-moeda implementada na #198 / PR #219**.  
Última revisão documental: **2026-09-02**.

## Objetivo

Fornecer uma visão mensal de leitura sobre as fontes financeiras existentes sem persistir saldos, totais ou agregados paralelos e sem misturar moedas diferentes.

O Dashboard combina, para uma moeda selecionada:

- receitas, despesas e saldo realizado do mês;
- comparação com o mês anterior;
- despesas realizadas por categoria;
- fluxo dos últimos 6 meses;
- progresso dos limites mensais da mesma moeda.

Saldos atuais por conta continuam sendo exibidos individualmente na moeda própria de cada conta.

## Regras de domínio

- todas as consultas são isoladas pelo usuário autenticado no servidor;
- moedas de agregação suportadas: `BRL`, `USD` e `EUR`;
- somente transações `COMPLETED` entram no realizado;
- `PENDING` e `CANCELLED` ficam fora de receitas, despesas, saldo do período e realizado de limites;
- `Category.type` é a fonte de verdade para classificar `INCOME`/`EXPENSE`;
- resumo, comparação, categorias, fluxo e limites filtram contas pela moeda selecionada;
- uma comparação mensal nunca compara moedas diferentes;
- percentual de categoria usa como denominador apenas despesas da mesma moeda;
- saldo de conta reutiliza a derivação financeira existente e cada conta mantém sua própria moeda;
- o Dashboard não cria, atualiza nem remove dados;
- nenhum total mensal, percentual, saldo ou série temporal é persistido;
- valores permanecem inteiros em centavos durante os cálculos;
- comparação percentual com base anterior igual a zero retorna `null`/não aplicável;
- nenhuma taxa de câmbio é usada ou inventada.

Consulte [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md) e [`../adr/0002-multi-currency-aggregates.md`](../adr/0002-multi-currency-aggregates.md).

## API

Endpoint autenticado:

```text
GET /api/dashboard?year=2028&month=4&currency=USD
```

O período aceita ano entre 2000 e 2100 e mês entre 1 e 12. `currency` aceita `BRL`, `USD` ou `EUR`; quando omitida por um cliente legado, o servidor usa `BRL` como fallback compatível.

A resposta contém:

- `period`: período selecionado;
- `currency`: moeda usada em todos os agregados do Dashboard;
- `summary`: `income`, `expense` e `balance` da moeda selecionada;
- `comparison`: diferença absoluta e percentual contra o mês anterior na mesma moeda;
- `accounts`: saldo atual derivado por conta, cada uma com sua própria moeda;
- `categories`: despesas concluídas por categoria e participação no total da mesma moeda;
- `flow`: seis meses consecutivos na moeda selecionada;
- `limits`: limite, realizado, restante e percentual somente para limites daquela moeda.

## Agregação e performance

As leituras usam Prisma/PostgreSQL e consultas em lote. A implementação filtra a moeda no servidor antes de somar os agregados financeiros.

Receitas e despesas são agregadas usando `Category.type` como classificação de domínio. Despesas por categoria e limites reutilizam o realizado do período já restrito à mesma moeda.

A lista de contas é uma exceção intencional: ela mostra saldos independentes de todas as contas porque cada item carrega sua moeda e não existe soma transversal.

O frontend desenha barras leves com CSS e mantém rótulos/valores equivalentes em texto. Nenhuma biblioteca pesada de gráficos foi adicionada.

## Comparação entre períodos

Para cada métrica da moeda selecionada:

```text
difference = current - previous
percentage = difference / abs(previous) * 100
```

Quando `previous = 0`, `percentage = null` e a UI informa que não existe base percentual comparável. A diferença absoluta continua disponível na mesma moeda.

## UX

Rota autenticada: `/dashboard`.

A tela possui:

- seletor explícito de moeda dos agregados;
- seletor de mês/ano;
- badge da moeda nos cards principais;
- métricas e comparação com mês anterior;
- fluxo dos últimos 6 meses da mesma moeda;
- saldos atuais por conta sem soma entre contas;
- despesas por categoria da moeda selecionada;
- limites da moeda selecionada;
- estados separados de loading, erro e conteúdo;
- valores mascarados quando `showValues=false`.

Os gráficos não dependem apenas de cor; valores, rótulos, moeda e percentuais continuam disponíveis em texto.

## Entrada autenticada e restauração de sessão

A #196 foi corrigida no mesmo PR #197.

A raiz `/` valida a sessão no servidor antes de renderizar a landing:

- sessão válida e usuário existente → redirect server-side para `/dashboard`;
- visitante sem sessão válida → landing pública;
- token que aponta para usuário removido → landing, sem loop;
- erros inesperados não são mascarados como estado autenticado/anônimo normal.

## Schema

O Dashboard continua sem persistir agregado próprio. A implementação da #198 no PR #219 adiciona moeda explícita a `CategoryMonthlyLimit`, mas o Dashboard permanece uma camada de leitura sobre `Account`, `Category`, `CategoryMonthlyLimit` e `Transaction`.

## Cobertura

A cobertura do PR #219 valida, entre outros pontos:

- BRL e USD nunca entram no mesmo resumo;
- comparação mensal permanece dentro da moeda selecionada;
- despesas por categoria usam denominador da mesma moeda;
- limites BRL e USD da mesma categoria permanecem independentes;
- fluxo de seis meses respeita moeda;
- saldos de contas continuam corretos para todas as contas;
- isolamento entre usuários;
- `PENDING`/`CANCELLED` continuam excluídos.

Evidência histórica da base #154:

- PR #197;
- head `6ee48887f1d97dc7927bccd0adbab2eadf24b17e`;
- CI #168: ✅;
- frontend budget: ✅;
- Lighthouse #130: ✅.

Refs #154, #198, #153, PR #219 e ADR 0002.