# Redesign v3 — Reflow e densidade das páginas financeiras (#250)

Status: **implementação automatizável em validação**  
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

Os gates do head final serão registrados no PR e nesta documentação quando disponíveis.

## O que esta entrega não declara como validado

Permanecem explicitamente pendentes de validação interativa/manual, sem inferência a partir do E2E:

- zoom de navegador em 200%;
- text spacing completo conforme WCAG;
- Firefox/WebKit-Safari quando a matriz exigir comportamento específico;
- orientação landscape;
- dispositivo mobile real;
- teclado virtual;
- leitor de tela.

Esses itens continuam rastreados na #250 e no gate final #253. O E2E em viewport de 320px é evidência de reflow do layout, não substituto para essas validações.

## Critério de review deste PR

- nenhuma informação/ação essencial deve depender de truncation para caber em 320px;
- o documento não deve ganhar overflow horizontal evitável nas rotas financeiras cobertas;
- texto secundário visível novo/ajustado deve permanecer >=14px;
- a navegação inferior não deve cobrir a ação sticky da importação;
- desktop deve preservar a densidade do Dark Command Center sem regressão gratuita.

Refs #245, #246, #250, #252 e #253.
