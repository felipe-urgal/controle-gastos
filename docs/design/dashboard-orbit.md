# Dashboard Orbit (#293)

Status: **correção de fidelidade implementada na PR #363; gate técnico verde no head final. QA visual pós-integração permanece na #342**.

## Fonte visual normativa

O protótipo `ux/293-dashboard-orbit-prototype` em `prototypes/293-dashboard-orbit/index.html` é a especificação visual normativa desta rota.

A implementação deve reproduzir hierarquia, ordem, proporções, densidade, superfícies, navegação `Resumo / Gastos / Limites / Contas`, Mapa do mês, rail/contexto lateral, drill-down e comportamento responsivo, sem inventar semântica financeira.

## Correção #354 / PR #363

A correção restaura:

- header compacto com período e moeda;
- navegação interna `Resumo / Gastos / Limites / Contas`;
- Mapa do mês como hero Orbit com pontos interativos baseados em dados reais;
- composição mobile própria, sem comprimir a geometria desktop;
- progressive disclosure das visões;
- rail de leitura com **Saldo projetado**, **Ritmo do mês**, atenção e próximos compromissos quando houver contrato real.

### Forecast é contrato real

Durante o review final foi confirmado que o produto já possui `/api/forecast`, `forecastService`, `useForecast`, tipos próprios e painel de projeção. Portanto Forecast deixou de ser tratado como dado demonstrativo indisponível.

A PR #363 usa somente esse contrato real para saldo projetado, atenção e próximos compromissos. A visualização continua read-only e não materializa ocorrências nem altera o realizado.

`Ritmo do mês` é uma leitura derivada do realizado e dos limites já existentes; não cria meta financeira nova nem mistura moedas.

## Regras preservadas

- apenas transações `COMPLETED` alimentam agregados realizados;
- `PENDING` e `CANCELLED` não entram silenciosamente no realizado;
- BRL, USD e EUR não são somados nem convertidos;
- os agregados respeitam a moeda selecionada;
- saldos de contas usam a moeda própria;
- `showValues=false` mascara todos os valores monetários;
- Dashboard e Forecast permanecem somente leitura;
- categoria continua sendo a fonte de verdade do tipo financeiro.

## Continua fora do contrato

O protótipo não autoriza inventar:

- insights sem regra de produto;
- metas de gasto não derivadas dos limites existentes;
- conversão cambial;
- writes disparados por navegação ou exploração do mapa.

## Validação

O head final da PR #363 passou `pnpm check` no CI. A revisão estática não encontrou regressão financeira conhecida após as correções.

Ainda é obrigatório na #342, após integração:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.