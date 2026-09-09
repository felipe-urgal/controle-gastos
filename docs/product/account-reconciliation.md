# Reconciliação de contas por extrato

Status: **fundação, conferência `UNCLEARED ↔ CLEARED`, preview read-only e fechamento atômico implementados; desfazer auditável e UI permanecem pendentes na #286**.  
Última revisão: **2026-09-09**.

Reconciliação é metadata de conferência e não uma fonte financeira paralela. O saldo realizado continua derivado exclusivamente das transações `COMPLETED`, conforme ADR 0001 e ADR 0004.

## Estados

```text
UNCLEARED
CLEARED
RECONCILED
```

- `UNCLEARED`: ainda não conferida contra extrato;
- `CLEARED`: conferida no extrato em revisão;
- `RECONCILED`: pertence a um fechamento confirmado.

Somente transações `COMPLETED` podem avançar além de `UNCLEARED`.

`reconciledAt` só existe em `RECONCILED`. O PostgreSQL possui constraint para impedir combinações inválidas entre `status`, `reconciliationStatus` e timestamp.

## Endpoint de conferência

```text
PATCH /api/transactions/:id/reconciliation
```

Payload:

```json
{ "status": "CLEARED" }
```

ou:

```json
{ "status": "UNCLEARED" }
```

Regras:

- `userId` vem sempre da sessão;
- busca usa `id + userId`; outro tenant recebe 404;
- somente `COMPLETED` pode ser conferida;
- repetir o mesmo estado é idempotente;
- gravação usa condição sobre o estado observado e falha com conflito se houver mudança concorrente;
- o endpoint básico não aceita produzir nem desfazer `RECONCILED`;
- nenhum valor, tipo, categoria, conta, data ou status financeiro é alterado.

## Preview e fechamento por extrato

O mesmo recurso de conta possui leitura e confirmação explícitas:

```text
GET  /api/accounts/:id/reconciliation
POST /api/accounts/:id/reconciliation
```

O `GET` recebe data de corte lógica e `statementBalance` em centavos, não executa writes e deriva:

- conta/moeda;
- data de corte;
- saldo realizado até a data;
- saldo conferido (`CLEARED` + `RECONCILED`) até a data;
- diferença exata entre saldo do extrato e saldo conferido;
- itens `COMPLETED + UNCLEARED` do recorte.

O `POST` reutiliza o mesmo contrato de data/saldo e confirma o fechamento somente quando a diferença calculada dentro da transação é exatamente zero. A operação roda com isolamento `SERIALIZABLE`, promove apenas os itens ainda `CLEARED` elegíveis para `RECONCILED` e grava um único `reconciledAt` para o lote promovido.

Se o estado mudar durante o fechamento, a operação falha com `409` sem estado parcial. Repetir a confirmação depois que os itens já foram reconciliados é seguro: nenhum item é regravado e `reconciledCount` retorna zero.

## DTO e listagem

DTO de transação expõe:

```text
reconciliationStatus
reconciledAt
```

A listagem comum aceita `reconciliationStatus` como filtro, sem alterar summary ou demais agregados.

## Proteção de item reconciliado

Uma transação já `RECONCILED` não pode ser editada ou removida pelo CRUD normal. Ela também não pode voltar a `CLEARED/UNCLEARED` pelo endpoint básico.

O fluxo ainda pendente deverá oferecer um desfazer de reconciliação explícito/auditável antes de qualquer mutação destrutiva.

## Saldo e agregados

Mudar `UNCLEARED ↔ CLEARED` ou confirmar `CLEARED → RECONCILED` não participa de:

- saldo da conta;
- Dashboard;
- summary de transações;
- limites;
- forecast.

Não existe `reconciledBalance` persistido. Preview e fechamento derivam os totais das transações da conta até a data de corte; reconciliação não cria uma segunda fonte monetária.

## Transferências

SOURCE e DESTINATION são transações concretas em contas distintas e possuem estados independentes.

Conferir ou reconciliar SOURCE não altera DESTINATION e vice-versa. Essa independência é necessária porque cada conta é comparada com o próprio extrato.

## Importação

CSV/OFX não marca automaticamente itens como `CLEARED`. Novas transações continuam `UNCLEARED` por default até decisão de produto explícita sobre semântica de fonte bancária.

## Cobertura entregue

As regressões de domínio/PostgreSQL cobrem:

- `COMPLETED → CLEARED`;
- retry idempotente da conferência;
- saldo realizado numericamente idêntico antes/depois da conferência;
- rejeição de `PENDING`;
- isolamento multiusuário;
- independência das pernas de transferência;
- bloqueio de mutation/edição/remoção comum em `RECONCILED`;
- preview por conta/data de corte sem writes;
- diferença zero e não-zero em centavos exatos;
- confirmação atômica `CLEARED → RECONCILED`;
- retry do fechamento sem regravação ou estado parcial.

## Ainda pendente na #286

1. fluxo explícito e auditável para desfazer um fechamento antes de mutation destrutiva;
2. UI do painel de reconciliação e ações de conferência/fechamento;
3. `showValues=false`, teclado, mobile e mensagens de diferença/erro;
4. regressão full-stack da experiência final.

Refs #286, #283, #284, ADR 0001, ADR 0003 e ADR 0004.
