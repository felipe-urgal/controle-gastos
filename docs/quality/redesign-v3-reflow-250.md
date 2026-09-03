# Redesign v3 — Reflow e densidade das páginas financeiras (#250)

Status: **responsabilidade de implementação concluída; QA transversal em #253**  
Data: **2026-09-02**  
Issue: [#250](https://github.com/felipe-urgal/controle-gastos/issues/250)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Baseline: [`redesign-v3-audit.md`](redesign-v3-audit.md)

## Objetivo desta entrega

Executar a parte determinística e automatizável da #250 sem confundir viewport emulado com validação manual de zoom, text spacing ou dispositivo real.

O recorte cobre as superfícies financeiras prioritárias do Redesign v3:

- Dashboard;
- Transações e importação CSV/OFX;
- Contas;
- Categorias e limites mensais;
- Calendário.

Nenhuma regra financeira, API, autenticação, schema, migration ou contrato multi-moeda é alterado.

## Correções aplicadas

### Importação

- o indicador de etapas passa a empilhar número/label abaixo de 360px para evitar colisão em 320px;
- nome de arquivo, conta, descrição, metadados e mensagens podem quebrar linha sem ampliar o viewport;
- badges/status visíveis deixam de usar `text-xs` e passam a respeitar o mínimo interno de **14px** para texto secundário;
- valores longos podem quebrar quando necessário em vez de forçar largura horizontal;
- a barra sticky de confirmação considera `--app-mobile-bottom-nav-height` e `safe-area-inset-bottom`, permanecendo acima da navegação inferior em mobile.

As cores locais de status da importação **não** são alteradas nesta issue. A normalização semântica de cores/estados continua pertencendo à #252.

### Transações

- descrições, conta e categoria deixam de depender de truncation em mobile estreito;
- valores monetários longos podem quebrar linha abaixo do breakpoint desktop;
- cards empilham data e valor abaixo de 360px quando necessário.

### Contas

- nomes e descrições podem quebrar linha em mobile;
- saldos extensos deixam de forçar `white-space: nowrap` em telas estreitas;
- cards deixam de truncar saldo essencial.

### Categorias e limites

- nomes/descrições podem quebrar linha em mobile;
- métricas de limite usam uma coluna em 320px, duas a partir de 360px e três nos breakpoints maiores;
- valores de Limite/Realizado/Restante deixam de ser truncados e podem quebrar quando necessário.

## Regressão automatizada

`tests/e2e/financial-flow.spec.mjs` foi ampliado para:

- criar conta, categoria e transação com textos longos;
- visitar `/dashboard`, `/contas`, `/categorias`, `/calendario` e `/transacoes` em **320 CSS px**;
- exigir ausência de overflow horizontal no documento nessas rotas;
- executar um preview CSV real em `/transacoes/importar` a 320px, sem gravar transação;
- exigir ausência de overflow horizontal no preview;
- confirmar via estilo computado que o status visível usa pelo menos **14px**;
- confirmar geometricamente que a barra sticky de confirmação termina antes do início da bottom navigation.

A implementação foi integrada pelo PR #264 (merge `23f0165e`) e validada no head `1e1aa2e` com CI #292, E2E Chromium #85 e Lighthouse #226 verdes.

A matriz posterior da #253 voltou a executar a suíte E2E em Chromium, Firefox e WebKit. No head `3bb20564` do PR #272, a suíte permaneceu verde nos três engines (E2E #112), junto com CI #325, Lighthouse #253 e frontend budget.

## O que esta entrega não declara como validado

Permanecem explicitamente pendentes de validação interativa/manual, sem inferência a partir do E2E:

- zoom de navegador em 200%;
- text spacing completo conforme WCAG;
- Safari real e comportamento específico de dispositivo;
- orientação landscape;
- dispositivo mobile real;
- teclado virtual;
- leitor de tela.

Esses itens **não permanecem como responsabilidade duplicada da #250**. A partir da reconciliação final, são rastreados exclusivamente pelo gate transversal #253. O E2E em viewport de 320px é evidência de reflow do layout, não substituto para essas validações.

## Reconciliação de fechamento

A #250 pode ser encerrada como responsabilidade de implementação porque:

- a parte determinística foi integrada e protegida por regressão;
- a cobertura foi repetida posteriormente na matriz multi-engine da #253;
- não há finding P0/P1 conhecido de reflow que precise permanecer nesta issue;
- todas as validações físicas/manuais remanescentes já estão explicitamente listadas na #253.

A evidência conjunta com #251 está consolidada em `docs/quality/redesign-v3-flows-250-251.md`.

## Critério de review

- nenhuma informação/ação essencial deve depender de truncation para caber em 320px;
- o documento não deve ganhar overflow horizontal evitável nas rotas financeiras cobertas;
- texto secundário visível novo/ajustado deve permanecer >=14px;
- a navegação inferior não deve cobrir a ação sticky da importação;
- desktop deve preservar a densidade do Dark Command Center sem regressão gratuita.

Refs #245, #246, #250, #252 e #253.