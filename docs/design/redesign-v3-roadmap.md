# Redesign v3 — Roadmap de Design, Mobile e Acessibilidade

Status: **em execução — QA final ativo**  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data de abertura: **2026-09-02**  
Baseline visual: `docs/design/redesign-v2-spec.md`  
Auditoria: `docs/quality/redesign-v3-audit.md`  
QA final: `docs/quality/redesign-v3-final-253.md`

## 1. Objetivo

O Redesign v3 evolui o layout real atual sem reabrir regras funcionais já consolidadas. O foco permanece em:

- mobile-first e telas estreitas;
- consistência entre shell, páginas e primitives;
- WCAG 2.2 nível AA como referência de acessibilidade;
- teclado, foco, overlays e UI sticky/fixed;
- reflow, zoom e text spacing;
- touch targets e teclado virtual;
- contraste, estados e mensagens acessíveis;
- QA final em browsers e dispositivos reais quando disponível.

Nenhuma etapa do roadmap autoriza mudança de regra financeira, ownership, API, schema ou migration apenas por motivo visual.

## 2. Contratos preservados

- dark como identidade principal, com light funcional;
- superfícies neutras, bordas sutis e verde como acento;
- sem glassmorphism/glow/gradiente decorativo sem função;
- texto base >=16px e secundário >=14px;
- target crítico interno ~44x44px ou maior;
- foco visível e previsível;
- safe-area em mobile;
- `prefers-reduced-motion`;
- não diminuir fonte para “fazer caber”;
- HTML semântico e acessibilidade como requisito funcional.

## 3. Estado atual das issues

| Issue | Escopo | Implementação / evidência | Estado atual |
| --- | --- | --- | --- |
| #246 | Auditoria/baseline | `redesign-v3-audit.md`; findings classificados e distribuídos | aberta apenas para reconciliação final da matriz interativa em #253 |
| #247 | App shell/mobile | PR #260 + cobertura posterior multi-engine | **fechada pelo PR #273**; QA manual ficou em #253 |
| #248 | Filtros/foco | PR #262 | **concluída** |
| #249 | Touch targets/primitives | PR #263 + cobertura posterior multi-engine | **fechada pelo PR #273**; QA manual ficou em #253 |
| #250 | Reflow/densidade | PR #264; CI #292; E2E #85; Lighthouse #226; cobertura multi-engine posterior | **reconciliada no PR #274**; fecha no merge, QA manual fica em #253 |
| #251 | Formulários/autenticação | PR #266; CI #303; E2E #94; Lighthouse #235; cobertura multi-engine posterior | **reconciliada no PR #274**; fecha no merge, QA manual fica em #253 |
| #252 | Contraste/estados | PR #268 + `redesign-v3-contrast-252.md` | implementação determinística concluída; inspeção visual/AT/device em #253 |
| #253 | QA final | PRs #271/#272 + ledger final | **etapa ativa** |

## 4. Evidência consolidada por frente

### Foundation — #247/#249

Evidência: `docs/quality/redesign-v3-foundation-247-249.md`.

- app shell com política de scroll spacing para topbar/bottom nav/safe-area;
- targets críticos protegidos por regressão;
- controles prioritários normalizados para primitives;
- finding de label-in-name do calendário reproduzido contextualmente;
- suíte posterior verde em Chromium, Firefox e WebKit;
- zoom real, foco não-obscurecido contextual, Safari/device e dark/light final permanecem em #253.

Reconciliação: **PR #273**.

### Reflow — #250

Evidência: `docs/quality/redesign-v3-reflow-250.md`.

- rotas financeiras prioritárias exercitadas em 320 CSS px;
- ausência de overflow horizontal evitável nas superfícies cobertas;
- wrapping de nomes/valores extensos;
- tipografia secundária visível >=14px;
- ação sticky da importação acima da bottom navigation;
- cobertura posterior na matriz Chromium/Firefox/WebKit do QA final.

Zoom 200%, text spacing, landscape e device real permanecem em #253.

### Formulários — #251

Evidência: `docs/quality/redesign-v3-forms-251.md`.

- labels, nomes acessíveis e erros associados;
- foco determinístico após validação inválida/global;
- `autocomplete`, `inputMode`, `enterKeyHint` e atributos de teclado revisados;
- inputs nativos preservados, sem bloqueio deliberado de copy/paste;
- regressão dedicada executada também na matriz multi-engine posterior.

