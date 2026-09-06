# Dashboard Orbit (#293)

Status: **integrado em `main`; fidelidade ao protótipo aprovado em correção pela #354 após finding da QA #342**.

> A auditoria estática da #342 detectou divergências de composição entre o protótipo aprovado e a implementação integrada. Este documento continua registrando os contratos da rota; ele não deve ser usado como evidência de validação visual concluída até a correção #354 e a matriz manual final.

## Fonte visual normativa

O protótipo `ux/293-dashboard-orbit-prototype` em `prototypes/293-dashboard-orbit/index.html` é a **especificação visual normativa** desta rota.

A implementação final deve reproduzir o que foi desenhado: hierarquia, ordem dos blocos, proporções, densidade, espaçamentos, superfícies, `Resumo / Gastos / Limites / Contas`, Mapa do mês, rail/contexto lateral, drill-down e comportamento responsivo.

Não basta ficar “próximo”, “equivalente” ou preservar apenas a intenção. Componentes legados podem ser substituídos, novos componentes podem ser criados e bibliotecas podem ser atualizadas/adicionadas quando necessário para alcançar a paridade aprovada com qualidade de produção.

Qualquer diferença inevitável deve ser documentada na #354 antes do merge, com motivo e impacto visual. Dados demonstrativos sem contrato real não autorizam inventar feature financeira.

Este documento registra a composição do Dashboard após a fundação Orbit da #302. O contrato funcional e as invariantes financeiras continuam definidos por `AGENTS.md`, pelos serviços de Dashboard e por `docs/product/monthly-dashboard.md`.

## Composição aprovada

A rota deve reproduzir as camadas do protótipo aprovado:

1. **contexto do período** — mês e moeda dos agregados no topo aprovado;
2. **navegação interna** — `Resumo / Gastos / Limites / Contas`;
3. **Mapa do mês** — hero Orbit e superfície de exploração com dados reais;
4. **rail/contexto** — leitura complementar e atenção, somente com informações suportadas pelo produto;
5. **fluxo e detalhes secundários** — conteúdo abaixo do hero conforme a organização aprovada.

O mapa deve possuir interação real e também representação textual/navegável para que a informação não dependa da geometria visual.

## Regras preservadas

- apenas transações `COMPLETED` alimentam os agregados realizados;
- `PENDING` e `CANCELLED` não passam a compor saldo/realizado por causa da nova UI;
- BRL, USD e EUR não são somados nem convertidos;
- os agregados respeitam a moeda selecionada;
- saldos de contas são exibidos individualmente na moeda própria;
- `showValues=false` mascara todos os valores monetários da composição;
- leitura do Dashboard continua sem writes;
- categoria continua sendo a fonte de verdade do tipo financeiro.

## Deliberadamente fora desta entrega

O protótipo da #293 apresenta conceitos que ainda podem não possuir contrato de produto suficiente. Eles não devem ser inventados apenas para preencher o desenho:

- saldo projetado/forecast sem contrato real;
- ritmo ideal de gasto diário sem regra definida;
- próximos compromissos derivados de projeção;
- insights ou alertas inventados;
- agregação entre moedas.

Quando um dado demonstrativo não existir, preservar a composição com dado real, estado vazio ou ausência explícita, sem alterar a regra financeira.

## Acessibilidade e responsividade

- a visualização orbital não contém informação exclusiva;
- destinos e nodes permanecem operáveis por teclado e possuem foco visível;
- valores longos podem quebrar linha sem reduzir tipografia;
- mobile deve reproduzir a solução aprovada, e não apenas empilhar ou encolher o desktop;
- cores financeiras continuam acompanhadas de rótulos/texto;
- 320px deve ser validado contra o protótipo sem colisões ou sobreposição.

## Validação

A entrega só deve ser considerada concluída depois de:

- comparação visual lado a lado com o protótipo aprovado em desktop e breakpoints mobile;
- confirmação de paridade de hierarquia, agrupamento, proporções e interação;
- documentação prévia de qualquer diferença inevitável;
- `pnpm check` no head final;
- auto code review completo no head final;
- revisão visual manual em desktop, 320px e mobile comum;
- atualização da issue #354 com o resultado real dos gates;
- registro da evidência final em `docs/quality/orbit-first-wave-qa.md`.
