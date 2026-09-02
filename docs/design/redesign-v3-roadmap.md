# Redesign v3 — Roadmap de Design, Mobile e Acessibilidade

Status: **planejado / em execução**  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data de abertura: **2026-09-02**  
Baseline visual: `docs/design/redesign-v2-spec.md`  
Auditoria v3: `docs/quality/redesign-v3-audit.md`  
Evidência de reflow #250: `docs/quality/redesign-v3-reflow-250.md`

## 1. Objetivo

O **Redesign v3** é uma evolução do layout real atual, não um recomeço visual. O v2 — **Dark Command Center** — continua sendo a base de identidade, densidade e linguagem do produto. O v3 concentra a próxima revisão transversal em:

- mobile-first e telas estreitas;
- consistência entre shell, páginas e primitives;
- acessibilidade alinhada à **WCAG 2.2 nível AA**;
- teclado, foco, overlays e navegação sticky/fixed;
- reflow, zoom, text spacing e conteúdo extenso;
- touch targets e teclado virtual;
- contraste, estados e mensagens acessíveis;
- QA final em navegadores e dispositivos reais quando disponível.

O escopo **não autoriza novas funcionalidades** nem mudanças de regra de negócio. Invariantes financeiras, contratos HTTP/API, autenticação, ownership e fonte de verdade de saldo permanecem definidos pelo código, ADRs e `AGENTS.md`.

## 2. Princípios preservados do v2

O v3 mantém os contratos já consolidados:

- dark como identidade principal, mantendo light funcional;
- superfícies neutras, bordas sutis e verde como acento principal;
- sem glassmorphism/glow/gradiente decorativo sem função;
- texto base >= **16px** e secundário >= **14px**;
- touch target crítico interno em torno de **44x44px ou maior**;
- foco visível;
- safe-area em mobile;
- `prefers-reduced-motion`;
- sem diminuir fonte para “fazer caber”;
- acessibilidade como requisito funcional, não polish opcional.

A WCAG 2.2 exige, no SC **2.5.8 Target Size (Minimum)**, alvo de pelo menos 24x24 CSS px ou espaçamento equivalente, salvo exceções. O projeto mantém o padrão interno mais conservador de ~44x44px para controles críticos.

## 3. Evidências e problemas identificados no layout atual

A baseline inicial da #246 está registrada em `docs/quality/redesign-v3-audit.md`. Findings marcados como **risco a validar** continuam sem ser declarados antecipadamente como falha WCAG quando dependem de reprodução interativa, zoom, navegador ou dispositivo real.

### 3.1 Filtros fechados podem manter controles na ordem de foco — finding concreto

A baseline identificou que `app/components/navigation/dynamic-filters/index.tsx` mantinha controles montados e potencialmente focáveis mesmo com o painel visualmente fechado, além de não restaurar explicitamente o foco após `Escape`.

Impacto identificado na auditoria:

- ordem de foco podia incluir conteúdo invisível;
- usuário podia perder contexto ao fechar o painel;
- comportamento diferia entre acionadores mobile/desktop.

**Estado atual:** ✅ corrigido pela #248 / PR #262, com regressão automatizada de foco. A #248 foi encerrada.

### 3.2 Shell mobile precisa garantir foco não-obscurecido — risco a validar

A baseline registrou risco de foco encoberto pela topbar sticky e bottom navigation fixed. A foundation do shell foi revisada na #247 / PR #260, incluindo política de espaçamento de scroll e regressão automatizada para viewports mobile.

**Estado atual:** implementação de foundation integrada. A #247 continua dona das validações interativas que não podem ser inferidas apenas por automação, como zoom/labels longas/contextos reais quando aplicável.

O SC **2.4.11 Focus Not Obscured (Minimum)** permanece como critério de QA do v3.

### 3.3 Densidade da topbar/bottom nav em 320–390px — risco a validar

A topbar mobile combina marca, tema, perfil e logout no mesmo eixo. A bottom navigation distribui cinco itens. O PR #260 adicionou proteção automatizada para 320/360/390px e targets críticos, mas zoom 200%, landscape e strings maiores continuam validações explícitas de QA.

