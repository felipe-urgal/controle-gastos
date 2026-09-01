# Limites mensais por categoria

Status: **✅ implementado e integrado à `main` na #153 / PR #193**.  
Última revisão documental: **2026-09-01**.

## Objetivo

Permitir que o usuário defina um valor mensal de planejamento para cada categoria de despesa e acompanhe o realizado sem criar uma segunda fonte de verdade financeira.

## Regras de domínio

- cada limite pertence ao usuário autenticado, a uma categoria `EXPENSE`, a um ano e a um mês;
- existe no máximo um limite por `userId + categoryId + year + month`;
- o valor é armazenado como inteiro em centavos e precisa ser maior que zero;
- o realizado é derivado das `Transaction` concretas com categoria `EXPENSE` e `status=COMPLETED` no período;
- `PENDING` e `CANCELLED` não entram no realizado;
- editar ou remover um limite não altera transações, saldo ou séries;
- IDs recebidos do cliente não comprovam ownership: categoria e limite são revalidados no servidor;
- leituras de limites não geram escrita financeira;
- uma categoria com limite existente não pode ser convertida para `INCOME` sem remover os limites incompatíveis.

A regra de saldo derivado continua sendo a definida em [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md).

## Persistência

Modelo: `CategoryMonthlyLimit`.

Migration entregue: `20260830204000_add_category_monthly_limits`.

Persistido:

- `amount`: valor do limite em centavos;
- chaves de usuário, categoria, ano e mês.

Não são persistidos:

- realizado;
- restante;
- percentual consumido.

Esses valores são calculados a partir das transações concretas no momento da leitura.

A migration é aditiva e possui unicidade por usuário/categoria/ano/mês, índices de período, constraints de valor/mês e FKs com `ON DELETE CASCADE`.

## API

Endpoint: `/api/category-limits`.

### `GET`

```text
year=2028&month=4
```

Retorna categorias de despesa do usuário com limite definido ou `null`, realizado, restante e percentual consumido.

### `PUT`

```json
{
  "categoryId": "uuid",
  "year": 2028,
  "month": 4,
  "amount": 100000
}
```

Cria ou atualiza o limite do período. Categorias de receita e categorias pertencentes a outro usuário são rejeitadas.

### `DELETE`

```text
categoryId=uuid&year=2028&month=4
```

Remove somente o limite daquele período. Nenhuma transação é alterada.

## UX

A configuração fica na página de Categorias em painel compacto e responsivo.

Cada categoria de despesa pode exibir:

- limite;
- realizado;
- restante;
- percentual consumido;
- estado textual (`Sem limite definido`, `Dentro do limite`, atenção ou excedido);
- ação de definir/editar;
- remoção com confirmação explícita.

A informação de atenção/excedido não depende apenas de cor. A preferência `showValues=false` continua ocultando valores financeiros.

## Multi-moeda

A implementação não introduz moeda-base ou conversão cambial. Se uma categoria possuir transações associadas a contas de moedas diferentes, a semântica correta do agregado ainda depende da decisão de domínio da #198.

Nenhuma taxa de câmbio deve ser inferida ou inventada neste contrato.

## Cobertura e validação da entrega

A #153 registra cobertura para:

- unicidade por usuário/categoria/mês;
- categoria `INCOME` e ownership externo;
- realizado somente com `COMPLETED` no período correto;
- exclusão de `PENDING`/`CANCELLED`;
- virada de mês/ano;
- remoção sem alterar transações;
- bloqueio da mudança de categoria com limite para `INCOME`;
- isolamento entre usuários.

Evidência histórica da entrega:

- PR #193;
- head validado `f3fc86bf6bfad3c2e3d8974d6fdb7b9197c70bda`;
- CI #148: ✅;
- Lighthouse #110: ✅;
- frontend budget: ✅;
- migration aplicada e `prisma migrate status` saudável antes da promoção do código.

O Preview daquele PR ficou limitado pela cota externa `api-deployments-free-per-day`; isso foi registrado sem workaround artificial.

Refs #153, #136, #163, #172, #198 e PR #193.
