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

O lifecycle também é dedicado à operação lógica inteira:

```text
PATCH /api/transfers/:id
DELETE /api/transfers/:id
  -> autenticação
  -> carregar Transfer por id + userId
  -> exigir exatamente SOURCE + DESTINATION consistentes
  -> bloquear leg RECONCILED
  -> aplicar a operação em uma única prisma.$transaction
```

Nenhuma leitura cria ou repara perna ausente/inconsistente.

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

## Lifecycle do par

### Atualização e cancelamento

`PATCH /api/transfers/:id` aceita pelo menos um dos campos:

- `amountCents`;
- `year`;
- `month`;
- `day`;
- `description`;
- `status`: `PENDING`, `COMPLETED` ou `CANCELLED`.

As contas não são alteradas neste slice. Trocar origem/destino permanece fora do contrato até existir necessidade real e guardrails equivalentes.

Antes do write, o servidor carrega a operação por `(id, userId)` e exige:

- exatamente duas pernas;
- uma `SOURCE/EXPENSE` e uma `DESTINATION/INCOME`;
- ambas `kind=TRANSFER`, `categoryId=null` e ligadas ao mesmo parent/usuário;
- contas diferentes e na mesma moeda;
- valor, data, descrição e status iguais nas duas pernas.

Par ausente ou de outro usuário retorna `404`. Par existente mas inconsistente retorna `409`; a aplicação não tenta completar, reparar nem excluir silenciosamente a operação quebrada.

A atualização das duas pernas ocorre na mesma `prisma.$transaction`. Alteração de valor, data, descrição ou status invalida qualquer `CLEARED` anterior e volta ambas as pernas para `UNCLEARED`. Uma perna `RECONCILED` bloqueia atualização até que a reconciliação seja desfeita por fluxo explícito.

Cancelar é a mesma operação lógica com `status=CANCELLED`: ambas as pernas deixam de participar do saldo realizado e ficam `UNCLEARED`.

### Remoção

`DELETE /api/transfers/:id` valida ownership, shape e reconciliação do par antes de remover o parent `Transfer`. A relação com cascade remove as duas pernas dentro da mesma transação de banco.

Se uma das pernas estiver `RECONCILED`, a remoção é bloqueada. Se o par estiver incompleto/inconsistente, retorna `409` e preserva o que existe para investigação; não há reparo implícito em leitura ou delete.

## Ainda pendente na #284

O lifecycle seguro do par está entregue neste slice, mas a feature ainda não está completa. Permanecem em etapas separadas:

- integrações restantes de leitura/DTO e identificação da conta contraparte;
- exposição final na UI;
- regressões full-stack da experiência de produto.

A UI continua desabilitada até esses contratos de leitura/contraparte estarem prontos para apresentar Transferência sem atalhos ou semântica inventada.
