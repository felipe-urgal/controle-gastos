# ADR 0003 — Transferências entre contas como transações ligadas

## Status

**Aceito para implementação incremental.**  
Data: **2026-09-05**.  
Issue: **#284**.

## Contexto

O ledger atual representa entradas e saídas externas como `Transaction` concretas e deriva saldo exclusivamente de transações `COMPLETED`. Esse contrato é correto para movimentações operacionais, mas não distingue uma transferência interna entre duas contas do mesmo usuário.

Modelar transferência como uma despesa comum na origem e uma receita comum no destino contaminaria Dashboard, resumos, limites e despesas por categoria. Modelá-la como uma categoria especial também deslocaria uma regra estrutural de domínio para dados editáveis pelo usuário.

Ao mesmo tempo, criar saldo paralelo, entidade financeira virtual ou projeção persistida violaria o ADR 0001. O ADR 0002 também impede qualquer conversão cambial implícita.

## Decisão

Uma transferência é uma operação lógica representada por **duas `Transaction` concretas ligadas e gravadas atomicamente**:

- perna de origem: `type=EXPENSE`;
- perna de destino: `type=INCOME`.

As duas pernas continuam participando da derivação de saldo quando `status=COMPLETED`, mas são excluídas dos agregados operacionais de receita/despesa, categorias e limites.

### Discriminador explícito

`Transaction` passa a possuir um discriminador de domínio:

```text
TransactionKind = NORMAL | TRANSFER
```

Regras:

- transações existentes e novas movimentações externas usam `NORMAL`;
- pernas ligadas usam `TRANSFER`;
- `categoryId` continua obrigatório semanticamente para `NORMAL`;
- `categoryId` é `null` para `TRANSFER`;
- uma categoria chamada “Transferência” não possui significado especial.

A migration pode tornar `categoryId` nullable somente em conjunto com o discriminador e constraints/checks que preservem a invariável acima. Código de aplicação também deve validar a invariável; constraint de banco é defesa adicional, não substituto de validação de domínio.

### Identidade da operação

A operação lógica possui identidade própria `Transfer` para impedir que o relacionamento seja inferido por descrição, data ou valor.

Direção de modelo:

```text
Transfer
  id
  userId
  sourceTransactionId (unique)
  destinationTransactionId (unique)
  createdAt
  updatedAt
```

O vínculo deve garantir que uma mesma perna não seja reutilizada por duas transferências. A criação do `Transfer` e das duas `Transaction` ocorre na mesma `$transaction` Prisma.

O identificador da operação pode ser exposto nos DTOs quando necessário para UX/exportação, mas nunca autoriza acesso por si só: ownership continua derivado da sessão e revalidado no servidor.

### Invariantes do par

Para uma transferência válida:

- as duas contas pertencem ao usuário autenticado e estão ativas na criação;
- origem e destino são diferentes;
- ambas possuem a mesma moeda;
- `amount`, data lógica, descrição e status representam a mesma operação nas duas pernas;
- origem é `EXPENSE`, destino é `INCOME`;
- ambas são `kind=TRANSFER` e não possuem categoria;
- o par é criado, atualizado, cancelado ou removido atomicamente;
- uma perna não pode ser mutada isoladamente pelo CRUD genérico.

Nenhuma leitura cria, repara ou reconcilia automaticamente um par incompleto. Inconsistência persistida é incidente/bug a ser tratado explicitamente, não side effect de GET.

### Idempotência

A API dedicada de criação deve aceitar uma chave idempotente limitada ao usuário quando o contrato HTTP final for introduzido. Retries com a mesma chave e mesmo payload retornam a mesma operação; reutilização da chave com payload incompatível falha de forma explícita.

O detalhe de persistência da chave será definido junto do endpoint para evitar adicionar estado sem consumidor. A atomicidade do par é obrigatória independentemente da estratégia de idempotência.

## Efeito financeiro

### Saldo de conta

O ADR 0001 permanece inalterado:

- `TRANSFER + COMPLETED` participa do saldo da própria conta;
- origem reduz o saldo;
- destino aumenta o saldo;
- `PENDING` e `CANCELLED` não participam do realizado.

Para contas da mesma moeda, a soma das duas pernas `COMPLETED` possui efeito líquido zero quando observada em conjunto.

### Agregados operacionais

`TRANSFER` é excluída de:

- receita/despesa dos resumos de transações;
- receitas/despesas mensais do Dashboard;
- despesas por categoria;
- limites mensais por categoria;
- qualquer indicador que represente fluxo operacional externo.

Saldos de conta continuam incluindo as pernas. Assim a operação muda a distribuição do dinheiro entre contas, sem ser classificada como ganho ou consumo.

