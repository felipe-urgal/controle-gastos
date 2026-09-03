# Redesign v3 — QA final da issue #253

Status: **em execução — todas as issues de implementação reconciliadas; matriz manual permanece**  
Issue: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Branch inicial: `qa/redesign-v3-final-253`  
Baseline inicial de `main`: `e8c6a0487caac10fce41d72d41ce7abf025c3ab4`

## 1. Objetivo

Consolidar o QA final do Redesign v3 sem confundir automação com validação física. A #253 é o único gate transversal das pendências que dependem de interação real, tecnologia assistiva, navegador/dispositivo físico, zoom e inspeção contextual.

As responsabilidades determinísticas das fases anteriores já foram implementadas e reconciliadas. O trabalho restante não deve ser duplicado nas issues filhas.

## 2. Evidência automatizada consolidada

### PR #271 — matriz multi-engine

O Playwright/GitHub Actions passou a executar a suíte em:

- Chromium;
- Firefox;
- WebKit;
- jobs independentes com `fail-fast: false`;
- PostgreSQL efêmero por engine;
- artefatos separados.

Durante esse trabalho foram corrigidos dois findings reais de infraestrutura/E2E:

1. invocação incorreta do projeto Playwright por causa de um `--` extra;
2. cookie `Secure` baseado somente em `NODE_ENV=production`, que impedia persistência de sessão no WebKit sobre HTTP local de E2E.

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

Reconciliação: PR #273 / `docs/quality/redesign-v3-foundation-247-249.md`.

Responsabilidades concluídas:

- shell mobile e scroll spacing;
- targets críticos e primitives prioritárias;
- estado ativo além da cor;
- label-in-name do calendário reproduzido contextualmente;
- cobertura posterior Chromium/Firefox/WebKit.

QA físico/manual transferido para #253.

### #250 / #251 — Fluxos críticos

Reconciliação: PR #274 / `docs/quality/redesign-v3-flows-250-251.md`.

Responsabilidades concluídas:

- reflow automatizado e ausência de overflow horizontal evitável nas superfícies cobertas;
- conteúdo longo e tipografia mínima;
- contrato de labels/erros/foco dos formulários;
- autofill/input hints e inputs nativos;
- cobertura posterior Chromium/Firefox/WebKit.

Zoom real, teclado virtual, safe-area física, password manager, AT e device QA ficaram exclusivamente em #253.

### #246 / #252 — Auditoria, contraste e estados

Reconciliação: `docs/quality/redesign-v3-audit-contrast-246-252.md`.

A #246 cumpriu a responsabilidade de baseline ao inventariar superfícies, classificar findings e distribuí-los para as issues filhas sem promover hipóteses a falhas confirmadas.

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

A suíte posterior também permaneceu verde na matriz Chromium/Firefox/WebKit do E2E #112.

A reconciliação permite encerrar #246 e #252 sem afirmar que inspeção visual, reader/AT, Safari/device ou zoom real foram concluídos.

## 4. Matriz que continua manual/externa

Não marcar como concluído sem evidência real:

- keyboard-only ponta a ponta nas rotas críticas;
- ordem de foco previsível e foco visível em contexto real;
- foco não-obscurecido por sticky/fixed UI;
- zoom 200%;
- text spacing completo;
- dark/light visual completo;
- Safari real;
- iOS/Android com teclado virtual e safe-area física;
- password managers reais;
- reader/AT smoke test;
- portrait/landscape em dispositivo real;
- classificação contextual de bordas/ícones que dependa da função visual real.

## 5. Estado de tracking após esta reconciliação

- #247 — fechada pelo PR #273;
- #248 — concluída pelo PR #262;
- #249 — fechada pelo PR #273;
- #250 — fechada pelo PR #274;
- #251 — fechada pelo PR #274;
- #246 — pronta para fechamento pela reconciliação atual;
- #252 — pronta para fechamento pela reconciliação atual;
- #253 — permanece aberta como gate final;
- #245 — permanece aberto até a decisão final baseada na evidência disponível da #253.

## 6. Critério para encerrar #253 / #245

O fechamento só deve ocorrer quando:

- nenhum finding P0/P1 conhecido permanecer sem issue explícita e justificativa;
- a evidência automatizada estiver verde no head relevante;
- a matriz manual disponível estiver registrada com limitações reais;
- validações não executadas estiverem explicitamente marcadas como indisponíveis/pendentes, sem serem promovidas a sucesso;
- o roadmap e este ledger refletirem o mesmo estado;
- o auto-review final tiver sido executado no head que será mergeado quando houver novo diff funcional.

A ausência de hardware/AT/browser real não autoriza afirmar conformidade WCAG integral.

## 7. Próximos passos

1. mergear a reconciliação de #246/#252 após CI/review do head documental;
2. registrar na #253 apenas a matriz manual efetivamente disponível;
3. reconciliar o resultado final no roadmap #245;
4. decidir o fechamento de #253/#245 com base na evidência real e limitações explícitas.

## 8. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-foundation-247-249.md`
- `docs/quality/redesign-v3-flows-250-251.md`
- `docs/quality/redesign-v3-audit-contrast-246-252.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/e2e-playwright.md`
- Issues #245, #246, #252 e #253
- PRs #271, #272, #273 e #274
