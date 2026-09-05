# ADR 0003 — Transferências entre contas como transações ligadas

## Status

**Aceito para implementação incremental.**  
Data: **2026-09-05**.  
Issue: **#284**.

## Contexto

O ledger deriva saldo exclusivamente de `Transaction` concretas `COMPLETED`. Esse contrato funciona para entradas e saídas externas, mas uma transferência interna não pode ser tratada como despesa comum na origem + receita comum no destino, porque isso contaminaria Dashboard, resumos, categorias e limites.

Uma categoria especial “Transferência” também é inadequada: categorias são dados editáveis do usuário, enquanto a transferência é uma relação estrutural do domínio. O ADR 0001 impede saldo paralelo e o ADR 0002 impede conversão cambial implícita.

## Decisão

Uma transferência é uma operação lógica `Transfer` com **duas `Transaction` concretas ligadas e gravadas atomicamente**:

- origem: `type=EXPENSE`, `transferRole=SOURCE`;
- destino: `type=INCOME`, `transferRole=DESTINATION`.

As pernas participam da derivação de saldo quando `COMPLETED`, mas ficam fora dos agregados operacionais de receita/despesa, categorias e limites.

### Discriminador e shape

`Transaction` recebe:

```text
TransactionKind = NORMAL | TRANSFER
TransferRole = SOURCE | DESTINATION
```

Regras persistidas:

- `NORMAL`: `categoryId` obrigatório; `transferId` e `transferRole` nulos;
- `TRANSFER`: `categoryId` nulo; `transferId` e `transferRole` obrigatórios;
- `SOURCE` só pode acompanhar `EXPENSE`;
- `DESTINATION` só pode acompanhar `INCOME`;
- uma categoria chamada “Transferência” não possui significado especial.

A migration registra `CHECK` constraints para esse shape. A aplicação continua validando as mesmas invariantes antes da escrita; constraints são defesa adicional.

### Identidade e direção do relacionamento

A primeira redação deste ADR considerava guardar `sourceTransactionId` e `destinationTransactionId` em `Transfer`. O review da migration refinou a direção para um modelo pai-filho mais seguro:

```text
Transfer
  id
  userId
  createdAt
  updatedAt

Transaction (perna)
  kind = TRANSFER
  transferId -> Transfer.id
  transferRole = SOURCE | DESTINATION
```

Motivos:

- excluir a operação `Transfer` pode remover as duas pernas por cascade de forma natural;
- `UNIQUE (transferId, transferRole)` impede duas origens ou dois destinos na mesma operação;
- a FK composta `(transferId, userId) -> (Transfer.id, Transfer.userId)` impede vínculo entre tenants diferentes no próprio banco;
- o par continua fácil de carregar sem duplicar IDs de legs no parent.

Exatamente duas pernas é uma invariável da operação de aplicação: criação ocorre numa única `$transaction` Prisma. Uma falha em qualquer validação ou insert faz rollback do `Transfer` e das legs. Nenhuma leitura cria/repara par incompleto.

### Ownership

Toda operação deriva `userId` da sessão.

Na criação:

- origem e destino precisam pertencer ao usuário autenticado;
- ambas precisam estar ativas;
- origem e destino precisam ser diferentes;
- a moeda precisa ser igual;
- o `Transfer.userId` é o mesmo das duas legs.

A FK composta é proteção de banco; ela não substitui validação de ownership de `accountId` no serviço.

### Idempotência

A API dedicada de criação deve receber chave idempotente escopada por usuário quando o contrato HTTP for introduzido. Retry com mesma chave + mesmo payload retorna a mesma operação; reutilização com payload incompatível falha explicitamente.

A persistência dessa chave só será adicionada junto do consumer HTTP, evitando estado sem uso.

## Efeito financeiro

### Saldo

O ADR 0001 permanece válido:

- `TRANSFER + COMPLETED` entra no saldo da própria conta;
- origem reduz saldo;
- destino aumenta saldo;
- `PENDING` e `CANCELLED` não entram no realizado.

Entre contas da mesma moeda, o efeito líquido conjunto é zero.

### Agregados operacionais

`TRANSFER` deve ser excluída de:

- receita/despesa dos resumos de transações;
- receitas/despesas mensais do Dashboard;
- despesas por categoria;
- limites mensais por categoria;
- qualquer indicador que represente fluxo externo.

Os saldos de contas continuam incluindo as pernas.

### Multi-moeda

O MVP aceita somente transferência entre contas da mesma moeda. Cross-currency retorna erro de domínio e não cria nenhuma leg.

Não existe taxa, moeda-base ou conversão automática. Uma futura transferência cambial exige novo ADR.

## API e camadas

A operação usa serviço/endpoint dedicado:

```text
UI -> hook/service cliente -> route -> app/lib/transfers -> Prisma
```

A route autentica, valida transporte e serializa. Ownership, mesma moeda, atomicidade e consistência pertencem ao módulo de aplicação/domínio.

