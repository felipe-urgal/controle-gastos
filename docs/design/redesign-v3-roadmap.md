# Redesign v3 — Roadmap de Design, Mobile e Acessibilidade

Status: **concluído — QA final encerrado com limitações de evidência documentadas**  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data de abertura: **2026-09-02**  
Data de fechamento preparada: **2026-09-03**  
Baseline visual: `docs/design/redesign-v2-spec.md`  
Auditoria: `docs/quality/redesign-v3-audit.md`  
QA final: `docs/quality/redesign-v3-final-253.md`  
Fechamento: `docs/quality/redesign-v3-closure-245-253.md`

## 1. Objetivo

O Redesign v3 evoluiu o layout real atual com foco em mobile-first, consistência e acessibilidade WCAG 2.2 AA, sem reabrir regras financeiras, ownership, API, schema ou migrations.

Contratos preservados:

- dark como identidade principal, light funcional;
- texto base >=16px e secundário >=14px;
- target crítico interno ~44x44px ou maior;
- foco visível e previsível;
- safe-area em mobile;
- `prefers-reduced-motion`;
- sem reduzir fonte apenas para fazer conteúdo caber;
- HTML semântico e acessibilidade como requisito funcional.

## 2. Estado final das issues

| Issue | Escopo | Evidência principal | Estado final |
| --- | --- | --- | --- |
| #246 | Auditoria/baseline | `redesign-v3-audit.md` + PR #278 | **concluída** |
| #247 | App shell/mobile | PR #260 + PR #273 | **concluída** |
| #248 | Filtros/foco | PR #262 | **concluída** |
| #249 | Touch targets/primitives | PR #263 + PR #273 | **concluída** |
| #250 | Reflow/densidade | PR #264 + PR #274 | **concluída** |
| #251 | Formulários/autenticação | PR #266 + PR #274 | **concluída** |
| #252 | Contraste/estados | PR #268 + PR #278 | **concluída** |
| #253 | QA final | PRs #271/#272 + ledger/closure | **concluída com limitações de evidência documentadas** |

## 3. Entregas por fase

### Fase 0 — Auditoria

#246 produziu a baseline, inventário e classificação objetiva dos findings. Hipóteses dependentes de interação não foram promovidas a falhas confirmadas sem evidência.

### Fase 1 — Foundation

#247–#249 consolidaram:

- shell mobile e scroll spacing;
- foco dos filtros;
- targets críticos/primitives;
- estado ativo além da cor;
- regressões de foco/target/label-in-name.

Reconciliação final: PR #273 / `docs/quality/redesign-v3-foundation-247-249.md`.

### Fase 2 — Fluxos críticos

#250–#252 consolidaram:

- reflow automatizado em telas estreitas;
- conteúdo longo e tipografia mínima;
- formulários, erros e foco determinístico;
- autofill/input hints;
- contraste de texto/fronteiras funcionais;
- estados semânticos e mensagens dinâmicas acessíveis.

Reconciliações finais:

- #250/#251: PR #274 / `docs/quality/redesign-v3-flows-250-251.md`;
- #246/#252: PR #278 / `docs/quality/redesign-v3-audit-contrast-246-252.md`.

### Fase 3 — QA final

PR #271:

- matriz E2E Chromium/Firefox/WebKit;
- correção da invocação do projeto Playwright;
- correção da política `Secure` da sessão em HTTP local/TLS termination;
- CI #322, E2E #109 e Lighthouse #250 verdes.

PR #272:

- tipografia financeira mobile >=14px protegida por estilo computado;
- CI #325;
- E2E #112 em Chromium/Firefox/WebKit;
- Lighthouse #253;
- frontend budget;
- auto-review final no mesmo head.

No baseline final antes do PR de fechamento (`main` `75049b3d`), o deployment Vercel está **READY / production** e a consulta de runtime errors dos últimos 30 minutos não encontrou erros.

## 4. Limitações de evidência registradas

O fechamento não declara como aprovados itens que não foram executados de forma reproduzível:

- Safari real em macOS/iOS;
- iOS/Android com teclado virtual e safe-area física;
- password managers reais;
- VoiceOver/NVDA/TalkBack ou AT equivalente;
- keyboard-only ponta a ponta manual;
- foco não-obscurecido em todos os contextos reais;
- zoom 200% real;
- text spacing override completo;
- inspeção visual completa dark/light;
- portrait/landscape em dispositivo físico;
- bordas/ícones que dependam de função visual contextual.

WebKit/Linux é evidência de engine, não substituto de Safari/iOS real.

## 5. Checklist final

- [x] #246 — auditoria/baseline reconciliada
- [x] #247 — app shell/mobile
- [x] #248 — filtros/overlays/foco
- [x] #249 — touch targets/primitives
- [x] #250 — reflow/densidade
- [x] #251 — formulários/autenticação
- [x] #252 — contraste/estados/mensagens
- [x] #253 — QA final com limitações de evidência documentadas
- [x] documentação de foundation consolidada
- [x] documentação de fluxos críticos consolidada
- [x] auditoria/contraste reconciliados
- [x] ledger final sincronizado
- [x] decisão de fechamento registrada em `redesign-v3-closure-245-253.md`
- [x] nenhum finding P0/P1 conhecido sem owner/justificativa no tracking do v3

## 6. Critério de fechamento

O roadmap é encerrado porque:

- #246–#252 estão concluídas;
- #253 consolidou a evidência automatizada e as limitações manuais reais;
- os heads funcionais relevantes possuem gates verdes;
- nenhum finding P0/P1 conhecido permanece sem tratamento/justificativa;
- nenhuma validação física indisponível foi convertida em falso sucesso;
- o ledger e este roadmap refletem o mesmo estado.

Este fechamento **não é certificação WCAG integral**. Findings futuros de Safari real, AT, dispositivo físico, zoom/text spacing, password manager ou produção devem abrir novas issues específicas com evidência reproduzível.

## 7. Rastreabilidade

- Roadmap: #245
- Auditoria: #246 / `docs/quality/redesign-v3-audit.md`
- App shell: #247 / PR #260
- Filtros/foco: #248 / PR #262
- Touch targets: #249 / PR #263
- Reconciliação foundation: PR #273 / `docs/quality/redesign-v3-foundation-247-249.md`
- Reflow: #250 / PR #264 / `docs/quality/redesign-v3-reflow-250.md`
- Formulários: #251 / PR #266 / `docs/quality/redesign-v3-forms-251.md`
- Reconciliação #250/#251: PR #274 / `docs/quality/redesign-v3-flows-250-251.md`
- Contraste/status: #252 / PR #268 / `docs/quality/redesign-v3-contrast-252.md`
- Reconciliação #246/#252: PR #278 / `docs/quality/redesign-v3-audit-contrast-246-252.md`
- QA final: #253 / PRs #271 e #272 / `docs/quality/redesign-v3-final-253.md`
- Fechamento: `docs/quality/redesign-v3-closure-245-253.md`

Este documento registra evidência observada e decisões de tracking. Limitação de ambiente não é aprovação implícita.