### Multi-moeda

O MVP aceita somente contas com a mesma moeda. Transferência cross-currency retorna erro de domínio e não cria nenhuma perna.

Não existe taxa, moeda-base ou conversão automática. Uma futura transferência cambial exige nova decisão explícita de domínio.

## API e camadas

A operação usa endpoint/serviço dedicado de transferência.

Direção de dependências:

```text
UI -> hook/service cliente -> route handler -> app/lib/transfers -> Prisma
```

O route handler autentica, valida transporte e serializa resposta. Regras de ownership, mesma moeda, atomicidade e consistência do par pertencem ao módulo de aplicação/domínio e não a `NextRequest`/`NextResponse`.

O CRUD genérico de `Transaction` deve rejeitar update/delete isolado de `kind=TRANSFER` e encaminhar a UX para a operação dedicada.

## Compatibilidade e migration

A evolução deve ser aditiva e permitir ordem segura de deploy:

1. adicionar `TransactionKind` com default `NORMAL` para registros existentes;
2. adicionar entidade/vínculos de transferência;
3. tornar `categoryId` nullable com constraint compatível com `kind`;
4. criar índices/uniques do vínculo;
5. validar migration em PostgreSQL limpo;
6. somente então promover runtime que cria `TRANSFER`.

Nenhuma migration aplicada anteriormente será editada. Forward-fix é a estratégia em caso de problema pós-migration.

Até o runtime de transferência estar ativo, todos os registros legados permanecem `NORMAL` e preservam o comportamento anterior.

## Importação e exportação

### Importação CSV/OFX

O MVP de #284 **não infere transferências**. Itens importados continuam entrando como transações normais conforme o contrato atual.

### Exportação

A exportação deve incluir informação suficiente para distinguir `NORMAL`/`TRANSFER`, identificar a operação lógica e a conta contraparte sem depender de categoria artificial. O formato concreto será atualizado junto da implementação para manter compatibilidade legível.

## UX

A UI deve apresentar “Transferência” como tipo de operação, não categoria. Em lista/calendário/detalhe, a contraparte é a outra conta.

A implementação deve preservar `showValues=false`, nomes acessíveis, navegação por teclado, estados de loading/erro e o contrato visual Orbit da área autenticada.

## Alternativas rejeitadas

### Categoria “Transferência”

Rejeitada porque categorias são editáveis, representam classificação operacional e atualmente determinam o tipo de transação normal. Uma categoria especial criaria regra implícita e contaminaria relatórios.

### Uma única transação trocando duas contas

Rejeitada porque o saldo canônico é derivado por conta a partir de transações concretas. Uma operação de duas contas dentro de uma única linha exigiria exceções na derivação e tornaria histórico/índices menos explícitos.

### Saldo persistido ou compensação em leitura

Rejeitado pelo ADR 0001. Leituras permanecem sem efeito colateral e não reparam pares.

### Conversão cambial automática

Rejeitada pelo ADR 0002. Não existe política de câmbio no produto.

## Consequências

### Positivas

- preserva `Transaction` como fonte financeira concreta;
- mantém derivação de saldo simples por `INCOME`/`EXPENSE`;
- evita contaminar receita/despesa operacional;
- vínculo é explícito e auditável;
- permite update/cancel/delete atômico do par;
- deixa importação e forecast evoluírem sem inferir relacionamento por heurística.

### Trade-offs

- `categoryId` deixa de ser estruturalmente obrigatório para todo tipo de `Transaction` e passa a depender de `kind`;
- consultas de agregados operacionais precisam filtrar `NORMAL`;
- CRUD genérico precisa reconhecer e bloquear pernas de transferência;
- migration e ordem de deploy exigem revisão cuidadosa.

## Validation plan

A implementação subsequente deve cobrir no mínimo:

- criação válida e exatamente duas pernas;
- rollback atômico em falha;
- ownership de origem/destino;
- origem igual ao destino;
- moedas diferentes;
- `COMPLETED` vs `PENDING` nos saldos;
- exclusão de summary/dashboard/limites;
- update/cancel/delete do par;
- bloqueio de mutação isolada;
- retries idempotentes;
- exportação e multiusuário.

Gates: migration review, `pnpm db:migrate`, `pnpm check`, checks adicionais proporcionais ao risco e auto code review no mesmo head final.

## Referências

- #284 — implementação de transferências;
- #283 — roadmap de produto;
- ADR 0001 — saldo derivado de transações;
- ADR 0002 — agregados multi-moeda sem conversão;
- `docs/architecture/application-layer-contract.md`;
- `docs/product/transaction-import.md`.