O CRUD genérico de `Transaction` rejeita update/delete isolado de `kind=TRANSFER`. A quick action de conclusão também aceita somente `kind=NORMAL`; uma perna pendente nunca pode ser concluída sozinha por esse caminho. O summary operacional do CRUD filtra explicitamente `kind=NORMAL`, enquanto a derivação de saldo continua considerando legs `TRANSFER + COMPLETED`.

Esses guards são deliberadamente entregues **antes** do endpoint de criação. Assim, a introdução futura do serviço dedicado não abre uma janela em que uma operação lógica possa ser quebrada pelas rotas antigas.

### Lifecycle de conta

`Account` ainda possui cascade físico para `Transaction`, mas o CRUD da aplicação **não executa esse cascade quando há transações vinculadas**: `accountCrud` bloqueia exclusão sempre que `_count.transactions > 0`.

Esse guard geral também cobre as duas pernas de uma transferência. Regressão PostgreSQL específica prova que tentar excluir origem ou destino retorna erro antes do delete e preserva simultaneamente as duas contas, a operação `Transfer` e as duas legs. Conta vazia continua removível normalmente.

Enquanto não existir um fluxo dedicado de lifecycle capaz de remover/migrar o par inteiro atomicamente, essa política conservadora é a regra oficial. O endpoint futuro de criação de transferências pode confiar que uma conta participante não será apagada pelo CRUD genérico e deixará orphan leg.

## Schema e migration

O slice de schema da #284 é aditivo para todos os dados existentes:

1. cria enums `TransactionKind` e `TransferRole`;
2. cria `transfers`;
3. adiciona `kind= NORMAL` por default às transações atuais;
4. adiciona `transfer_id`/`transfer_role` nulos;
5. torna `categoryId` nullable fisicamente;
6. adiciona constraints que mantêm categoria obrigatória para `NORMAL`;
7. adiciona unique `(transfer_id, transfer_role)`;
8. adiciona FK composta de ownership;
9. adiciona índices para lookup/agregados.

Como todos os registros existentes continuam `NORMAL` com categoria, a migration não exige backfill destrutivo e o runtime anterior continua sem produzir `TRANSFER`.

Nenhuma migration aplicada é editada. Problemas pós-migration usam forward-fix.

## Ordem de promoção

O runtime que cria `TRANSFER` depende do schema novo. Ordem:

1. validar migration em PostgreSQL limpo;
2. revisar SQL e compatibilidade;
3. aplicar migration no ambiente alvo;
4. confirmar `prisma migrate status` saudável;
5. promover guards do CRUD/agregados;
6. confirmar lifecycle de conta fail-closed;
7. promover runtime dedicado que cria o par atomicamente;
8. executar smoke funcional e observar erros.

Rollback cego para runtime incompatível com dados `TRANSFER` não é seguro depois que a feature começar a gravar operações.

## Importação e exportação

A importação CSV/OFX **não infere transferências** neste MVP. Itens importados continuam `NORMAL`.

A exportação JSON v2/CSV já distingue `NORMAL`/`TRANSFER` por `kind`, `transferId` e `transferRole`. Para `TRANSFER`, categoria é nula; a identificação de contraparte na experiência de produto continua responsabilidade dos consumidores que carregarem a operação ligada.

## UX

A UI apresenta “Transferência” como tipo de operação. Lista/calendário/detalhe mostram a conta contraparte no lugar da categoria.

Preservar `showValues=false`, teclado, foco, estados explícitos e Orbit.

## Alternativas rejeitadas

- categoria “Transferência”: mistura regra estrutural com dado editável;
- uma única linha financeira para duas contas: quebra a derivação simples por conta;
- saldo persistido/compensação em leitura: viola ADR 0001;
- conversão cambial automática: viola ADR 0002;
- relacionamento por descrição/data/valor: não é identidade auditável.

## Validation plan

A implementação completa deve cobrir:

- migration em PostgreSQL limpo;
- shape `NORMAL`/`TRANSFER` e role/type;
- exatamente duas legs em criação válida;
- rollback em falha;
- ownership de origem/destino e do vínculo Transfer;
- mesma conta e moedas diferentes;
- `COMPLETED` vs `PENDING` nos saldos;
- summary/dashboard/limites sem contaminação;
- update/cancel/delete do par;
- lifecycle de conta sem orphan leg;
- bloqueio de mutação isolada;
- retries idempotentes;
- exportação e regressões multiusuário.

Gates: `pnpm db:migrate`, `pnpm check`, checks adicionais proporcionais ao risco e auto code review no mesmo head final.

## Referências

- #284 — implementação de transferências;
- #283 — roadmap de produto;
- ADR 0001 — saldo derivado de transações;
- ADR 0002 — agregados multi-moeda sem conversão;
- `docs/architecture/application-layer-contract.md`;
- `docs/product/transaction-import.md`.
