# Redesign v3 — QA final da issue #253

Status: **concluído com limitações de evidência documentadas**  
Issue: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Fechamento: `docs/quality/redesign-v3-closure-245-253.md`  
Baseline inicial: `e8c6a0487caac10fce41d72d41ce7abf025c3ab4`  
Baseline final antes do PR de fechamento: `75049b3dd13ca1785d6274952f379abca64a4df8`

## 1. Objetivo e decisão final

A #253 consolidou o QA final do Redesign v3 separando evidência automatizada de validação física/manual.

O gate é encerrado porque:

- todas as issues filhas #246–#252 foram implementadas/reconciliadas;
- findings determinísticos reproduzíveis encontrados durante o QA foram corrigidos;
- nenhum finding P0/P1 conhecido permanece sem owner ou justificativa no tracking do v3;
- CI, E2E multi-engine, Lighthouse e frontend budget relevantes estão verdes nos heads funcionais de referência;
- limitações de hardware/AT/browser real permanecem explicitamente registradas como **não executadas**, não como aprovadas.

O encerramento da #253 não representa certificação WCAG integral.

## 2. Evidência automatizada consolidada

### PR #271 — matriz multi-engine

O Playwright/GitHub Actions passou a executar Chromium, Firefox e WebKit em jobs independentes.

Durante esse trabalho foram corrigidos dois findings reais:

1. invocação incorreta do projeto Playwright por causa de um `--` extra;
2. cookie `Secure` baseado apenas em `NODE_ENV=production`, que impedia persistência de sessão no WebKit sobre HTTP local de E2E.

Head final `a9f68a34`:

- ✅ CI #322;
- ✅ E2E #109 / Chromium;
- ✅ E2E #109 / Firefox;
- ✅ E2E #109 / WebKit;
- ✅ Lighthouse #250.

### PR #272 — consistência tipográfica mobile

Corrigiu usos de `text-xs` em conteúdo financeiro visível do Dashboard/Transações e adicionou regressão por `font-size` computado >=14px em 320px.

Head final `3bb20564`:

- ✅ CI #325;
- ✅ E2E #112 / Chromium;
- ✅ E2E #112 / Firefox;
- ✅ E2E #112 / WebKit;
- ✅ Lighthouse #253;
- ✅ frontend budget;
- ✅ auto-review final sem findings bloqueantes conhecidos.

WebKit/Linux é evidência de engine e não equivale a Safari/iOS/macOS real.

## 3. Reconciliações concluídas

### #247 / #249 — Foundation

PR #273 / `docs/quality/redesign-v3-foundation-247-249.md`.

Concluídos:

- shell mobile e scroll spacing;
- targets críticos e primitives prioritárias;
- estado ativo além da cor;
- label-in-name do calendário reproduzido contextualmente;
- cobertura posterior Chromium/Firefox/WebKit.

### #250 / #251 — Fluxos críticos

PR #274 / `docs/quality/redesign-v3-flows-250-251.md`.

Concluídos:

- reflow automatizado e ausência de overflow horizontal evitável nas superfícies cobertas;
- conteúdo longo e tipografia mínima;
- contrato de labels/erros/foco dos formulários;
- autofill/input hints e inputs nativos;
- cobertura posterior Chromium/Firefox/WebKit.

### #246 / #252 — Auditoria, contraste e estados

PR #278 / `docs/quality/redesign-v3-audit-contrast-246-252.md`.

A #246 cumpriu a responsabilidade de baseline ao inventariar superfícies, classificar findings e distribuí-los para as issues filhas.

A #252 tratou os findings determinísticos de contraste/estados:

- `text-subtle` claro >=4.5:1 nas superfícies suportadas;
- `border-strong` >=3:1 quando identifica controles;
- estados da importação em tokens semânticos, com pistas textuais;
- live regions `status/polite` para atualizações relevantes;
- regressões de contraste e status.

Head final da implementação #252 (`38ed0ef4`):

- ✅ CI #308;
- ✅ E2E Chromium #97;
- ✅ Lighthouse #238;
- ✅ auto-review final após correção do live region.

A suíte posterior permaneceu verde na matriz Chromium/Firefox/WebKit do E2E #112.

## 4. Produção observável no fechamento

O deployment da `main` no SHA `75049b3d` está **READY** com target **production** na Vercel.

Domínio principal configurado: `controle-gastos-pessoal.vercel.app`.

A consulta de runtime errors dos últimos 30 minutos no momento do fechamento não encontrou erros.

Nas últimas 24 horas havia um único `DeprecationWarning` do `pg` em `/api/transactions/[id]`, originado em deployment anterior. Não há evidência de crash associado e o warning não pertence ao escopo de UI/acessibilidade do Redesign v3.

## 5. Limitações de evidência — não aprovadas

Não foram executadas de forma reproduzível nesta rodada e, portanto, **não recebem check de aprovação**:

- keyboard-only ponta a ponta manual nas rotas críticas;
- ordem de foco/foco não-obscurecido em todos os contextos sticky/fixed reais;
- zoom real de navegador em 200%;
- text spacing override completo;
- inspeção visual completa dark/light;
- Safari real em macOS/iOS;
- iOS/Android com teclado virtual e safe-area física;
- password managers reais;
- VoiceOver/NVDA/TalkBack ou reader/AT equivalente real;
- portrait/landscape em dispositivo físico;
- classificação contextual de bordas/ícones dependente de função visual real.

Esses itens são **limitações de evidência**, não resultados positivos inferidos.

## 6. Estado final de tracking

- #246 — concluída pelo PR #278;
- #247 — concluída pelo PR #273;
- #248 — concluída pelo PR #262;
- #249 — concluída pelo PR #273;
- #250 — concluída pelo PR #274;
- #251 — concluída pelo PR #274;
- #252 — concluída pelo PR #278;
- #253 — fechamento preparado neste PR final;
- #245 — fechamento preparado no mesmo PR final.

## 7. Regra para findings futuros

Findings provenientes de Safari real, AT, dispositivo físico, zoom/text spacing, password manager ou uso real de produção devem abrir **novas issues específicas** com evidência reproduzível.

Não reabrir silenciosamente o escopo histórico do Redesign v3 nem reinterpretar limitações deste ledger como validações já concluídas.

## 8. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-foundation-247-249.md`
- `docs/quality/redesign-v3-flows-250-251.md`
- `docs/quality/redesign-v3-audit-contrast-246-252.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/redesign-v3-closure-245-253.md`
- `docs/quality/e2e-playwright.md`
- PRs #271, #272, #273, #274 e #278
- Issues #245 e #253
