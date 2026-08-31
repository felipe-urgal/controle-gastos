# Dashboard financeiro mensal

Status: **em desenvolvimento** na issue #154, branch `feature/monthly-dashboard`, PR #197.

## Objetivo

Fornecer uma visão mensal de leitura sobre as fontes financeiras existentes sem persistir saldos, totais ou agregados paralelos.

O dashboard combina:

- receitas, despesas e saldo realizado do mês selecionado;
- comparação com o mês anterior;
- saldos atuais por conta;
- despesas realizadas por categoria;
- fluxo dos últimos 6 meses;
- progresso dos limites mensais definidos pela #153.

## Regras de domínio

- todas as consultas são isoladas pelo `userId` autenticado no servidor;
- somente transações `COMPLETED` entram no realizado;
- `PENDING` e `CANCELLED` não entram em receitas, despesas, saldo do período ou realizado de limites;
- saldo de conta continua derivado das transações concretas concluídas;
- limites mensais continuam sendo planejamento e não alteram saldo nem transações;
- o dashboard não cria, atualiza nem remove dados;
- nenhum total mensal, percentual, saldo ou série temporal é persistido;
- valores permanecem inteiros em centavos durante todo o cálculo;
- comparação percentual com base anterior igual a zero retorna `null`/não aplicável, evitando divisão inválida.

A fonte de verdade do saldo continua documentada em [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md).

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

As leituras usam agregações Prisma/PostgreSQL e consultas em lote. A implementação evita carregar todas as transações no cliente e não executa uma consulta por conta/categoria.

O frontend recebe somente os dados necessários para a visão mensal e desenha barras leves com CSS; nenhuma biblioteca de gráficos foi adicionada.

## Comparação entre períodos

Para cada métrica:

```text
difference = current - previous
percentage = difference / abs(previous) * 100
```

Quando `previous = 0`, `percentage = null` e a UI mostra que não existe base comparável. A diferença absoluta continua disponível.

## UX

Rota autenticada: `/dashboard`.

O Dashboard passa a ser a primeira entrada do app autenticado e o primeiro item da navegação.

A tela segue o Dark Command Center e contém:

- seletor de mês/ano;
- três métricas principais;
- fluxo textual/visual dos últimos 6 meses;
- saldos atuais por conta;
- despesas por categoria;
- limites do mês;
- estados explícitos de loading, erro e vazio.

Os gráficos não dependem apenas de cor: valores, rótulos e percentuais ficam disponíveis em texto. Barras são complementares. A preferência `showValues=false` mascara os valores financeiros apresentados.

## Entrada autenticada e restauração de sessão

Com a existência do Dashboard, login e restauração de sessão passam a direcionar para `/dashboard`.

A correção #196 também impede que a landing pública apareça brevemente enquanto o `AuthContext` ainda determina se existe uma sessão válida. Durante `loading` e durante o redirect autenticado, uma superfície neutra cobre os CTAs públicos; visitantes sem sessão recebem a landing normalmente quando a verificação termina.

A landing continua server-rendered e o contrato de autenticação não foi alterado.

## Sem mudança de schema

O Dashboard não exige migration nem modelo novo. Ele é uma camada de leitura sobre `Account`, `Category`, `CategoryMonthlyLimit` e `Transaction`.

## Testes

Cobertura adicionada para:

- `COMPLETED`-only no resumo mensal;
- exclusão de `PENDING` e `CANCELLED`;
- comparação com mês anterior;
- base anterior zero como não aplicável;
- janela de 6 meses atravessando mudança de ano;
- saldo atual por conta coerente com a fonte de verdade;
- despesas por categoria e percentuais;
- integração com limites mensais;
- isolamento entre usuários;
- transição visual da landing durante restauração de sessão.

## Gates de fechamento

Antes de marcar o PR pronto:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Como existe mudança frontend, Lighthouse também faz parte do gate. O auto code review final deve revisar o mesmo head aprovado pelos gates, conforme `AGENTS.md`.

Refs #154, #196, #153, #163 e #172.
