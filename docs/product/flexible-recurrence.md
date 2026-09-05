# Recorrências flexíveis com datas lógicas

Status: **motor, contrato, persistência e bridge mensal implementados; serviço flexível pendente na #289**.  
Última revisão: **2026-09-05**.

A série continua sendo metadado; somente `Transaction` concreta é fonte financeira. O MVP amplia frequências comuns sem virar um calendário RFC genérico.

## Motor de domínio

O motor integrado opera sobre `LogicalDate { year, month, day }` e modela `frequency = WEEKLY | MONTHLY | YEARLY` + `interval`.

Combinações aprovadas: semanal `WEEKLY+1`, quinzenal `WEEKLY+2`, mensal `MONTHLY+1`, trimestral `MONTHLY+3`, anual `YEARLY+1`. `isSupportedRecurrenceFrequencyInterval` é a fonte única dessa matriz.

## Semântica de datas

Semanal/quinzenal avança 7 × `interval` dias. Mensal/trimestral preserva a âncora original e faz clamp no último dia válido. Anual preserva 29/02, usando 28/02 em ano não bissexto e retornando a 29/02 no próximo bissexto.

## Contrato de entrada

`app/schemas/transaction-flexible-recurrence.schema.ts` aceita a transação normal + `frequency`, `interval` e término por `count` ou `endDate`. Count continua 2–60; end date precisa ser data lógica real. Ownership continua server-side.

## Persistência

`TransactionSeries` persiste `frequency` e `interval Int @default(1)`. A CHECK PostgreSQL aceita somente a matriz do MVP. Séries anteriores ficaram `MONTHLY + interval=1`.

## Bridge do runtime mensal

Os endpoints legados de recorrência mensal e parcelamento continuam com a semântica atual, mas agora escrevem explicitamente:

```text
frequency = MONTHLY
interval = 1
```

Isso elimina dependência implícita do default antes de conectar o serviço flexível. Nenhuma frequência nova é criada por essas rotas.

Os includes/DTOs de série também carregam `interval`, tanto na resposta de criação quanto na leitura de transações. A mudança não altera datas, quantidade de ocorrências, status futuro, rateio de parcelas ou saldo realizado.

## Compatibilidade

- recorrência mensal continua usando `buildMonthlyOccurrences`;
- parcelamento continua usando `buildInstallmentOccurrences`;
- primeira ocorrência mantém o status solicitado e futuras permanecem `PENDING`;
- série continua apenas metadado;
- nenhuma leitura cria ocorrência;
- `rrule` continua não adicionada.

O novo motor já possui regressões de equivalência mensal. Os testes existentes de recorrência/parcelamento continuam sendo o gate para esta ponte, e o mapper possui regressão específica para `interval`.

## Próximos slices

1. serviço/API flexível usando o motor lógico;
2. materialização de WEEKLY/MONTHLY/YEARLY + interval aprovado;
3. regressões cruzadas com parcelamentos;
4. UI simples com labels públicas de frequência.

Refs #289, #283, PR #321, PR #326, PR #329, `app/lib/transactions/monthly-recurrence.ts` e `app/lib/transactions/monthly-series.ts`.
