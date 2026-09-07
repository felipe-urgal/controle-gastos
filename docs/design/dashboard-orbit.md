# Dashboard Orbit (#293)

Status: **correção mobile #374 em implementação na PR #375; QA visual pós-integração permanece na #342**.

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

## Correção mobile #374 / PR #375

A validação manual em produção identificou desvios que ainda alongavam e descaracterizavam a composição mobile aprovada. A correção #374 trata especificamente esses findings sem reabrir o redesign:

- `/dashboard` deixa de renderizar o `ForecastPanel` legado inline depois do Dashboard Orbit; a projeção permanece acessível por progressive disclosure/dialog a partir dos controles Orbit;
- o disclosure reutiliza a visualização real de Forecast, preservando moeda, horizontes **30/60/90 dias**, saldos realizado/projetado, menor saldo, pendências vencidas e próximos lançamentos sem recolocar essa seção no fluxo principal da página;
- as posições dos pontos do Mapa do mês passam a seguir as medidas do protótipo para mobile e desktop;
- nenhum ponto do mapa fica selecionado por padrão; o contexto aparece somente após interação explícita;
- o estado ativo das visões internas usa o token roxo Orbit, sem reutilizar o `--primary-subtle` financeiro legado;
- a troca interna de visão retorna ao topo e respeita `prefers-reduced-motion`;
- `Gastos` recupera a terceira área de **Leitura rápida**;
- `Limites` recupera **Projeção** e **Recomendação**, usando somente o contrato real de Forecast;
- `Contas` recupera a composição em três blocos. Como o contrato mensal do Dashboard não expõe movimentos recentes por conta, essa região mantém a estrutura aprovada com acesso explícito à rota de contas em vez de inventar movimentações;
- skeleton/estado de carregamento acompanha as alturas responsivas do hero aprovado.

A PR #375 só pode sair de draft depois de `pnpm check`, auto code review do head final e comparação visual real em 320px, mobile comum e desktop.

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
