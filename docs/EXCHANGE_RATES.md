# Câmbio / Taxas de conversão

Contrato vigente do subsistema. Taxa é persistida como razão inteira
`numerator/denominator`; conversão usa `BigInt` com arredondamento explícito para
centavos. Nenhuma conversão acontece sem o usuário escolher uma moeda base.

## Resolvers por finalidade

Não existe resolver genérico: cada consumidor declara sua finalidade.

| | Patrimônio (`patrimony-rate-resolver.ts`) | Fiscal exterior (`fiscal-ptax-resolver.ts`) |
|---|---|---|
| Fontes | `MANUAL` e `BCB_PTAX` | somente `BCB_PTAX` direta `moeda → BRL` |
| Lado | SELL por padrão (BUY/SELL explícito) | BUY/SELL exato do evento |
| Data | `<= asOf` (mês atual: hoje UTC; mês fechado: último dia) | `<= data do evento`, lookback máx. 10 dias |
| Inversa | derivada (`B→A = d/n`), sem persistir | nunca |
| Cross rate | aceita como referência indicativa | nunca |
| Ausência | `missingRates`, `total = null` | `MISSING_PTAX` (apuração `PENDING`) |

- Na mesma data o Patrimônio prefere direta > inversa e `MANUAL` > `BCB_PTAX`;
  quando `MANUAL` vence havendo PTAX na data, `resolution.overridesPtax = true` e a UI
  exibe "Override manual em uso". Para usar a PTAX, exclua a taxa manual.
- Frescor: idade em dias (`ageDays`); até 7 dias = `CURRENT`, acima = `STALE`
  (`consolidation.stale = true`, total tratado como estimativa).
- Soma consolidada usa `checkedSumCents` (erro de domínio fora do inteiro seguro).
- Cross rate (ex.: USD→EUR) é salva como `BCB_PTAX`, mas `provenance = PTAX_CROSS`
  (derivada de USD/BRL e EUR/BRL, mesmo `quoteSide` nas duas pernas); é conversão de
  referência, não cotação executável.
- Taxa com data futura é rejeitada (manual e PTAX) contra a data lógica UTC.
- `MANUAL` é editável in-place (upsert) e recalcula históricos; `updatedAt` é exposto.

## API

- `GET /api/exchange-rates`: `page`, `limit`, `from`, `to`, `source`, `quoteSide`,
  `dateFrom`, `dateTo` (`YYYY-MM-DD`), com `total` real.
- `POST /api/exchange-rates/ptax`: rate limit por usuário (`PTAX_RATE_LIMITED`, 429 +
  `Retry-After`). Erros do BCB: `INVALID_INPUT` 400, `NO_QUOTE_IN_LOOKBACK` 404,
  `UPSTREAM_RATE_LIMIT` 429, `INVALID_UPSTREAM_PAYLOAD` 502,
  `UPSTREAM_UNAVAILABLE` 503, `UPSTREAM_TIMEOUT` 504. No máximo 2 tentativas
  (só 5xx/rede/timeout; 429 não é reenviado) e consultas simultâneas idênticas são
  compartilhadas.
- `POST /api/investments/taxes/foreign/ptax`: rate limit próprio; busca com
  concorrência limitada (4) e sucesso parcial com lista de falhas.

## Decisão pendente

Cache global de PTAX (hoje `BCB_PTAX` é duplicado por usuário) só será avaliado com
medição de volume.
