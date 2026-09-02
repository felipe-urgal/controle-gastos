# ADR 0002 — Agregados financeiros separados por moeda, sem conversão

## Status

**Aceito.**  
Data: **2026-09-02**.  
Issue: **#198**.

## Contexto

O domínio aceita contas em `BRL`, `USD` e `EUR`. Até esta decisão, alguns agregados de leitura podiam somar valores de contas em moedas diferentes como se todas compartilhassem a mesma unidade monetária.

Esse comportamento não representa conversão cambial: `10000` centavos de BRL e `10000` centavos de USD são valores distintos e não podem formar um total financeiro único sem uma taxa, uma data de referência, uma fonte de cotação e uma política de arredondamento explícitas.

A lacuna afetava principalmente:

- resumo da listagem de transações;
- Calendário mensal e diário;
- Dashboard mensal e comparação entre períodos;
- despesas por categoria;
- limites mensais por categoria.

## Decisão

O produto **não terá moeda-base nem conversão automática nesta etapa**.

Todo agregado financeiro que possa cruzar contas será separado por moeda.

### Regras gerais

- moedas suportadas: `BRL`, `USD` e `EUR`;
- nenhuma taxa de câmbio é inferida, buscada ou inventada;
- valores continuam inteiros na menor unidade da moeda;
- `COMPLETED` continua sendo o único status que participa do realizado;
- `PENDING` e `CANCELLED` continuam fora dos agregados realizados;
- comparações entre períodos comparam sempre a mesma moeda;
- percentuais de categoria são calculados contra o total de despesas da mesma moeda;
- saldos de conta continuam independentes e identificados pela moeda da própria conta.

### Listagem de transações e Calendário

Resumos que podem conter várias contas retornam uma coleção de totais por moeda:

```ts
{
  currency: 'BRL' | 'USD' | 'EUR'
  income: number
  expense: number
  balance: number
}
```

A UI apresenta cada moeda separadamente. Não existe um `grand total` transversal.

### Dashboard

O Dashboard recebe uma moeda explícita para seus agregados mensais:

```text
GET /api/dashboard?year=2028&month=4&currency=BRL
```

Resumo, comparação com o mês anterior, despesas por categoria, fluxo dos últimos seis meses e limites são calculados somente para contas da moeda selecionada.

A lista de saldos de contas continua exibindo cada conta em sua própria moeda e não soma esses saldos entre si.

### Limites mensais

Um limite passa a ser identificado por:

```text
userId + categoryId + year + month + currency
```

Assim, a mesma categoria pode possuir limites independentes em BRL, USD e EUR no mesmo período.

O realizado de um limite considera somente transações `EXPENSE + COMPLETED` da categoria, no período e em contas da mesma moeda do limite.

Limites existentes anteriores à #198 são migrados como `BRL`, preservando a semântica histórica da UI, que os formatava implicitamente como reais.

## Persistência e deploy

A migration `20260902103000_add_currency_to_category_monthly_limits`:

- adiciona `currency CHAR(3) NOT NULL DEFAULT 'BRL'`;
- migra registros existentes implicitamente para BRL pelo default;
- restringe valores a `BRL`, `USD` e `EUR`;
- altera a unicidade e índices para incluir moeda.

O runtime novo depende dessa migration. A promoção deve seguir:

1. validar e aplicar a migration;
2. confirmar `prisma migrate status` saudável;
3. promover o runtime novo;
4. executar smoke/health.

Como a chave única de `CategoryMonthlyLimit` muda, não deve ser feito rollback cego para um runtime anterior depois da migration. Em caso de falha, usar forward-fix ou um plano de recuperação compatível com o schema já aplicado.

## Alternativa rejeitada: moeda-base com câmbio

Foi rejeitada nesta etapa porque exigiria decisões ainda inexistentes sobre:

- moeda-base do usuário;
- fonte de cotação;
- instante/data da taxa;
- frequência de atualização;
- tratamento de fins de semana/indisponibilidade;
- regra de arredondamento;
- auditoria/reprodutibilidade histórica.

Adicionar qualquer uma dessas regras implicitamente aumentaria complexidade e poderia produzir números financeiros enganosos.

## Consequências

### Positivas

- elimina soma silenciosa de moedas diferentes;
- não cria dependência de serviço cambial;
- mantém cálculos determinísticos e reproduzíveis;
- preserva centavos inteiros;
- permite limites coerentes para uma mesma categoria em moedas diferentes;
- mantém leitura e saldo sem nova fonte autoritativa.

### Trade-offs

- não existe patrimônio total convertido para uma única moeda;
- usuários com várias moedas alternam a moeda dos agregados no Dashboard e nos limites;
- qualquer futura moeda-base exigirá novo ADR e política cambial explícita.

## Referências

- #198 — decisão multi-moeda;
- #153 / PR #193 — limites mensais;
- #154 / PR #197 — Dashboard;
- #155 / PR #199 — importação CSV/OFX;
- [`0001-account-balance-source-of-truth.md`](0001-account-balance-source-of-truth.md).
