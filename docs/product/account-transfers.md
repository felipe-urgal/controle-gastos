# Transferências entre contas

Issue: #284

## Estado atual

O domínio possui `Transfer` e duas pernas `Transaction` ligadas por `transferId`/`transferRole`. O CRUD genérico bloqueia mutação isolada, os agregados operacionais não classificam `TRANSFER` como receita/despesa e a exclusão de conta falha fechado quando existem transações vinculadas.

A criação dedicada é autenticada, atômica e idempotente:

```text
POST /api/transfers
  -> autenticação
  -> Idempotency-Key obrigatório
  -> validação do payload
  -> ownership + isActive das duas contas
  -> mesma moeda
  -> prisma.$transaction
       -> Transfer + hashes de idempotência
       -> SOURCE / EXPENSE
       -> DESTINATION / INCOME
```

## Contrato de criação

Header obrigatório:

- `Idempotency-Key`: texto não vazio com no máximo 128 caracteres após `trim`.

Campos do body:

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

## Idempotência e retry

A chave nunca é persistida em texto puro. O serviço aplica SHA-256 à chave normalizada e persiste somente `idempotency_key_hash`. O body já validado também recebe um hash canônico (`request_hash`) com os campos do contrato de criação em ordem fixa.

A identidade idempotente é `(userId, idempotency_key_hash)`:

- primeira criação válida retorna `201`;
- retry com a mesma chave e o mesmo payload retorna `200` e os mesmos IDs de `Transfer`, `SOURCE` e `DESTINATION`;
- reutilizar a mesma chave com payload diferente retorna `409` e não cria novas linhas;
- a mesma chave pode ser usada por usuários diferentes sem colisão;
- retries concorrentes são serializados pela constraint única do PostgreSQL. A requisição perdedora do `P2002` recarrega a operação vencedora e aplica a mesma comparação de `request_hash`.

Transferências criadas antes deste slice permanecem com os dois hashes nulos. Uma constraint de banco exige que `idempotency_key_hash` e `request_hash` sejam ambos nulos ou ambos preenchidos, evitando estado parcial.

Idempotência não substitui autorização nem validação de domínio: ownership, conta ativa, mesma moeda, data e centavos continuam sendo verificados no fluxo normal antes de qualquer par financeiro ser criado.

## Ainda pendente na #284

Este endpoint ainda não torna a feature completa. Permanecem em slices separados:

- update/cancel/delete do par como uma única operação lógica;
- integrações restantes de leitura/DTO e contraparte;
- exposição final na UI e regressões de produto correspondentes.

A UI continua desabilitada enquanto esses guardrails de lifecycle não estiverem completos.
