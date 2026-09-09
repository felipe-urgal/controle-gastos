# ADR 0004 — Reconciliação é ortogonal ao status financeiro

Status: **Aceito**  
Data: **2026-09-05**  
Última revisão: **2026-09-09**

## Contexto

`Transaction.status` responde se um lançamento participa do realizado:

- `COMPLETED` participa;
- `PENDING` ainda não participa;
- `CANCELLED` não participa.

Reconciliação responde outra pergunta: o lançamento já foi conferido contra o extrato da instituição? Usar o mesmo estado para as duas dimensões faria operações de conferência alterarem saldo, Dashboard ou lifecycle financeiro sem necessidade.

## Decisão

`Transaction` passa a ter uma dimensão própria:

```text
ReconciliationStatus
- UNCLEARED
- CLEARED
- RECONCILED
```

Semântica:

- `UNCLEARED`: ainda não conferida;
- `CLEARED`: conferida no extrato atual, mas ainda não pertencente a um fechamento confirmado;
- `RECONCILED`: incluída em uma reconciliação fechada explicitamente.

`reconciledAt` é `null` em `UNCLEARED/CLEARED` e obrigatório em `RECONCILED`.

Somente `COMPLETED` pode ficar `CLEARED` ou `RECONCILED`. A constraint PostgreSQL replica essa regra como defesa adicional.

## Fonte de verdade financeira

Nenhum cálculo de saldo, Dashboard, limites, summary ou forecast passa a consultar `reconciliationStatus`.

A fonte financeira continua sendo `Transaction` + `status`, conforme ADR 0001. Reconciliação apenas adiciona metadata de conferência.

Não haverá coluna de “saldo reconciliado” autoritativa. Preview e fechamento derivam seus totais das transações elegíveis da conta e data de corte.

## Mutações

O endpoint básico pode alternar somente:

```text
UNCLEARED <-> CLEARED
```

`RECONCILED` não pode ser produzido por uma edição comum. Ele é reservado ao fechamento explícito de reconciliação:

```text
POST /api/accounts/:id/reconciliation
```

O fechamento recalcula o saldo conferido e a diferença dentro de uma `prisma.$transaction` com isolamento `SERIALIZABLE`. A operação só prossegue quando a diferença é exatamente zero e promove atomicamente apenas os itens ainda `CLEARED` elegíveis para `RECONCILED`, gravando `reconciledAt` no lote promovido.

Mudança concorrente falha com conflito em vez de deixar estado parcial. Repetir uma confirmação já aplicada é seguro: itens já `RECONCILED` não são regravados.

Uma transação `RECONCILED` não pode ser editada ou removida pelo CRUD normal. Um fluxo ainda futuro de desfazer reconciliação deve ocorrer primeiro e de forma auditável.

A mutation básica de conferência também é idempotente e escopada por `id + userId`. Uma mudança concorrente do estado observado falha com conflito em vez de sobrescrever silenciosamente.

## Transferências

Cada perna de transferência é uma `Transaction` concreta em uma conta diferente. Portanto SOURCE e DESTINATION possuem estados de reconciliação independentes.

Conferir ou reconciliar uma perna nunca confere/reconcilia automaticamente a outra e não altera o vínculo do par.

## Importação

CSV/OFX continua criando lançamentos com `UNCLEARED`. Arquivo bancário não implica automaticamente `CLEARED` neste MVP; essa decisão exigiria semântica explícita por fonte/formato.

## Consequências

### Positivas

- conferência não altera saldo realizado;
- estado financeiro e estado de extrato não se confundem;
- transferências podem ser conferidas por instituição/conta;
- fechamento é atômico sem criar nova fonte monetária;
- retry/conflito preservam consistência sem writes parciais.

### Custos

- lifecycle destrutivo precisa respeitar `RECONCILED`;
- UI deve explicar a diferença entre `Concluída`, `Conferida` e `Reconciliada` sem depender só de cor;
- desfazer fechamento precisa ser um fluxo de domínio próprio.

## Referências

- #286
- #284
- ADR 0001 — saldo como derivação de transações
- ADR 0003 — transferências como transações vinculadas
- `docs/product/account-reconciliation.md`
