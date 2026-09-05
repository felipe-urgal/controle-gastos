# Recorrências flexíveis com datas lógicas

Status: **foundation do motor lógico em implementação na #289**.  
Última revisão: **2026-09-05**.

O objetivo é ampliar as recorrências sem transformar o produto em um calendário RFC genérico. A série continua sendo metadado; somente `Transaction` concreta é fonte financeira.

## Decisão do foundation

O motor opera sobre `LogicalDate { year, month, day }`, sem timezone local, e modela o MVP com:

```text
frequency = WEEKLY | MONTHLY | YEARLY
interval
```

Combinações públicas planejadas:

- semanal = `WEEKLY + 1`;
- quinzenal = `WEEKLY + 2`;
- mensal = `MONTHLY + 1`;
- trimestral = `MONTHLY + 3`;
- anual = `YEARLY + 1`.

O helper puro rejeita outras combinações no MVP. Isso evita que uma API interna mais genérica exponha frequências que a UX/domínio não aprovou.

## Semântica de datas

### Semanal / quinzenal

Avanço de 7 × `interval` dias usando `Date.UTC` somente como algoritmo de calendário. O resultado volta imediatamente para `LogicalDate`; timezone do processo/browser não participa.

### Mensal / trimestral

A data inicial permanece âncora permanente. A ocorrência N é calculada diretamente a partir da âncora original, nunca da ocorrência anterior.

Se o mês alvo não possuir o dia da âncora, usa-se o último dia válido.

Assim, `31/01` mensal continua produzindo `28|29/02`, depois `31/03`, sem drift cumulativo. O foundation possui regressão que compara o novo motor com `monthly-recurrence.ts` para count e end date.

### Anual

A ocorrência preserva mês/dia da âncora. Para série iniciada em 29/02, anos não bissextos usam 28/02 e o próximo ano bissexto volta a 29/02. O clamp não altera a âncora original.

## Finitude e limites

O contrato preserva as duas formas atuais:

- quantidade de ocorrências; ou
- data final inclusiva.

São necessárias pelo menos duas ocorrências e o máximo permanece 60 no foundation. O limite é validado antes de qualquer futura escrita em banco.

## Status das ocorrências

Ao materializar ocorrências:

- a primeira recebe o status solicitado;
- todas as seguintes recebem `PENDING`.

Nenhum GET, Dashboard, Calendário ou forecast cria ocorrência ausente.

## Compatibilidade mensal

O novo motor ainda **não substitui** `monthly-recurrence.ts` nem altera `monthly-series.ts`. Este slice existe para provar a semântica antes de migration/API.

A integração futura só poderá trocar o motor mensal depois que a suíte mostrar equivalência para:

- dias comuns;
- 28/29/30/31;
- fevereiro bissexto/não bissexto;
- count;
- end date;
- limite de 60;
- status da primeira/futuras.

Essa estratégia evita alterar comportamento existente ao mesmo tempo em que schema e UI são ampliados.

## Decisão sobre `rrule`

`rrule` não foi adicionada.

Motivos:

- o domínio atual é data financeira lógica, não `Date` com timezone/floating semantics;
- o comportamento de clamp mensal existente precisa ser preservado exatamente;
- weekly/monthly/yearly + interval/count/until cabem em um helper puro pequeno;
- adicionar dependência agora ampliaria supply chain e bundle/tooling sem reduzir complexidade comprovada.

A decisão pode ser revisitada se o escopo futuro realmente exigir regras como múltiplos weekdays ou padrões RFC mais complexos — itens hoje fora do MVP.

## Persistência planejada

O próximo slice de schema deve ser aditivo:

- ampliar `RecurrenceFrequency` para `WEEKLY | MONTHLY | YEARLY`;
- adicionar `interval Int @default(1)`;
- séries existentes continuam `MONTHLY + interval=1`;
- preservar `TransactionSeriesType` para distinguir recorrência de parcelamento;
- revisar constraints/índices sem editar migrations já aplicadas.

O runtime novo só deve usar os novos valores depois de `pnpm db:migrate` e schema saudável, conforme `docs/PRODUCTION.md`.

## Camadas futuras

A regra de geração fica em `app/lib/transactions`. Route handler continuará fino; Zod valida frequência/interval/count/endDate; Prisma materializa série + transações na mesma `$transaction`.

UI oferecerá somente labels simples (“Semanal”, “Quinzenal”, “Mensal”, “Trimestral”, “Anual”), sem editor RRULE.

## Validação do foundation

Os testes dedicados cobrem:

- equivalência mensal com o motor atual;
- semanal atravessando ano;
- quinzenal;
- trimestral com âncora 31;
- anual iniciado em 29/02;
- end date entre ocorrências;
- primeira ocorrência vs futuras `PENDING`;
- intervalos fora do MVP;
- limite máximo.

Próximos slices: schema/migration, schemas/API/serviço, integração do motor, regressões de parcelamento e UI.

Refs #289, #283, `app/lib/transactions/monthly-recurrence.ts`, `app/lib/transactions/monthly-series.ts` e `docs/PRODUCTION.md`.