Issue: [#247](https://github.com/felipe-urgal/controle-gastos/issues/247).

### 3.4 Controles fora das primitives podem gerar drift — finding estrutural

A auditoria encontrou ações ad hoc fora de `Button`/primitives e um sinal experimental de `label-content-name-mismatch` no calendário.

**Estado atual:** a #249 / PR #263 integrou a normalização dos controles interativos prioritários e a regressão de target/nome acessível. Validações contextuais remanescentes continuam na própria #249/#253 quando não forem demonstráveis de forma determinística.

### 3.5 Reflow das superfícies novas precisa de nova fotografia — em execução

O v2 foi fechado antes de parte das evoluções funcionais atuais. Dashboard, importação e multi-moeda passaram a integrar o produto real depois do baseline visual inicial. O v3 precisa revalidar densidade, wrapping, valores extensos, filtros, cards, calendários e paginação em 320px e zoom 200%.

**Estado atual em 2026-09-02:** a #250 está em execução no PR #264. O PR cobre a parte determinística/automatizável: rotas financeiras em 320 CSS px, conteúdo longo, ausência de overflow horizontal evitável, tipografia mínima da importação e barra sticky acima da bottom navigation. Evidência: `docs/quality/redesign-v3-reflow-250.md`.

Zoom 200%, text spacing, landscape, dispositivo real e validações equivalentes continuam explicitamente pendentes e não são inferidos do E2E.

Issue: [#250](https://github.com/felipe-urgal/controle-gastos/issues/250).

### 3.6 Formulários possuem boa foundation, mas precisam de validação de fluxo completo

`Input` já associa `label`, `aria-invalid` e mensagem de erro; login já usa `autocomplete="email"` e `autocomplete="current-password"`. O v3 deve validar o fluxo completo com teclado virtual, password managers, copy/paste, erros de servidor, foco após erro e elementos fixed/sticky.

Issue: [#251](https://github.com/felipe-urgal/controle-gastos/issues/251).

### 3.7 Tokens semânticos precisam de matriz dark/light e estados

O design system possui tokens para foco, texto secundário, borda, warning, info, income/expense e danger. O v3 deve medir combinações reais nos dois temas e verificar que estado, seleção, erro, pendência e resultado não dependam exclusivamente de cor.

Issue: [#252](https://github.com/felipe-urgal/controle-gastos/issues/252).

### 3.8 Baseline #246 — findings confirmados em 2026-09-02

A primeira passagem da #246 confirmou e classificou findings sem depender de interpretação visual subjetiva. Esta lista é **histórica da baseline**; o estado de correção é registrado nas issues/PRs e nas seções acima:

- **P1 / #248:** painel fechado de filtros permanecia montado e potencialmente focável — corrigido no PR #262;
- **P1 / #252:** `--text-subtle` no tema claro fica abaixo de 4.5:1 em combinações reais de texto normal (4.18:1 no background, 4.46:1 na surface, 4.02:1 na surface-raised e 3.79:1 na surface-subtle) — pendente #252;
- **P2 / #250 + #252:** importação usava `text-xs` em status visível, abaixo do mínimo interno de 14px para texto secundário, além de cores locais de status fora dos tokens semânticos — tipografia tratada no PR #264; cores continuam #252;
- **P2 / #249:** `Importar CSV/OFX` era ação ad hoc fora da primitive canônica — tratado no PR #263;
- **a validar / #249:** Lighthouse/axe registrou `label-content-name-mismatch` experimental no botão do dia atual do calendário; a #249 adicionou regressão contextual, sem usar o score agregado como prova isolada de conformidade.

A auditoria também mediu contraste baixo das bordas semânticas, mas isso permanece **risco contextual** para 1.4.11: borda decorativa não é automaticamente uma falha e cada controle precisa ser avaliado pela função visual real.

A evidência detalhada, os limites da automação e a matriz pendente estão em `docs/quality/redesign-v3-audit.md`.

## 4. Issues criadas no GitHub

### #245 — Roadmap Redesign v3

**Título:** [Roadmap][Redesign v3] Revisar layout atual com foco em mobile e WCAG 2.2  
**Responsáveis:** Design + Frontend + QA  
**Descrição:** issue guarda-chuva para ordenar as fases, critérios de fechamento e rastreabilidade do v3.

Checklist:

- [ ] #246 Auditoria/baseline concluído
- [ ] #247 App shell mobile revisado
- [x] #248 Filtros/overlays com foco correto — PR #262
- [ ] #249 Touch targets/controles padronizados
- [ ] #250 Reflow das páginas críticas validado — implementação automatizável no PR #264
- [ ] #251 Formulários/teclado virtual revisados
- [ ] #252 Contraste/estados/mensagens revisados
- [ ] #253 QA final e evidências concluídos

### #246 — Auditoria do layout atual

**Título:** [P1][Design/QA][Redesign v3] Auditar layout atual em mobile e WCAG 2.2  
**Responsáveis:** Design + QA, apoio de Frontend.  
**Descrição:** criar baseline reproduzível das rotas públicas/autenticadas, dark/light, viewports, zoom, text spacing, teclado, foco e estados.

Checklist principal:

- [x] inventariar rotas/componentes críticos;
- [ ] testar 320/360/390/768px e desktop interativamente;
- [ ] testar zoom 200% e text spacing;
- [ ] executar keyboard-only ponta a ponta;
- [x] medir/registrar contraste prioritário;
- [x] classificar findings P0/P1/P2 encontrados;
- [x] vincular cada finding a uma issue ou justificativa;
- [x] registrar baseline em `docs/quality/redesign-v3-audit.md`;
- [ ] fechar evidências interativas restantes ou transferi-las explicitamente ao gate final #253.

### #247 — App shell e navegação mobile

**Título:** [P1][Design/Frontend][Redesign v3] Revisar app shell e navegação mobile  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** revisar topbar, bottom nav, safe-area, truncation, estado ativo, zoom e foco não-obscurecido.

Implementação de foundation: **PR #260 integrado**.

Checklist principal:

- [ ] validar topbar em 320/360/390px;
- [ ] validar bottom nav com labels longas/zoom;
- [ ] garantir estado ativo sem depender apenas de cor;
- [ ] garantir foco não-obscurecido por sticky/fixed UI;
- [x] definir `scroll-padding`/`scroll-margin` quando necessário;
- [x] preservar target crítico ~44px na regressão automatizada.

### #248 — Filtros, teclado e foco

**Título:** [P1][Frontend][Redesign v3] Corrigir teclado e gerenciamento de foco dos filtros  
**Responsáveis:** Frontend; QA valida; Design revisa comportamento.  
**Descrição:** impedir foco em conteúdo fechado e tornar abertura/fechamento previsível em desktop/mobile.

Implementação: **✅ PR #262 integrado; issue encerrada**.

Checklist principal:

- [x] painel fechado não recebe Tab;
- [x] semântica de disclosure/popup correta;
- [x] `aria-expanded`/relação programática quando aplicável;
- [x] Escape fecha e restaura foco;
- [x] troca entre acionadores mobile/desktop mantém contexto;
- [x] testes de regressão para foco.

### #249 — Touch targets e primitives

**Título:** [P1][Design/Frontend][Redesign v3] Padronizar touch targets e controles interativos  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** reduzir controles ad hoc e consolidar geometria, estados, foco e nomes acessíveis nas primitives.

Implementação de foundation: **PR #263 integrado**.

Checklist principal:

- [x] inventariar ações fora das primitives prioritárias;
- [x] migrar drift real prioritário para `Button`/primitives;
- [x] manter ~44x44px nos controles críticos cobertos pelo E2E;
- [ ] revisar espaçamento entre alvos em toda a matriz;
- [x] revisar icon buttons e label-in-name prioritários;
- [ ] validar dark/light na matriz final.

### #250 — Reflow e densidade das páginas financeiras

**Título:** [P1][Design/Frontend][Redesign v3] Revisar reflow e densidade das páginas financeiras  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** validar Dashboard, Transações, Contas, Categorias/limites, Calendário e padrões compartilhados em telas estreitas e zoom.

Implementação automatizável: **PR #264**. Evidência: `docs/quality/redesign-v3-reflow-250.md`.

Checklist principal:

- [ ] validar 320 CSS px no head final;
- [ ] validar zoom 200%;
- [ ] eliminar overflow horizontal evitável no head final;
- [ ] revisar valores/nomes longos e multi-moeda no head final;
- [ ] revisar wrapping/truncation no head final;
- [ ] manter tipografia mínima do projeto no head final;
- [ ] preservar ordem visual/semântica no empilhamento;
- [x] registrar divergências/limites da automação em documento dedicado.

### #251 — Formulários, autenticação e teclado virtual

**Título:** [P1][Design/Frontend][Redesign v3] Revisar formulários, autenticação e teclado virtual  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** revisar autenticação e formulários financeiros com autofill, password managers, erros, foco e teclado virtual.

Checklist principal:

- [ ] validar labels/instruções/nome acessível;
- [ ] revisar `autocomplete`, `inputMode` e tipos de input;
- [ ] permitir copy/paste e password managers;
- [ ] associar/anunciar erros corretamente;
- [ ] revisar foco após erro;
- [ ] validar campo/CTA com teclado virtual e safe-area.

### #252 — Contraste, estados e mensagens

**Título:** [P1][Design/Frontend][Redesign v3] Revisar contraste, estados e mensagens acessíveis  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** medir tokens nos dois temas e garantir que estados e status sejam percebidos visual e programaticamente.

Checklist principal:

- [ ] medir contraste de texto e elementos não textuais aplicáveis;
- [ ] revisar `text-muted`/`text-subtle`;
- [ ] não depender apenas de cor para income/expense/pending/error;
- [ ] revisar loading/empty/error/success/disabled;
- [ ] anunciar status relevante sem mover foco;
- [ ] validar reduced motion.

### #253 — QA final

**Título:** [P1][QA][Redesign v3] Executar validação final de acessibilidade e mobile  
**Responsáveis:** QA; Design/Frontend corrigem findings.  
**Descrição:** executar validação final independente, sem tratar Lighthouse como prova isolada de conformidade WCAG.

Checklist principal:

- [ ] Chromium/Firefox/WebKit-Safari quando disponível;
- [ ] dispositivo mobile real quando disponível;
- [ ] dark/light;
- [ ] 320/360/390/768px e zoom 200%;
- [ ] keyboard-only e foco não-obscurecido;
- [ ] leitor de tela/smoke equivalente;
- [ ] teclado virtual/safe-area;
- [ ] Lighthouse, CI e frontend budget;
- [ ] ledger final e auto code review do head final.

## 5. Roadmap por fases

| Fase | Objetivo | Issues | Saída esperada | Estado |
| --- | --- | --- | --- | --- |
| **0 — Auditoria** | Fotografar o estado real e priorizar findings | #246 | baseline + evidências + backlog validado | **baseline inicial registrado; matriz interativa pendente** |
| **1 — Foundation** | Corrigir shell, foco, overlays e controles compartilhados | #247, #248, #249 | foundation mobile/a11y consistente | **foundation de código integrada pelos PRs #260, #262 e #263; validações interativas remanescentes continuam nas issues** |
| **2 — Fluxos críticos** | Aplicar o contrato a páginas, formulários e estados | #250, #251, #252 | UX coerente em rotas reais e ambos os temas | **em execução pela #250 / PR #264; #251 e #252 seguem na sequência, com finding de contraste já confirmado em #252** |
| **3 — QA** | Validar o head final em matriz independente | #253 | ledger final + gates + fechamento de #245 | pendente |

### Dependências

1. A #246 já produziu baseline suficiente para conduzir implementação, mas permanece aberta até reconciliar a evidência interativa do checklist.
2. A foundation de código de #247–#249 foi integrada pelos PRs #260, #262 e #263; isso liberou a Fase 2 sem declarar automaticamente concluídas validações manuais que ainda pertencem às issues.
3. A #250 iniciou a Fase 2 no PR #264. #251 e #252 usam essa foundation estabilizada para evitar retrabalho; a #252 continua dona do finding P1 de contraste e das cores/estados semânticos.
4. #253 só fecha após o head final das issues anteriores estar disponível.

## 6. Tabela comparativa — problemas, WCAG 2.2 e responsáveis

| Problema / risco | Evidência atual | WCAG 2.2 | Nível | Design | Frontend | QA | Issue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Painel de filtros fechado podia manter controles focáveis | baseline #246; corrigido e coberto por regressão no PR #262 | 2.1.1 Keyboard; 2.4.3 Focus Order; 4.1.2 Name, Role, Value | A | Apoio | **Owner** | Valida | #248 |
| Foco pode ser ocultado por topbar/bottom nav sticky/fixed | foundation de scroll spacing implementada no PR #260; validação interativa continua | 2.4.11 Focus Not Obscured; 2.4.7 Focus Visible | AA | Co-owner | **Owner** | Valida | #247 |
| Topbar/bottom nav podem ficar densas em telas muito estreitas | E2E cobre 320/360/390px; zoom/landscape/labels longas continuam manuais | 1.4.10 Reflow; 2.4.6 Headings and Labels | AA | **Owner** | Co-owner | Valida | #247 |
| Controles ad hoc podiam divergir de tamanho/foco/estado | foundation prioritária normalizada no PR #263 | 1.4.11 Non-text Contrast; 2.5.8 Target Size; 2.5.3 Label in Name | AA/A | **Owner** | **Owner** | Valida | #249 |
| Botão do dia atual gerou `label-content-name-mismatch` experimental | regressão contextual adicionada na #249; automação agregada não é prova isolada | 2.5.3 Label in Name | A | Apoio | **Owner** | **Owner QA** | #249 |
| Cards/listas/calendário precisam reflow após evolução do produto | PR #264 com conteúdo longo e E2E a 320px; zoom/text spacing continuam pendentes | 1.4.4 Resize Text; 1.4.10 Reflow; 1.4.12 Text Spacing | AA | **Owner** | **Owner** | Valida | #250 |
| Importação usava `text-xs` em status visível | PR #264 eleva tipografia para >=14px; cores locais continuam sob #252 | padrão interno; revisar junto de reflow/estado | — | **Owner** | **Owner** | Valida | #250/#252 |
| Formulários podem ser cobertos pelo teclado virtual ou perder contexto após erro | foundation é boa, mas fluxo completo precisa de device QA | 2.4.11 Focus Not Obscured; 3.3.1 Error Identification; 3.3.2 Labels or Instructions | AA/A | Co-owner | **Owner** | **Owner QA** | #251 |
| Autenticação deve continuar compatível com password managers/copy-paste | login já usa autocomplete; v3 valida todos os fluxos | 1.3.5 Identify Input Purpose; 3.3.8 Accessible Authentication | AA | Apoio | **Owner** | Valida | #251 |
| `text-subtle` claro falha 4.5:1 em texto normal | razões medidas entre 3.79:1 e 4.46:1 nas surfaces principais | 1.4.3 Contrast (Minimum) | AA | **Owner** | **Owner** | Valida | #252 |
| Bordas podem ter contraste funcional insuficiente em controles específicos | `border`/`border-strong` ficam abaixo de 3:1 contra surfaces; função visual precisa análise contextual | 1.4.11 Non-text Contrast | AA | **Owner** | Co-owner | Valida | #252 |
| Mensagens dinâmicas podem não ser percebidas por tecnologia assistiva | comportamento varia por componente e precisa auditoria | 4.1.3 Status Messages | AA | Apoio | **Owner** | Valida | #252 |
| Automação pode dar falsa sensação de conformidade | Lighthouse histórico mostra 100 agregado e ainda contém audit experimental falhando | transversal | A/AA | Participa | Participa | **Owner** | #253 |

## 7. Critérios de fechamento do Redesign v3

O roadmap #245 só deve ser encerrado quando:

- todas as issues #246–#253 estiverem concluídas ou explicitamente justificadas como `not planned`;
- nenhum finding P0/P1 conhecido permanecer sem issue e justificativa;
- o head final correspondente a cada entrega tiver passado pelos gates relevantes;
- keyboard-only, reflow/zoom, foco e contraste tiverem evidência registrada;
- validações que dependem de dispositivo real não forem declaradas como concluídas por automação;
- `docs/design/redesign-v3-roadmap.md` refletir o estado final real;
- o auto code review final tiver sido executado no mesmo head que será mergeado.

## 8. Gates técnicos

Para mudanças de frontend relevantes, preservar os gates definidos em `AGENTS.md`:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Lighthouse deve continuar fazendo parte da validação quando aplicável. Score automatizado é evidência complementar e não substitui teclado, leitor de tela, zoom/reflow ou dispositivo real.

## 9. Referências WCAG 2.2

- WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- Novos critérios da WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Understanding Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
- Techniques WCAG 2.2: https://www.w3.org/WAI/WCAG22/Techniques/

Critérios prioritários do v3: **1.3.1, 1.3.5, 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.1.1, 2.4.3, 2.4.6, 2.4.7, 2.4.11, 2.5.3, 2.5.8, 3.3.1, 3.3.2, 3.3.7, 3.3.8, 4.1.2 e 4.1.3**.

## 10. Rastreabilidade

- Roadmap: #245
- Auditoria: #246
- Baseline da auditoria: `docs/quality/redesign-v3-audit.md`
- App shell/mobile: #247 / PR #260
- Filtros/foco: #248 / PR #262
- Touch targets/primitives: #249 / PR #263
- Reflow/densidade: #250 / PR #264
- Evidência de reflow: `docs/quality/redesign-v3-reflow-250.md`
- Formulários/teclado virtual: #251
- Contraste/status: #252
- QA final: #253

Este documento deve continuar sendo atualizado conforme findings reais surgirem, evitando transformar hipóteses de auditoria em “falhas confirmadas” sem evidência.