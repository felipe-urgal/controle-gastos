# ADR 0001 — Saldo de contas derivado de transações

## Status

Aceito.

## Contexto

O modelo `Account` persistia um campo `balance`, enquanto a aplicação também recalculava o saldo a partir das transações. A listagem de contas executava escrita no banco durante um GET para tentar manter os dois valores sincronizados. Esse desenho criava duas fontes de verdade, permitia drift e adicionava efeito colateral a operações de leitura.

Também existia um endpoint legado `/api/accounts/ajustar` que alterava diretamente o saldo de uma conta por UUID fixo.

## Decisão

A única fonte de verdade para saldo financeiro são as transações da conta com `status = COMPLETED`.

- `INCOME` soma ao saldo.
- `EXPENSE` subtrai do saldo.
- `PENDING` e `CANCELLED` não participam do saldo.
- O campo persistido `accounts.balance` é removido.
- Leituras de conta derivam o saldo por agregação e nunca escrevem no banco.
- Lista, detalhe, criação e atualização retornam o mesmo contrato de DTO com `balance` derivado.
- Ajustes manuais de saldo, caso voltem a ser necessários como funcionalidade, devem ser representados por uma transação explícita e auditável — nunca por escrita direta em `Account`.

## Extensão após recorrências mensais (#151)

A introdução de `TransactionSeries` não altera esta decisão:

- a série guarda somente metadados de recorrência;
- a série nunca participa diretamente de saldo ou total realizado;
- somente ocorrências concretas `Transaction` podem afetar saldo;
- ocorrências futuras são criadas `PENDING` e, portanto, não antecipam impacto financeiro;
- concluir uma ocorrência faz com que ela passe a participar da mesma derivação já definida neste ADR;
- editar uma ocorrência continua refletindo automaticamente na leitura do saldo, sem sincronização paralela.

Qualquer futuro parcelamento (#152) ou dashboard (#154) deve reutilizar esta mesma fonte canônica e não persistir saldo/realizado concorrente.

## Consequências

### Positivas

- elimina divergência entre saldo persistido e histórico financeiro;
- GETs tornam-se livres de efeitos colaterais;
- alteração de valor/status/tipo/conta de uma transação reflete automaticamente no saldo;
- elimina necessidade de sincronização e correção de cache de saldo;
- séries recorrentes podem existir sem criar uma segunda fonte financeira.

### Trade-offs

- a leitura de contas exige agregação das transações concluídas;
- se o volume crescer a ponto de a agregação virar gargalo, otimizações futuras devem preservar as transações como fonte canônica (por exemplo, projeção/materialized view reconstruível), em vez de reintroduzir um segundo estado autoritativo.
