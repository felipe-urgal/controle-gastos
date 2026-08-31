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
- categoria continua sendo a fonte de verdade do tipo financeiro: agregações mensais classificam receita/despesa pela categoria relacionada;
- saldo de conta continua reutilizando a derivação financeira existente;
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

Receitas e despesas são agregadas separadamente usando `Category.type` como classificação de domínio. A consulta de despesas por categoria e a derivação de limites reutilizam o mesmo mapa de realizado do período.

O frontend recebe somente os dados necessários para a visão mensal e desenha barras leves com CSS; nenhuma biblioteca de gráficos foi adicionada.

## Comparação entre períodos

Para cada métrica:

```text
difference = current - previous
percentage = difference / abs(previous) * 100
```

Quando `previous = 0`, `percentage = null` e a UI mostra que não existe base percentual comparável. A diferença absoluta continua disponível.

## Limitação multi-moeda já existente

O modelo atual permite contas em `BRL`, `USD` e `EUR`, mas o produto ainda não possui moeda-base nem regra de conversão cambial para agregados transversais. Calendário e limites já compartilham essa lacuna de domínio.

O Dashboard **não inventa taxa de câmbio nem conversão implícita**. Nesta entrega ele mantém o comportamento nominal existente para os agregados mensais, enquanto os saldos por conta continuam exibidos na moeda própria de cada conta.

A definição correta de agregados multi-moeda — incluindo Dashboard, Calendário e limites por categoria — está explicitamente rastreada na #198. Até essa regra existir, não se deve interpretar um agregado que misture moedas como valor convertido para BRL ou qualquer outra moeda-base.

## UX

Rota autenticada: `/dashboard`.

O Dashboard passa a ser a primeira entrada do app autenticado e o primeiro item da navegação.

A tela segue o Dark Command Center e contém:

- seletor de mês/ano;
- três métricas principais com diferença absoluta e percentual contra o mês anterior;
- fluxo textual/visual dos últimos 6 meses;
- saldos atuais por conta;
- despesas por categoria;
- limites do mês;
- estados explícitos e mutuamente exclusivos de loading, erro e conteúdo.

Os gráficos não dependem apenas de cor: valores, rótulos e percentuais ficam disponíveis em texto. Barras são complementares. A preferência `showValues=false` mascara os valores financeiros apresentados.

## Entrada autenticada e restauração de sessão

Com a existência do Dashboard, login e restauração de sessão passam a direcionar para `/dashboard`.

A correção #196 foi movida para a fronteira correta: a raiz `/` valida o token de sessão no servidor **antes de renderizar a landing**. Com token válido e usuário existente, ocorre redirect server-side para `/dashboard`; sem sessão válida ou quando o token referencia um usuário já removido, a landing é renderizada sem entrar em loop de redirect.

Assim, o usuário autenticado não vê os CTAs públicos e o visitante anônimo não precisa aguardar um `useEffect` cliente ou uma tela intermediária. O contrato de cookie/JWT não foi alterado.

## Sem mudança de schema

O Dashboard não exige migration nem modelo novo. Ele é uma camada de leitura sobre `Account`, `Category`, `CategoryMonthlyLimit` e `Transaction`.

## Testes

Cobertura adicionada para:

- `COMPLETED`-only no resumo mensal;
- exclusão de `PENDING` e `CANCELLED`;
- comparação com mês anterior;
- base anterior zero como não aplicável;
- janela de 6 meses atravessando mudança de ano;
- saldo atual por conta coerente com a fonte de verdade existente;
- despesas por categoria e percentuais;
- integração com limites mensais;
- isolamento entre usuários;
- sessão válida redirecionada antes da landing;
- visitante sem sessão;
- token de usuário removido sem loop de redirect;
- falha inesperada da resolução server-side não é mascarada.

## Gates de fechamento

Antes de marcar o PR pronto:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Como existe mudança frontend, Lighthouse também faz parte do gate e inclui `/dashboard` nas rotas autenticadas medidas. O auto code review final deve revisar o mesmo head aprovado pelos gates, conforme `AGENTS.md`.

Refs #154, #196, #198, #153, #163 e #172.
