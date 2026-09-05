# Projeção de fluxo e saldo

Status: **engine e endpoint read-only integrados; UI pendente na #287**.  
Última revisão: **2026-09-05**.

A projeção é leitura derivada. Ela responde como o saldo ficaria caso os `PENDING` concretos já cadastrados fossem concluídos nas datas atuais. Não é promessa, orçamento nem previsão estatística.

## Fontes de verdade

- saldo realizado inicial: derivação canônica de `Transaction` `COMPLETED`, conforme ADR 0001;
- projeção: somente `Transaction` concreta `PENDING`;
- `CANCELLED` nunca entra;
- série/recorrência é metadado e não gera ocorrência durante leitura;
- nenhum valor projetado é persistido.

## Endpoint

```text
GET /api/forecast?currency=BRL|USD|EUR&days=30|60|90
```

Defaults: `currency=BRL`, `days=30`.

A rota:

1. deriva `userId` da sessão;
2. valida query com Zod;
3. chama o adapter de aplicação;
4. serializa via helper padrão da API.

Parâmetro fora do contrato retorna 400; sem sessão retorna 401. A política privada/no-store vem do helper compartilhado de respostas da API.

## Ownership e multi-moeda

O adapter carrega somente contas:

- do usuário autenticado;
- ativas;
- da moeda selecionada.

Depois reutiliza a derivação canônica de saldo e carrega somente `PENDING` dessas contas, com filtro redundante de ownership/estado/moeda na própria query de transações.

BRL/USD/EUR nunca são somados entre si e não existe câmbio.

## Data lógica e clock

O MVP aceita 30, 60 ou 90 datas lógicas. `asOf` conta como primeiro dia, então 30 dias terminam em `asOf + 29`.

O adapter aceita `Date` injetável para testes. Como o produto ainda não possui timezone do usuário como conceito de domínio, a conversão do instante para `LogicalDate` usa **UTC explicitamente**. Isso evita depender do timezone do processo/serverless. Uma futura preferência de timezone deve ser decisão de produto própria, não alteração silenciosa neste cálculo.

`PENDING` anterior a `asOf` é vencida e aparece separadamente. Sua data/status não são alterados.

## Cálculo por conta

Para cada conta:

1. iniciar no saldo realizado;
2. agrupar `PENDING` do horizonte por data lógica;
3. somar income/expense do dia em centavos;
4. aplicar `delta = income - expense`;
5. registrar saldo diário;
6. guardar menor saldo e primeira data em que ocorre.

Movimentações do mesmo dia são agregadas antes do mínimo, pois o ledger não possui horário financeiro e não deve inventar ordem intradiária.

## Contrato de resposta

A resposta contém:

- `currency`;
- `asOf`, `horizonDays`, `horizonEnd`;
- contas com `realizedBalance`, `pendingIncome`, `pendingExpense`, `projectedBalance`, menor saldo/data e timeline;
- `overdue` com `PENDING` anteriores a `asOf`;
- `upcoming` com `PENDING` concretos entre `asOf` e `horizonEnd`, inclusivos.

`overdue` e `upcoming` são ordenados deterministicamente por data lógica e, no mesmo dia, por `id`. Itens `COMPLETED`, `CANCELLED` e pendências posteriores ao horizonte não entram em `upcoming`. O frontend pode aplicar progressive disclosure/limite visual sem recriar a regra financeira de pertencimento ao horizonte.

Contas sem pendências continuam aparecendo com saldo realizado = projetado.

## Read-only

O fluxo executa somente `findMany/groupBy` através das primitives existentes. Não cria ocorrência, não altera status/data e não persiste forecast.

A integração PostgreSQL compara a contagem de `Transaction` antes/depois da leitura, além de cobrir:

- saldo realizado vindo apenas de `COMPLETED`;
- `PENDING` vencida separada;
- horizonte exato;
- outra moeda excluída;
- conta inativa excluída;
- outro usuário excluído.

## Transferências

O endpoint atual não antecipa o runtime da #284. Quando transferências estiverem habilitadas, legs `TRANSFER + PENDING` deverão afetar os saldos das contas, mas não os totais operacionais projetados. O adapter será ajustado contra o discriminador efetivamente integrado.

## UX pendente

A UI ainda precisa distinguir inequivocamente **Realizado** de **Projetado**, respeitar `showValues=false`, seletor 30/60/90, texto equivalente a qualquer visualização, loading/error/empty e Orbit.

Refs #287, #283, #284, PR #319, PR #324, ADR 0001 e ADR 0002.
