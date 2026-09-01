# Dashboard financeiro mensal

Status: **✅ implementado e integrado à `main` na #154 / PR #197**.  
Merge em `main`: `11ad8bcc02682006cc443a2f013b63715d91facf`.  
Última revisão documental: **2026-09-01**.

## Objetivo

Fornecer uma visão mensal de leitura sobre as fontes financeiras existentes sem persistir saldos, totais ou agregados paralelos.

O Dashboard combina:

- receitas, despesas e saldo realizado do mês selecionado;
- comparação com o mês anterior;
- saldos atuais por conta;
- despesas realizadas por categoria;
- fluxo dos últimos 6 meses;
- progresso dos limites mensais da #153.

## Regras de domínio

- todas as consultas são isoladas pelo usuário autenticado no servidor;
- somente transações `COMPLETED` entram no realizado;
- `PENDING` e `CANCELLED` não entram em receitas, despesas, saldo do período ou realizado de limites;
- `Category.type` é a fonte de verdade para classificar `INCOME`/`EXPENSE`;
- saldo de conta reutiliza a derivação financeira existente;
- limites mensais são planejamento e não alteram saldo nem transações;
- o Dashboard não cria, atualiza nem remove dados;
- nenhum total mensal, percentual, saldo ou série temporal é persistido;
- valores permanecem inteiros em centavos durante os cálculos;
- comparação percentual com base anterior igual a zero retorna `null`/não aplicável.

A fonte de verdade do saldo está em [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md).

## API

Endpoint autenticado:

```text
GET /api/dashboard?year=2028&month=4
```

O período aceita ano entre 2000 e 2100 e mês entre 1 e 12.

A resposta contém:

- `period`: período selecionado;
- `summary`: `income`, `expense` e `balance`;
- `comparison`: diferença absoluta e percentual contra o mês anterior;
- `accounts`: saldo atual derivado por conta;
- `categories`: despesas concluídas por categoria e participação no total;
- `flow`: seis meses consecutivos terminando no período selecionado;
- `limits`: limite, realizado, restante e percentual para categorias com limite no período.

## Agregação e performance

As leituras usam Prisma/PostgreSQL e consultas em lote. A implementação evita carregar todas as transações no cliente e não executa uma consulta individual por conta/categoria.

Receitas e despesas são agregadas usando `Category.type` como classificação de domínio. A leitura de despesas por categoria e o cálculo dos limites reutilizam o realizado do período.

O frontend desenha barras leves com CSS e mantém rótulos/valores equivalentes em texto. Nenhuma biblioteca pesada de gráficos foi adicionada pela entrega.

## Comparação entre períodos

Para cada métrica:

```text
difference = current - previous
percentage = difference / abs(previous) * 100
```

Quando `previous = 0`, `percentage = null` e a UI informa que não existe base percentual comparável. A diferença absoluta continua disponível.

## Multi-moeda

O modelo aceita contas em `BRL`, `USD` e `EUR`, mas ainda não existe moeda-base nem regra de conversão cambial para agregados transversais.

O Dashboard **não inventa taxa de câmbio nem conversão implícita**. Os saldos por conta continuam identificados por sua própria moeda, enquanto a definição correta de agregados que cruzam moedas permanece na #198.

Até a #198 ser resolvida, um agregado nominal que misture moedas não deve ser interpretado como valor convertido para BRL ou outra moeda-base.

## UX

Rota autenticada: `/dashboard`.

O Dashboard é a primeira entrada do app autenticado e o primeiro destino da navegação principal.

A tela segue o Dark Command Center com:

- seletor de mês/ano;
- métricas principais e comparação com o mês anterior;
- fluxo dos últimos 6 meses;
- saldos atuais por conta;
- despesas por categoria;
- limites do mês;
- estados separados de loading, erro e conteúdo;
- valores mascarados quando `showValues=false`.

Os gráficos não dependem apenas de cor; valores, rótulos e percentuais continuam disponíveis em texto.

## Entrada autenticada e restauração de sessão

A #196 foi corrigida no mesmo PR #197.

A raiz `/` valida a sessão no servidor **antes de renderizar a landing**:

- sessão válida e usuário existente → redirect server-side para `/dashboard`;
- visitante sem sessão válida → landing pública;
- token que aponta para usuário removido → landing, sem loop `/ → /dashboard → /`;
- erros inesperados não são mascarados como estado autenticado/anônimo normal.

Assim, o usuário autenticado não vê o flash dos CTAs públicos durante restauração de sessão.

## Schema

O Dashboard não introduziu migration nem modelo novo. Ele é uma camada de leitura sobre `Account`, `Category`, `CategoryMonthlyLimit` e `Transaction`.

## Cobertura e validação da entrega

A #154 registra testes para:

- resumo `COMPLETED`-only;
- exclusão de `PENDING` e `CANCELLED`;
- comparação com mês anterior e base zero;
- janela de 6 meses atravessando ano;
- saldo atual por conta;
- despesas por categoria;
- integração com limites mensais;
- isolamento entre usuários;
- regressão #196 de restauração de sessão.

Evidência histórica do head final `6ee48887f1d97dc7927bccd0adbab2eadf24b17e`:

- CI #168: ✅;
- lint/typecheck/test/build: ✅;
- frontend budget: ✅;
- Lighthouse #130, incluindo `/dashboard`: ✅;
- auto code review final: ✅ sem finding bloqueante conhecido.

Refs #154, #196, #198, #153, #163, #172 e PR #197.
