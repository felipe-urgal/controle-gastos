# Limites mensais por categoria

Status: **em desenvolvimento** na issue #153, branch `feature/category-monthly-limits`.

## Objetivo

Permitir que o usuário defina um valor mensal de planejamento para cada categoria de despesa e acompanhe o realizado sem criar uma segunda fonte de verdade financeira.

## Regras de domínio

- cada limite pertence ao usuário autenticado, a uma categoria `EXPENSE`, a um ano e a um mês;
- existe no máximo um limite por `userId + categoryId + year + month`;
- o valor é armazenado como inteiro em centavos e precisa ser maior que zero;
- o realizado é sempre derivado das `Transaction` concretas com `type=EXPENSE` e `status=COMPLETED` no período selecionado;
- `PENDING` e `CANCELLED` não entram no realizado;
- editar ou remover um limite não altera transações, saldo ou séries;
- IDs vindos do cliente não comprovam ownership: a categoria é revalidada no servidor;
- leituras de limites não geram escrita financeira.

A regra de saldo derivado continua sendo a definida em [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md).

## Persistência

Modelo: `CategoryMonthlyLimit`.

Campos financeiros persistidos:

- `amount`: valor do limite em centavos.

Não são persistidos:

- realizado;
- restante;
- percentual consumido.

Esses valores são calculados a partir das transações concretas no momento da leitura.

A migration é aditiva e cria:

- tabela `category_monthly_limits`;
- unicidade por usuário/categoria/ano/mês;
- índices por período;
- constraints de `amount > 0` e mês entre 1 e 12;
- FKs com `ON DELETE CASCADE` para usuário e categoria.

## API

Endpoint: `/api/category-limits`.

### `GET`

Query:

```text
year=2028&month=4
```

Retorna categorias de despesa do usuário com:

- limite definido ou `null`;
- realizado do mês;
- restante;
- percentual consumido.

### `PUT`

Body:

```json
{
  "categoryId": "uuid",
  "year": 2028,
  "month": 4,
  "amount": 100000
}
```

Cria ou atualiza o limite do período. O backend rejeita categorias de receita e categorias de outro usuário.

### `DELETE`

Query:

```text
categoryId=uuid&year=2028&month=4
```

Remove somente o limite do período. Nenhuma transação é alterada.

## UX

A configuração fica na página de Categorias em um painel compacto, sem tabela horizontal obrigatória no mobile.

Cada categoria de despesa mostra:

- limite;
- realizado;
- restante;
- percentual consumido;
- texto de estado (`Sem limite definido`, `Dentro do limite`, atenção ou excedido), para não depender apenas de cor;
- ação para definir/editar;
- remoção com confirmação explícita.

A preferência `showValues=false` continua ocultando valores financeiros na interface.

## Testes obrigatórios

- unicidade por usuário/categoria/mês;
- rejeição de categoria `INCOME`;
- rejeição de categoria de outro usuário;
- realizado inclui somente `COMPLETED` do mês correto;
- `PENDING`/`CANCELLED` não alteram realizado;
- períodos diferentes permanecem independentes;
- remoção do limite preserva transações;
- isolamento entre usuários;
- valor não positivo é rejeitado.

## Gates de fechamento

Antes do merge:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Mudança visual também deve passar Lighthouse quando o workflow for aplicável. O auto code review final precisa revisar o mesmo head que passou os gates, conforme `AGENTS.md`.

Refs #153, #136, #163 e #172.
