# Limites mensais por categoria

Status: **✅ base implementada na #153 / PR #193; multi-moeda implementada na #198 / PR #219**.  
Última revisão documental: **2026-09-02**.

## Objetivo

Permitir que o usuário defina valores mensais de planejamento por categoria de despesa **e por moeda**, acompanhando o realizado sem criar uma segunda fonte de verdade financeira.

## Regras de domínio

- cada limite pertence ao usuário autenticado, a uma categoria `EXPENSE`, a um ano, a um mês e a uma moeda;
- moedas suportadas: `BRL`, `USD` e `EUR`;
- existe no máximo um limite por `userId + categoryId + year + month + currency`;
- a mesma categoria pode ter limites independentes em moedas diferentes no mesmo período;
- o valor é armazenado como inteiro em centavos e precisa ser maior que zero;
- o realizado é derivado somente de `Transaction` com categoria `EXPENSE`, `status=COMPLETED`, período correspondente e conta na **mesma moeda do limite**;
- `PENDING` e `CANCELLED` não entram no realizado;
- editar ou remover um limite não altera transações, saldo ou séries;
- IDs recebidos do cliente não comprovam ownership: categoria e limite são revalidados no servidor;
- leituras de limites não geram escrita financeira;
- uma categoria com limite existente em qualquer moeda não pode ser convertida para `INCOME` sem remover os limites incompatíveis;
- não existe conversão cambial nem soma entre moedas.

A regra de saldo derivado continua em [`../adr/0001-account-balance-source-of-truth.md`](../adr/0001-account-balance-source-of-truth.md) e a decisão multi-moeda em [`../adr/0002-multi-currency-aggregates.md`](../adr/0002-multi-currency-aggregates.md).

## Persistência

Modelo: `CategoryMonthlyLimit`.

Migrations relevantes:

- `20260830204000_add_category_monthly_limits` — criação original;
- `20260902103000_add_currency_to_category_monthly_limits` — moeda explícita por limite.

Persistido:

- `amount`: valor do limite em centavos;
- `currency`: `BRL`, `USD` ou `EUR`;
- chaves de usuário, categoria, ano e mês.

Não são persistidos:

- realizado;
- restante;
- percentual consumido.

Esses valores são calculados a partir das transações concretas da mesma moeda no momento da leitura.

### Compatibilidade dos limites existentes

Antes da #198, a UI formatava limites implicitamente como BRL. A nova migration adiciona `currency NOT NULL DEFAULT 'BRL'`, então registros legados permanecem com a semântica histórica de reais.

A API também preserva clientes anteriores à #198: quando `currency` é omitida em `GET`, `PUT` ou `DELETE`, o contrato assume `BRL`. Valores explícitos fora de `BRL|USD|EUR` continuam rejeitados.

A chave única passa a incluir moeda para permitir, por exemplo, um limite BRL e outro USD para a mesma categoria/mês.

## API

Endpoint: `/api/category-limits`.

### `GET`

```text
year=2028&month=4&currency=USD
```

Retorna as categorias de despesa com o limite da moeda selecionada, realizado, restante e percentual consumido. Despesas em contas de outras moedas não entram nesses valores. Se `currency` for omitida, usa `BRL` por compatibilidade.

### `PUT`

```json
{
  "categoryId": "uuid",
  "year": 2028,
  "month": 4,
  "currency": "USD",
  "amount": 100000
}
```

Cria ou atualiza somente o limite daquela categoria/período/moeda. Categorias de receita, categorias de outro usuário e moedas fora de `BRL|USD|EUR` são rejeitadas. O campo `currency` omitido assume `BRL` por compatibilidade com o contrato anterior.

### `DELETE`

```text
categoryId=uuid&year=2028&month=4&currency=USD
```

Remove somente o limite daquela moeda. Limites da mesma categoria em outras moedas e todas as transações permanecem intactos. Se `currency` for omitida, remove o limite BRL correspondente.

## UX

A configuração fica na página de Categorias em painel compacto e responsivo.

O painel possui:

- seletor de mês/ano;
- seletor explícito de moeda;
- uma linha por categoria para a moeda selecionada;
- limite, realizado, restante e percentual consumido;
- estado textual (`Sem limite definido em USD`, `Dentro do limite`, atenção ou excedido);
- ação de definir/editar;
- remoção com confirmação explícita.

Trocar o mês ou a moeda cancela uma edição/remoção local ainda não confirmada. Durante uma gravação ou remoção em andamento, os seletores e demais ações ficam bloqueados para não aplicar o resultado em um contexto diferente do visível.

A informação de atenção/excedido não depende apenas de cor. A preferência `showValues=false` continua ocultando valores financeiros.

## Deploy da migration multi-moeda

O runtime novo depende da coluna `currency` e da nova chave única. A promoção deve seguir migration → `prisma migrate status` → runtime novo → smoke/health.

Depois da migration, não deve haver rollback cego para um runtime anterior que ainda conhece a chave única antiga; usar forward-fix ou plano compatível.

## Cobertura

A cobertura multi-moeda do PR #219 valida:

- realizado separado por moeda;
- dois limites para a mesma categoria/mês em moedas distintas;
- upsert isolado por moeda;
- fallback BRL para contratos legados sem `currency`;
- rejeição de moeda não suportada;
- categoria `INCOME` e ownership externo;
- exclusão de `PENDING`/`CANCELLED`;
- remoção de uma moeda sem remover outra nem transações;
- bloqueio da mudança de categoria com limite para `INCOME`;
- isolamento entre usuários.

Evidência histórica da base #153:

- PR #193;
- head `f3fc86bf6bfad3c2e3d8974d6fdb7b9197c70bda`;
- CI #148: ✅;
- Lighthouse #110: ✅;
- frontend budget: ✅.

Refs #153, #198, PR #219 e ADR 0002.