Teclado virtual, safe-area física, password managers, zoom/orientação e AT real permanecem em #253.

Reconciliação conjunta de #250/#251: `docs/quality/redesign-v3-flows-250-251.md` / **PR #274**.

### Contraste e estados — #252

Evidência: `docs/quality/redesign-v3-contrast-252.md`.

- `--text-subtle` claro corrigido para >=4.5:1 nas superfícies suportadas;
- fronteiras funcionais `border-strong` >=3:1 onde aplicável;
- estados prioritários migrados para tokens semânticos;
- status relevantes com texto/pista programática e live regions;
- regressão automatizada de contraste e E2E preservados.

Dark/light visual completo, AT real, Safari/device e contextos de borda/ícone dependentes de renderização permanecem em #253.

## 5. QA final — #253

O QA final é o único owner das validações transversais que não podem ser inferidas de CI/E2E/Lighthouse.

### Evidência automatizada já incorporada

PR #271:

- matriz E2E Chromium/Firefox/WebKit;
- correção da invocação por projeto;
- correção do cookie `Secure` para o ambiente HTTP local de E2E;
- CI #322, E2E #109 nos três engines e Lighthouse #250 verdes.

PR #272:

- correção de tipografia mobile em Dashboard/Transações;
- regressão por estilo computado >=14px;
- CI #325, E2E #112 nos três engines, Lighthouse #253 e frontend budget verdes.

WebKit em Linux é evidência de engine e **não** equivale a Safari/iOS/macOS real.

### Matriz que continua manual/externa

Não marcar como concluída sem evidência real:

- keyboard-only ponta a ponta;
- foco não-obscurecido em contexto real;
- zoom 200%;
- text spacing;
- dark/light visual completo;
- Safari real;
- iOS/Android com teclado virtual e safe-area;
- password manager real;
- reader/AT smoke test;
- portrait/landscape em device real.

## 6. Roadmap por fases

| Fase | Issues | Estado |
| --- | --- | --- |
| 0 — Auditoria | #246 | baseline determinístico concluído; reconciliação manual converge para #253 |
| 1 — Foundation | #247–#249 | implementação concluída; #247/#249 reconciliadas no PR #273 |
| 2 — Fluxos críticos | #250–#252 | implementações concluídas; #250/#251 reconciliadas no PR #274; #252 aguarda reconciliação final |
| 3 — QA | #253 | **em execução** |

## 7. Checklist atual do roadmap

- [ ] #246 — reconciliar baseline com a evidência final da #253
- [x] #247 — app shell/mobile reconciliado — PR #273
- [x] #248 — filtros/overlays/foco — PR #262
- [x] #249 — touch targets/primitives reconciliado — PR #273
- [ ] #250 — PR #274 aberto; marcar concluída após merge
- [ ] #251 — PR #274 aberto; marcar concluída após merge
- [ ] #252 — reconciliar contraste/estados com a evidência final da #253
- [ ] #253 — concluir QA final e ledger
- [x] documentação de #247/#249 consolidada
- [x] documentação de #250/#251 consolidada
- [x] ledger de QA final atualizado com as reconciliações em andamento

## 8. Critérios de fechamento do Redesign v3

O roadmap #245 só deve fechar quando:

- #246–#253 estiverem concluídas ou justificadas explicitamente;
- nenhum finding P0/P1 conhecido permanecer sem issue e justificativa;
- cada head funcional tiver gates relevantes verdes;
- evidências de teclado, reflow/zoom, foco e contraste estiverem registradas no nível realmente executado;
- nenhuma validação física for inferida a partir de automação;
- o ledger final e este roadmap refletirem o estado real;
- auto-review final tiver sido executado no head que será mergeado quando houver diff funcional.

## 9. Gates técnicos

Quando houver mudança funcional de frontend, preservar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Lighthouse e E2E são evidência complementar. Não substituem browser/device real, teclado, leitor de tela ou zoom quando esses critérios dependem de interação física.

## 10. Rastreabilidade

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
- QA final: #253 / PRs #271 e #272 / `docs/quality/redesign-v3-final-253.md`

Este documento deve registrar apenas evidência observada e decisões de tracking. Hipóteses, score automatizado ou engine emulada não devem ser promovidos a validação física sem evidência correspondente.
