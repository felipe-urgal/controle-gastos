# Recorrências flexíveis com datas lógicas

Status: **motor, contrato de entrada e persistência base implementados; serviço/runtime flexível pendente na #289**.  
Última revisão: **2026-09-05**.

A série continua sendo metadado; somente `Transaction` concreta é fonte financeira. O MVP amplia frequências comuns sem virar um calendário RFC genérico.

## Motor de domínio

O motor integrado opera sobre `LogicalDate { year, month, day }` e modela:

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

`app/schemas/transaction-flexible-recurrence.schema.ts` define a fronteira planejada para criação.

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

O schema valida formato e semântica estática; ownership de conta/categoria continua responsabilidade do serviço server-side com `userId` derivado da sessão.

## Status das ocorrências

Na materialização futura, primeira ocorrência mantém o status solicitado; todas as seguintes são `PENDING`. Leitura nenhuma cria ocorrência faltante.

## Compatibilidade mensal

O novo motor já possui regressões de equivalência com `monthly-recurrence.ts` para count/end date e âncoras de fim de mês. `monthly-series.ts` ainda não foi migrado; essa troca será feita somente quando o serviço flexível estiver pronto e os testes de parcelamento permanecerem verdes.

## `rrule`

Não adicionada. O domínio atual cabe em helper lógico pequeno, preserva clamp próprio e não precisa da semântica Date/floating time de uma RRULE genérica.

## Persistência

`TransactionSeries` passa a persistir:

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

O default existe para compatibilidade com writers mensais atuais, mas **não** autoriza combinações arbitrárias: a constraint do banco é defesa adicional ao schema/domínio.

Nenhuma migration aplicada é reescrita.

## Validação atual

Motor cobre equivalência mensal, semanal/quinzenal, trimestral, 29/02, end date, status e limite.

Contrato Zod cobre:

- as cinco combinações públicas;
- rejeição de intervalos não aprovados;
- count 2–60;
- data final lógica válida;
- reutilização do contrato normal da transação.

A migration deve ser validada em PostgreSQL pelo CI antes do merge. Próximos slices: serviço/API usando o motor, integração controlada de `monthly-series.ts`, regressões de parcelamento e UI simples com labels de frequência.

Refs #289, #283, PR #321, PR #326, `app/lib/transactions/monthly-recurrence.ts`, `app/lib/transactions/monthly-series.ts` e `docs/PRODUCTION.md`.
