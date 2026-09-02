# ADR 0001 — Saldo de contas derivado de transações

## Status

**Aceito.**  
Última revisão documental: **2026-09-02**.

## Contexto

O modelo `Account` já persistiu um campo `balance`, enquanto a aplicação também recalculava saldo a partir das transações. A listagem de contas chegava a escrever no banco durante um `GET` para tentar manter duas fontes sincronizadas, criando risco de drift, concorrência desnecessária e efeitos colaterais em leitura.

Também existia um endpoint legado `/api/accounts/ajustar` que alterava diretamente saldo de conta.

## Decisão

A única fonte canônica de verdade financeira para saldo são as transações concretas da conta com `status = COMPLETED`.

- `INCOME` soma ao saldo.
- `EXPENSE` subtrai do saldo.
- `PENDING` e `CANCELLED` não participam do saldo realizado.
- `Account` não possui saldo autoritativo persistido concorrente.
- Leituras de conta derivam saldo por agregação e nunca escrevem no banco.
- Lista, detalhe, criação e atualização preservam o contrato de DTO com `balance` derivado.
- Qualquer futuro ajuste manual de saldo deve ser representado por uma transação explícita e auditável, nunca por escrita direta em `Account`.

A decisão foi implementada na #132 / PR #143.

## Extensões já entregues

### Recorrências mensais — #151 / PR #162

A introdução de `TransactionSeries` não altera a fonte financeira:

- a série guarda metadados;
- somente ocorrências concretas `Transaction` podem afetar saldo;
- ocorrências futuras nascem `PENDING`;
- concluir uma ocorrência faz com que ela passe a participar da derivação normal;
- editar uma ocorrência reflete automaticamente no saldo derivado.

### Parcelamentos — #152 / PR #191

Parcelamentos reutilizam `TransactionSeries`, mas seguem a mesma invariável:

- a série não guarda saldo autoritativo;
- parcelas concretas são `Transaction` independentes;
- parcelas futuras `PENDING` não antecipam impacto financeiro;
- somente parcelas `COMPLETED` participam do saldo.

### Limites mensais — #153 / PR #193 + #198

`CategoryMonthlyLimit` persiste apenas planejamento:

- o valor e a moeda do limite são persistidos;
- realizado, restante e percentual são derivados das transações concretas da mesma moeda;
- `PENDING` e `CANCELLED` não entram no realizado;
- editar ou remover limite não altera saldo nem transações.

### Dashboard — #154 / PR #197 + #198

O Dashboard é uma camada de leitura:

- não persiste saldos, totais, percentuais ou séries temporais;
- reutiliza a derivação de saldo das contas;
- usa apenas `COMPLETED` nos agregados realizados;
- separa agregados por moeda conforme o ADR 0002;
- suas leituras não produzem escrita.

### Importação CSV/OFX — #155 / PR #199

A importação também preserva esta decisão:

- preview é stateless e não cria lançamentos;
- após confirmação, os itens aceitos tornam-se `Transaction` concretas;
- metadados de importação existem somente para rastreabilidade/idempotência;
- não existe `ImportJob` ou outro modelo paralelo de saldo/totais;
- transações importadas seguem as mesmas regras de saldo das demais transações.

## Multi-moeda

A semântica de agregados multi-moeda foi definida no **ADR 0002** / #198.

A regra é separar agregados por moeda, sem moeda-base ou conversão automática. Nenhuma implementação deve somar moedas distintas como se fossem convertidas, nem inventar taxa de câmbio sem uma decisão de domínio explícita futura.

Consulte [`0002-multi-currency-aggregates.md`](0002-multi-currency-aggregates.md).

## Consequências

### Positivas

- elimina divergência entre saldo persistido e histórico financeiro;
- mantém GETs livres de efeitos colaterais;
- mudança de valor/status/conta/categoria reflete automaticamente na leitura;
- recorrências, parcelamentos, limites, dashboard e importação reutilizam a mesma invariável;
- não existe sincronização paralela de saldo para reconciliar.

### Trade-offs

- leitura de saldo exige agregação das transações concluídas;
- se volume futuro tornar essa agregação um gargalo, otimizações devem manter `Transaction` como fonte canônica, por exemplo por projeção/materialized view reconstruível, sem reintroduzir um segundo estado autoritativo.

## Referências

- #132 / PR #143 — fonte única do saldo;
- #151 / PR #162 — recorrências;
- #152 / PR #191 — parcelamentos;
- #153 / PR #193 — limites mensais;
- #154 / PR #197 — Dashboard;
- #155 / PR #199 — importação CSV/OFX;
- #198 / ADR 0002 — agregados multi-moeda separados por moeda.
