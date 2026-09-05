# Reconciliação de contas por extrato

Status: **fundação de domínio/persistência e conferência `UNCLEARED ↔ CLEARED` implementadas; painel/fechamento atômico permanecem pendentes na #286**.  
Última revisão: **2026-09-05**.

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

## Endpoint de conferência atual

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

## DTO e listagem

DTO de transação expõe:

```text
reconciliationStatus
reconciledAt
```

A listagem comum aceita `reconciliationStatus` como filtro, sem alterar summary ou demais agregados.

## Proteção de item reconciliado

Uma transação já `RECONCILED` não pode ser editada ou removida pelo CRUD normal. Ela também não pode voltar a `CLEARED/UNCLEARED` pelo endpoint básico.

O fluxo futuro deverá oferecer um desfazer de reconciliação explícito/auditável antes de qualquer mutação destrutiva.

## Saldo e agregados

Mudar somente `UNCLEARED ↔ CLEARED` não participa de:

- saldo da conta;
- Dashboard;
- summary de transações;
- limites;
- forecast.

Não existe `reconciledBalance` persistido. Quando o painel de fechamento for implementado, todos os totais serão derivados das transações da conta e data de corte.

## Transferências

SOURCE e DESTINATION são transações concretas em contas distintas e possuem estados independentes.

Conferir SOURCE não altera DESTINATION e vice-versa. Essa independência é necessária porque cada conta é comparada com o próprio extrato.

## Importação

CSV/OFX não marca automaticamente itens como `CLEARED`. Novas transações continuam `UNCLEARED` por default até decisão de produto explícita sobre semântica de fonte bancária.

## Cobertura deste slice

A integração PostgreSQL protege:

- `COMPLETED → CLEARED`;
- retry idempotente;
- saldo realizado numericamente idêntico antes/depois da conferência;
- rejeição de `PENDING`;
- isolamento multiusuário;
- independência das pernas de transferência;
- bloqueio de mutation/edição/remoção comum em `RECONCILED`.

## Próximos slices

1. painel read-only por conta + data de corte + saldo de extrato em centavos;
2. cálculo de saldo conferido e diferença exata sem writes em GET/preview;
3. confirmação atômica somente quando a diferença for exatamente zero;
4. promoção de `CLEARED → RECONCILED` com `reconciledAt`;
5. fluxo auditável de desfazer fechamento;
6. UI acessível e responsiva com `showValues=false`.

Refs #286, #283, #284, ADR 0001, ADR 0003 e ADR 0004.
