# Transferências entre contas

Issue: #284

## Estado atual

O domínio já possui `Transfer` e duas pernas `Transaction` ligadas por `transferId`/`transferRole`. O CRUD genérico bloqueia mutação isolada e os agregados operacionais não classificam `TRANSFER` como receita/despesa.

Este slice adiciona o primeiro caminho de criação dedicado:

```text
POST /api/transfers
  -> autenticação
  -> validação do payload
  -> ownership + isActive das duas contas
  -> mesma moeda
  -> prisma.$transaction
       -> Transfer
       -> SOURCE / EXPENSE
       -> DESTINATION / INCOME
```

## Contrato de criação

Campos:

- `sourceAccountId`;
- `destinationAccountId`;
- `amountCents` inteiro e positivo;
- `year`, `month`, `day` válidos;
- `description`;
- `status`: `PENDING` ou `COMPLETED`.

Regras:

- origem e destino precisam ser contas próprias e ativas;
- a mesma mensagem é usada quando uma conta não é utilizável, sem revelar ownership de ids externos;
- origem e destino não podem ser a mesma conta;
- as moedas precisam ser iguais;
- as duas pernas possuem exatamente o mesmo valor/data/descrição/status;
- `SOURCE` usa `EXPENSE`, `DESTINATION` usa `INCOME`;
- ambas são `kind=TRANSFER` e `categoryId=null`;
- criação do vínculo e das duas pernas ocorre dentro da mesma transação Prisma.

## Ainda pendente na #284

Este endpoint não torna a feature completa. Permanecem em slices separados: idempotência/retry, update/cancel/delete do par, lifecycle de conta, exclusão dos demais agregados, DTO/listagem/UX e fluxo de exportação final.

A UI não deve ser habilitada antes desses guardrails estarem completos.
