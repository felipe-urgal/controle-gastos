# ADR 0004 — Reconciliação é ortogonal ao status financeiro

Status: **Aceito**  
Data: **2026-09-05**

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

Não haverá coluna de “saldo reconciliado” autoritativa. Totais de um painel de reconciliação serão sempre derivados das transações elegíveis da conta.

## Mutações

O endpoint básico pode alternar somente:

```text
UNCLEARED <-> CLEARED
```

`RECONCILED` não pode ser produzido por uma edição comum. Ele será reservado ao fechamento explícito e atômico de uma reconciliação cujo saldo/diferença tenha sido validado.

Uma transação `RECONCILED` não pode ser editada ou removida pelo CRUD normal. Um fluxo futuro de desfazer reconciliação deve ocorrer primeiro e de forma auditável.

A mutation de conferência é idempotente e escopada por `id + userId`. Uma mudança concorrente do estado observado falha com conflito em vez de sobrescrever silenciosamente.

## Transferências

Cada perna de transferência é uma `Transaction` concreta em uma conta diferente. Portanto SOURCE e DESTINATION possuem estados de reconciliação independentes.

Conferir uma perna nunca confere automaticamente a outra e não altera o vínculo do par.

## Importação

CSV/OFX continua criando lançamentos com `UNCLEARED`. Arquivo bancário não implica automaticamente `CLEARED` neste MVP; essa decisão exigiria semântica explícita por fonte/formato.

## Consequências

### Positivas

- conferência não altera saldo realizado;
- estado financeiro e estado de extrato não se confundem;
- transferências podem ser conferidas por instituição/conta;
- fechamento futuro pode ser atômico sem criar nova fonte monetária.

### Custos

- lifecycle destrutivo precisa respeitar `RECONCILED`;
- UI deve explicar a diferença entre `Concluída`, `Conferida` e `Reconciliada` sem depender só de cor;
- desfazer fechamento precisa ser um fluxo de domínio próprio.

## Referências

- #286
- #284
- ADR 0001 — saldo como derivação de transações
- ADR 0003 — transferências como transações vinculadas
