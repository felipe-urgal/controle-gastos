# Recorrências flexíveis com datas lógicas

Status: **motor, contrato, persistência, bridge mensal e runtime flexível implementados; UI permanece pendente na #289**.  
Última revisão: **2026-09-05**.

A série continua sendo metadado; somente `Transaction` concreta é fonte financeira. O MVP amplia frequências comuns sem virar um calendário RFC genérico.

## Motor de domínio

O motor opera sobre `LogicalDate { year, month, day }` e modela:

```text
frequency = WEEKLY | MONTHLY | YEARLY
interval
```

Combinações aprovadas:

- semanal = `WEEKLY + 1`;
- quinzenal = `WEEKLY + 2`;
- mensal = `MONTHLY + 1`;
- trimestral = `MONTHLY + 3`;
- anual = `YEARLY + 1`.

`isSupportedRecurrenceFrequencyInterval` é a fonte única dessa matriz. O engine e a validação Zod consomem a mesma regra, evitando drift entre API e domínio.

## Semântica de datas

### Semanal / quinzenal

Avança 7 × `interval` dias com UTC apenas como algoritmo de calendário; o resultado volta imediatamente para `LogicalDate`.

### Mensal / trimestral

Cada ocorrência é derivada da âncora original. Meses sem o dia da âncora usam o último dia válido, sem drift cumulativo.

### Anual

29/02 vira 28/02 em ano não bissexto e retorna a 29/02 no próximo bissexto, preservando a âncora original.

## Contrato de entrada

`app/schemas/transaction-flexible-recurrence.schema.ts` define a fronteira de criação.

Shape:

```text
transaction: contrato normal de Transaction
recurrence:
  frequency
  interval
  mode = count | endDate
  occurrences | endDate
```

Regras:

- `frequency` somente `WEEKLY|MONTHLY|YEARLY`;
- `interval` precisa formar uma combinação aprovada pelo motor;
- `count` exige 2–60 ocorrências;
- `endDate` exige uma data lógica ISO válida;
- categoria/conta/valor/status continuam usando o contrato atual de transação.

O schema valida formato e semântica estática. Ownership e estado ativo de conta/categoria são revalidados no serviço server-side com `userId` derivado da sessão.

## Runtime flexível

O endpoint dedicado é:

```text
POST /api/transactions/recurring/flexible
```

`app/lib/transactions/flexible-series.ts` executa o fluxo inteiro dentro de `prisma.$transaction`:

```text
auth
  -> schema flexível
  -> ownership/active de conta e categoria
  -> buildLogicalRecurrenceOccurrences
  -> TransactionSeries(frequency, interval, âncora, início/fim, count)
  -> Transaction[] com seriesIndex determinístico
  -> primeira ocorrência em DTO
```

A primeira ocorrência mantém o status solicitado e todas as seguintes são `PENDING`. O tipo financeiro das ocorrências é derivado da categoria persistida, não do `type` enviado pelo cliente.

Se qualquer etapa abortar, série e ocorrências são revertidas juntas. Leitura nenhuma cria ocorrência faltante.

## Compatibilidade mensal

O endpoint legado:

```text
POST /api/transactions/recurring
```

continua usando `monthly-series.ts` e o contrato mensal já existente. Ele persiste explicitamente:

```text
frequency = MONTHLY
interval = 1
```

Não houve troca silenciosa do contrato legado pelo flexível. Isso mantém clientes/formulários atuais estáveis enquanto a UI nova ainda não foi integrada.

Parcelamentos continuam usando `buildInstallmentOccurrences`; datas, quantidade de ocorrências, status futuro, rateio e saldo realizado não mudam.

## DTO e leitura

Os includes de série e `toTransactionDTO` expõem `interval` junto de `frequency`.

Isso vale para criação e leitura de transações com série associada. A exposição é somente metadata; nenhuma leitura materializa ocorrências ou altera a série.

## `rrule`

Não adicionada. O domínio atual cabe em helper lógico pequeno, preserva clamp próprio e não precisa da semântica Date/floating time de uma RRULE genérica.

## Persistência

`TransactionSeries` persiste:

```text
frequency = WEEKLY | MONTHLY | YEARLY
interval Int @default(1)
```

A migration é aditiva:

- amplia o enum sem remover `MONTHLY`;
- adiciona `interval` com default `1`;
- séries existentes permanecem `MONTHLY + interval=1` sem backfill destrutivo;
- `TransactionSeriesType` continua distinguindo recorrência de parcelamento;
- `CHECK` no PostgreSQL aceita somente `WEEKLY + 1|2`, `MONTHLY + 1|3` e `YEARLY + 1`.

O default existe para compatibilidade de dados existentes, mas não autoriza combinações arbitrárias: a constraint do banco é defesa adicional ao schema/domínio.

Nenhuma migration aplicada é reescrita.

## Validação atual

O motor cobre equivalência mensal, semanal/quinzenal, trimestral, 29/02, end date, status e limite.

O contrato Zod cobre as cinco combinações públicas, rejeição de intervalos não aprovados, count 2–60 e data final lógica válida.

O runtime adiciona regressões de:

- persistência de frequência/intervalo e datas determinísticas;
- primeiro status realizado + futuras `PENDING`;
- tipo derivado da categoria;
- ownership cross-tenant;
- rollback total da série e ocorrências.

O CI do head final deve aplicar migrations em PostgreSQL e executar `pnpm check` antes do merge.

## Próximos slices

1. integrar o formulário simples às cinco frequências públicas;
2. regressões cruzadas adicionais com edição/cancelamento de séries quando esse lifecycle for definido;
3. revisar labels/ajuda e responsividade da UI sem expor detalhes do motor.

Refs #289, #283, PR #321, PR #326, PR #329, `app/lib/transactions/logical-recurrence.ts`, `app/lib/transactions/flexible-series.ts`, `app/lib/transactions/monthly-series.ts`, `app/lib/transactions/installment-series.ts` e `docs/PRODUCTION.md`.
