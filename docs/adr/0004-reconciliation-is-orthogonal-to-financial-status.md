# ADR 0004 — Reconciliação é ortogonal ao status financeiro

Status: **Aceito**  
Data: **2026-09-05**  
Última revisão: **2026-09-11**

## Contexto

`Transaction.status` responde se um lançamento participa do realizado:

- `COMPLETED` participa;
- `PENDING` ainda não participa;
- `CANCELLED` não participa.

Reconciliação responde outra pergunta: o lançamento já foi conferido contra o extrato da instituição? Usar o mesmo estado para as duas dimensões faria operações de conferência alterarem saldo, Dashboard ou lifecycle financeiro sem necessidade.

## Decisão

`Transaction` possui uma dimensão própria:

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

Nenhum cálculo de saldo, Dashboard, limites, summary ou forecast consulta `reconciliationStatus` como critério financeiro.

A fonte financeira continua sendo `Transaction` + `status`, conforme ADR 0001. Reconciliação apenas adiciona metadata de conferência.

Não haverá coluna de “saldo reconciliado” autoritativa. Preview e fechamento derivam seus totais das transações elegíveis da conta e data de corte.

`AccountReconciliationEvent` também **não** é uma fonte financeira: guarda apenas a trilha operacional dos eventos `CONFIRMED`/`UNDONE` para explicar qual lote foi fechado/desfeito e com quais parâmetros de extrato.

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

No mesmo commit transacional, o fechamento cria um `AccountReconciliationEvent(action=CONFIRMED)` com:

- `batchReconciledAt` igual ao `reconciledAt` do lote;
- quantidade promovida;
- data de corte;
- saldo do extrato informado;
- `userId`, `accountId` e timestamp do evento.

Mudança concorrente falha com conflito em vez de deixar estado parcial. Repetir uma confirmação já aplicada é seguro: itens já `RECONCILED` não são regravados nem recebem outro evento `CONFIRMED`.

## Undo explícito e auditável

Uma transação `RECONCILED` não pode ser editada, removida nem devolvida a `CLEARED` pelo CRUD normal. Antes de uma mutation destrutiva legítima, o fechamento precisa ser desfeito explicitamente:

```text
POST /api/accounts/:id/reconciliation/undo
```

O cliente envia o `reconciledAt` exato do lote que espera desfazer.

Regras:

- a conta é carregada por `id + userId`;
- somente o lote `RECONCILED` ativo mais recente pode ser desfeito;
- o timestamp recebido precisa coincidir exatamente com esse lote;
- todas as pernas daquele lote voltam em uma transação `SERIALIZABLE` para `CLEARED` e `reconciledAt=null`;
- `amount`, `type`, `kind`, categoria, conta, data, descrição e `Transaction.status` permanecem intocados;
- um `AccountReconciliationEvent(action=UNDONE)` é criado com a mesma identidade de lote;
- retry do mesmo pedido é idempotente: se o evento `UNDONE` já existe, a operação não procura outro lote para desfazer;
- pedido obsoleto enquanto houver fechamento mais recente ativo falha com `409`.

A identidade `(accountId, batchReconciledAt, action)` é única. Isso transforma o timestamp do fechamento em referência estável da operação lógica sem introduzir um saldo persistido paralelo.

Fechamentos criados antes da trilha de auditoria continuam válidos. Eles podem ser desfeitos pela identidade `reconciledAt`; campos históricos que nunca existiram permanecem nulos no evento de undo em vez de serem inventados.

A mutation básica de conferência também é idempotente e escopada por `id + userId`. Uma mudança concorrente do estado observado falha com conflito em vez de sobrescrever silenciosamente.

## Transferências

Cada perna de transferência é uma `Transaction` concreta em uma conta diferente. Portanto SOURCE e DESTINATION possuem estados de reconciliação independentes.

Conferir ou reconciliar uma perna nunca confere/reconcilia automaticamente a outra e não altera o vínculo do par.

O lifecycle lógico da transferência bloqueia update/delete quando alguma perna está `RECONCILED`. A conta correspondente deve primeiro desfazer explicitamente o fechamento que contém aquela perna.

## UI

A reconciliação vive na visão de Conta porque conta, moeda e extrato são o contexto da operação.

A experiência mantém três conceitos textuais distintos:

- `Concluída`: estado financeiro;
- `Conferida`: `CLEARED` no extrato em revisão;
- `Reconciliada`: `RECONCILED` em fechamento confirmado.

O usuário informa data de corte/saldo do extrato, vê diferença derivada, marca itens individualmente e só pode fechar quando a diferença é exatamente zero. O último fechamento ativo expõe undo explícito em confirmação de duas etapas.

Não há bulk mutation cliente neste slice porque a API básica é por transação e uma sequência parcial não satisfaria a mesma garantia de atomicidade. Ação em lote futura exige contrato server-side próprio.

`showValues=false` continua valendo para todos os valores derivados. O campo de saldo do extrato, por ser entrada deliberada do usuário, pode mostrar o conteúdo digitado sem revelar o saldo calculado da conta.

## Importação

CSV/OFX continua criando lançamentos com `UNCLEARED`. Arquivo bancário não implica automaticamente `CLEARED` neste MVP; essa decisão exigiria semântica explícita por fonte/formato.

## Consequências

### Positivas

- conferência não altera saldo realizado;
- estado financeiro e estado de extrato não se confundem;
- transferências podem ser conferidas por instituição/conta;
- fechamento e undo são atômicos sem criar nova fonte monetária;
- a trilha `CONFIRMED/UNDONE` torna a reversão explicável;
- retry/conflito preservam consistência sem writes parciais;
- um retry antigo não consegue desfazer silenciosamente um fechamento novo.

### Custos

- existe uma tabela adicional de metadata operacional;
- lifecycle destrutivo precisa respeitar `RECONCILED`;
- UI precisa explicar `Concluída`, `Conferida` e `Reconciliada` sem depender só de cor;
- bulk reconciliation continua fora do MVP até existir mutation atômica apropriada.

## Referências

- #286
- #284
- ADR 0001 — saldo como derivação de transações
- ADR 0003 — transferências como transações vinculadas
- `docs/product/account-reconciliation.md`
