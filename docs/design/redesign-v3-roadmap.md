# Redesign v3 — Roadmap de Design, Mobile e Acessibilidade

Status: **em execução — somente QA final #253 permanece ativo**  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data de abertura: **2026-09-02**  
Baseline visual: `docs/design/redesign-v2-spec.md`  
Auditoria: `docs/quality/redesign-v3-audit.md`  
QA final: `docs/quality/redesign-v3-final-253.md`

## 1. Objetivo

O Redesign v3 evolui o layout real atual com foco em mobile-first, consistência e acessibilidade WCAG 2.2 AA, sem reabrir regras financeiras, ownership, API, schema ou migrations.

Contratos preservados:

- dark como identidade principal, light funcional;
- texto base >=16px e secundário >=14px;
- target crítico interno ~44x44px ou maior;
- foco visível e previsível;
- safe-area em mobile;
- `prefers-reduced-motion`;
- sem reduzir fonte apenas para fazer conteúdo caber;
- HTML semântico e acessibilidade como requisito funcional.

## 2. Estado atual das issues

| Issue | Escopo | Evidência principal | Estado |
| --- | --- | --- | --- |
| #246 | Auditoria/baseline | `redesign-v3-audit.md` + reconciliação #246/#252 | **reconciliada; fecha no PR atual** |
| #247 | App shell/mobile | PR #260 + multi-engine | **fechada no PR #273** |
| #248 | Filtros/foco | PR #262 | **concluída** |
| #249 | Touch targets/primitives | PR #263 + multi-engine | **fechada no PR #273** |
| #250 | Reflow/densidade | PR #264 + multi-engine | **fechada no PR #274** |
| #251 | Formulários/autenticação | PR #266 + multi-engine | **fechada no PR #274** |
| #252 | Contraste/estados | PR #268 + `redesign-v3-contrast-252.md` | **reconciliada; fecha no PR atual** |
| #253 | QA final | PRs #271/#272 + ledger final | **única etapa ativa** |

## 3. Reconciliações por frente

### Foundation — #247/#249

PR #273 / `docs/quality/redesign-v3-foundation-247-249.md`.

Implementação concluída e pendências físicas transferidas para #253.

### Fluxos críticos — #250/#251

PR #274 / `docs/quality/redesign-v3-flows-250-251.md`.

Reflow, tipografia, formulários, erros/foco e hints de entrada estão protegidos por regressões; zoom real, teclado virtual, password manager, AT e device QA ficaram em #253.

### Auditoria e contraste — #246/#252

Reconciliação: `docs/quality/redesign-v3-audit-contrast-246-252.md`.

- a #246 cumpriu a função de baseline, inventário, classificação e distribuição dos findings;
- a #252 tratou os findings determinísticos de contraste, bordas funcionais, estados semânticos e mensagens dinâmicas;
- a suíte posterior permaneceu verde em Chromium/Firefox/WebKit;
- inspeção visual, AT, Safari/device e zoom real continuam exclusivamente em #253.

A auditoria original permanece histórica; não é reescrita para simular validações que não existiam na baseline.

## 4. Evidência automatizada do QA final

### PR #271

- matriz E2E Chromium/Firefox/WebKit;
- correção da invocação por projeto;
- correção da política de cookie `Secure` no HTTP local do E2E;
- CI #322, E2E #109 nos três engines e Lighthouse #250 verdes.

### PR #272

- tipografia financeira mobile >=14px protegida por estilo computado;
- CI #325;
- E2E #112 em Chromium/Firefox/WebKit;
- Lighthouse #253;
- frontend budget verde;
- auto-review final no mesmo head.

WebKit/Linux é evidência de engine e não equivale a Safari/iOS/macOS real.

## 5. Matriz que continua manual/externa em #253

Não marcar como concluída sem evidência real:

- keyboard-only ponta a ponta;
- foco não-obscurecido em contexto real;
- zoom 200%;
- text spacing;
- dark/light visual completo;
- Safari real;
- iOS/Android com teclado virtual e safe-area;
- password managers reais;
- reader/AT smoke test;
- portrait/landscape em device real;
- bordas/ícones cuja conformidade dependa da função visual contextual.

## 6. Roadmap por fases

| Fase | Issues | Estado |
| --- | --- | --- |
| 0 — Auditoria | #246 | baseline concluído; reconciliação pronta para merge |
| 1 — Foundation | #247–#249 | **concluída** |
| 2 — Fluxos críticos | #250–#252 | implementações concluídas; #252 pronta para fechamento na reconciliação atual |
| 3 — QA | #253 | **em execução** |

## 7. Checklist atual

- [x] #247 — app shell/mobile — PR #273
- [x] #248 — filtros/overlays/foco — PR #262
- [x] #249 — touch targets/primitives — PR #273
- [x] #250 — reflow/densidade — PR #274
- [x] #251 — formulários/autenticação — PR #274
- [ ] #246 — mergear reconciliação atual
- [ ] #252 — mergear reconciliação atual
- [ ] #253 — registrar matriz final realmente disponível e reconciliar limitações
- [ ] #245 — encerrar somente após decisão final da #253
- [x] docs de foundation consolidados
- [x] docs de fluxos críticos consolidados
- [x] doc de auditoria/contraste consolidado
- [x] ledger #253 sincronizado com as reconciliações

## 8. Critério de fechamento

O roadmap #245 só deve fechar quando:

- #246–#252 estiverem concluídas ou justificadas explicitamente;
- nenhum finding P0/P1 conhecido permanecer sem issue/justificativa;
- evidências automatizadas estiverem verdes nos heads relevantes;
- a matriz manual efetivamente disponível estiver registrada;
- validações não executadas permanecerem descritas como limitações, nunca como sucesso inferido;
- `docs/quality/redesign-v3-final-253.md` e este roadmap refletirem o mesmo estado.

Conformidade WCAG integral não pode ser inferida apenas de CI, Lighthouse, Playwright ou WebKit em runner Linux.

## 9. Rastreabilidade

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
- Reconciliação #246/#252: `docs/quality/redesign-v3-audit-contrast-246-252.md`
- QA final: #253 / PRs #271 e #272 / `docs/quality/redesign-v3-final-253.md`

Este documento registra evidência observada e decisões de tracking. Hipóteses, score automatizado ou engine emulada não são promovidos a validação física sem evidência correspondente.
