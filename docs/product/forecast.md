# Projeção de fluxo e saldo

Status: **foundation do engine em implementação na #287**.  
Última revisão: **2026-09-05**.

A projeção é uma leitura derivada e não altera o ledger. Ela responde “como o saldo ficaria se os `PENDING` concretos já cadastrados fossem concluídos nas datas atuais?”. Não é promessa, orçamento nem previsão estatística.

## Fontes de verdade

- saldo realizado inicial: derivação canônica de `Transaction` com `status=COMPLETED`, conforme ADR 0001;
- projeção futura: somente `Transaction` concreta com `status=PENDING`;
- `CANCELLED` nunca entra;
- `TransactionSeries` é metadado e não gera ocorrência durante leitura;
- nenhum valor projetado é persistido.

O engine puro recebe saldos já derivados e transações já escopadas pelo usuário/moeda. A futura camada de aplicação é responsável por produzir esse conjunto com queries autenticadas.

## Data lógica e horizonte

O MVP aceita somente 30, 60 ou 90 dias.

`asOf` é uma `LogicalDate` produzida no servidor e será injetável nos testes. O fim do horizonte é calculado com UTC apenas como mecanismo determinístico de calendário; nenhum timezone local participa do resultado.

A janela futura é inclusiva:

```text
asOf <= transaction.date <= asOf + horizonDays
```

`PENDING` anterior a `asOf` é **vencida** e aparece separadamente. O engine não move sua data e não a aplica automaticamente no saldo projetado futuro.

## Cálculo por conta

Para cada conta:

1. iniciar no saldo realizado;
2. agrupar `PENDING` futuros por data lógica;
3. em cada dia, somar `INCOME` e `EXPENSE` em centavos inteiros;
4. aplicar `delta = income - expense`;
5. registrar saldo ao fim do dia;
6. guardar menor saldo projetado e sua primeira data.

Movimentações do mesmo dia são agregadas antes de avaliar o mínimo. Isso evita que a ordem arbitrária de IDs dentro do dia crie um “menor saldo intradiário” que o domínio não possui, pois transações atuais têm apenas data lógica e não horário financeiro.

## Multi-moeda

A camada HTTP deve filtrar uma moeda `BRL|USD|EUR` antes de montar os inputs do engine. Não existe total transversal entre moedas nem câmbio.

O engine trabalha por conta; qualquer agregado de moeda futuro só pode somar contas da mesma moeda explicitamente selecionada.

## Segurança e read-only

O endpoint futuro deve:

- derivar `userId` da sessão;
- carregar somente contas pertencentes ao usuário;
- restringir transações a essas contas e à moeda selecionada;
- fazer somente queries de leitura;
- não criar ocorrência, mudar status/data ou persistir snapshot;
- responder com política privada/no-store já usada pela API autenticada.

O engine também falha fechado se receber uma transação cujo `accountId` não pertença ao conjunto de contas fornecido. Isso é defesa adicional; não substitui ownership na query.

## Integração futura com transferências

A #287 não antecipa o schema da #284.

Quando #284 estiver integrada:

- pernas `TRANSFER + PENDING` entram na projeção de saldo das respectivas contas;
- continuam fora de receitas/despesas operacionais projetadas;
- o adapter de aplicação fará essa distinção com o discriminador final definido pela #284.

Nenhum tipo de transferência é inventado neste foundation.

## Contrato HTTP planejado

Direção:

```text
GET /api/forecast?currency=BRL&days=30|60|90
```

Resposta deverá incluir:

- `asOf`, `horizonDays`, `horizonEnd`, `currency`;
- contas com saldo realizado, entradas/saídas pendentes, saldo final, menor saldo/data e timeline;
- itens vencidos separados;
- lista curta de próximos itens, se útil à UX.

O shape definitivo será versionado junto do route/application adapter para não documentar campos que ainda não existem.

## UX planejada

A área autenticada deve distinguir de modo inequívoco:

- **Realizado** — ledger `COMPLETED`;
- **Projetado** — cenário dos `PENDING` existentes.

A UI deve respeitar `showValues=false`, 30/60/90 dias, texto equivalente a qualquer gráfico, estados loading/error/empty e Orbit. A existência do forecast não altera numericamente o Dashboard realizado.

## Validação do foundation

Os testes do engine cobrem:

- virada de mês/ano e fevereiro bissexto;
- somente `PENDING` dentro do horizonte;
- `COMPLETED`/`CANCELLED` ignorados;
- vencidos separados e não aplicados silenciosamente;
- múltiplas movimentações no mesmo dia;
- menor saldo diferente do saldo inicial/final;
- contas independentes;
- fail-closed para conta fora do escopo.

Próximos slices: adapter Prisma autenticado, schema de query, endpoint, testes de ausência de writes/multiusuário/multi-moeda e UI.

Refs #287, #283, #284, ADR 0001, ADR 0002 e `docs/product/monthly-dashboard.md`.
