# Redesign v3 — Roadmap de Design, Mobile e Acessibilidade

Status: **planejado / em execução**  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data de abertura: **2026-09-02**  
Baseline visual: `docs/design/redesign-v2-spec.md`  
Auditoria v3: `docs/quality/redesign-v3-audit.md`

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

`app/components/navigation/dynamic-filters/index.tsx` oculta painéis com `opacity`, `transform` e `pointer-events`, mas mantém o conteúdo montado. Os controles internos continuam potencialmente focáveis por teclado mesmo quando o painel está visualmente fechado. Escape fecha o painel, porém não há restauração explícita do foco ao acionador.

Impacto:

- ordem de foco pode incluir conteúdo invisível;
- usuário pode perder contexto ao fechar o painel;
- comportamento difere entre botão do header e botão flutuante mobile.

Issue: [#248](https://github.com/felipe-urgal/controle-gastos/issues/248).

### 3.2 Shell mobile precisa garantir foco não-obscurecido — risco a validar

O app usa topbar sticky e bottom navigation fixed, com padding inferior no `main`. Isso já protege a área visual em muitos cenários, mas não existe uma política transversal explícita de `scroll-padding`/`scroll-margin` para garantir que um elemento focado via teclado nunca seja totalmente escondido por conteúdo sticky/fixed.

O SC **2.4.11 Focus Not Obscured (Minimum)** foi adicionado na WCAG 2.2 justamente para esse tipo de cenário.

Issue: [#247](https://github.com/felipe-urgal/controle-gastos/issues/247).

### 3.3 Densidade da topbar/bottom nav em 320–390px — risco a validar

A topbar mobile combina marca, tema, perfil e logout no mesmo eixo. A bottom navigation distribui cinco itens em colunas e permite truncamento de labels. O comportamento pode ser adequado, mas deve ser validado em 320/360/390px, zoom 200%, strings maiores e orientação landscape.

Issue: [#247](https://github.com/felipe-urgal/controle-gastos/issues/247).

### 3.4 Controles fora das primitives podem gerar drift — finding estrutural

As primitives de `Button`, `Input` e `Select` já concentram tamanho, foco e estados acessíveis. Ainda existem ações construídas diretamente com `<a>`/`button` e classes locais — por exemplo, `Importar CSV/OFX` na listagem de Transações. Isso não representa automaticamente uma falha WCAG, mas cria risco de divergência de geometria, foco, contraste e estados.

Issue: [#249](https://github.com/felipe-urgal/controle-gastos/issues/249).

### 3.5 Reflow das superfícies novas precisa de nova fotografia — risco a validar

O v2 foi fechado antes de parte das evoluções funcionais atuais. Dashboard, importação e multi-moeda passaram a integrar o produto real depois do baseline visual inicial. O v3 deve revalidar densidade, wrapping, valores extensos, filtros, cards, calendários e paginação em 320px e zoom 200%.

Issue: [#250](https://github.com/felipe-urgal/controle-gastos/issues/250).

### 3.6 Formulários possuem boa foundation, mas precisam de validação de fluxo completo

`Input` já associa `label`, `aria-invalid` e mensagem de erro; login já usa `autocomplete="email"` e `autocomplete="current-password"`. O v3 deve validar o fluxo completo com teclado virtual, password managers, copy/paste, erros de servidor, foco após erro e elementos fixed/sticky.

Issue: [#251](https://github.com/felipe-urgal/controle-gastos/issues/251).

### 3.7 Tokens semânticos precisam de matriz dark/light e estados

O design system possui tokens para foco, texto secundário, borda, warning, info, income/expense e danger. O v3 deve medir combinações reais nos dois temas e verificar que estado, seleção, erro, pendência e resultado não dependam exclusivamente de cor.

Issue: [#252](https://github.com/felipe-urgal/controle-gastos/issues/252).

### 3.8 Baseline #246 — findings confirmados em 2026-09-02

A primeira passagem da #246 confirmou e classificou findings sem depender de interpretação visual subjetiva:

- **P1 / #248:** painel fechado de filtros permanece montado e potencialmente focável;
- **P1 / #252:** `--text-subtle` no tema claro fica abaixo de 4.5:1 em combinações reais de texto normal (4.18:1 no background, 4.46:1 na surface, 4.02:1 na surface-raised e 3.79:1 na surface-subtle);
- **P2 / #250 + #252:** importação usa `text-xs` em status visível, abaixo do mínimo interno de 14px para texto secundário, além de cores locais de status fora dos tokens semânticos;
- **P2 / #249:** `Importar CSV/OFX` ainda é ação ad hoc fora da primitive canônica;
- **a validar / #249:** Lighthouse/axe registrou `label-content-name-mismatch` experimental no botão do dia atual do calendário, mesmo com Accessibility agregado 100; o source inclui o texto visível no `aria-label`, portanto requer reprodução contextual antes de ser declarado falha WCAG 2.5.3.

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
- [ ] #248 Filtros/overlays com foco correto
- [ ] #249 Touch targets/controles padronizados
- [ ] #250 Reflow das páginas críticas validado
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

Checklist principal:

- [ ] validar topbar em 320/360/390px;
- [ ] validar bottom nav com labels longas/zoom;
- [ ] garantir estado ativo sem depender apenas de cor;
- [ ] garantir foco não-obscurecido por sticky/fixed UI;
- [ ] definir `scroll-padding`/`scroll-margin` quando necessário;
- [ ] preservar target crítico ~44px.

### #248 — Filtros, teclado e foco

**Título:** [P1][Frontend][Redesign v3] Corrigir teclado e gerenciamento de foco dos filtros  
**Responsáveis:** Frontend; QA valida; Design revisa comportamento.  
**Descrição:** impedir foco em conteúdo fechado e tornar abertura/fechamento previsível em desktop/mobile.

Checklist principal:

- [ ] painel fechado não recebe Tab;
- [ ] semântica de disclosure/popup correta;
- [ ] `aria-expanded`/relação programática quando aplicável;
- [ ] Escape fecha e restaura foco;
- [ ] troca entre acionadores mobile/desktop mantém contexto;
- [ ] testes de regressão para foco.

### #249 — Touch targets e primitives

**Título:** [P1][Design/Frontend][Redesign v3] Padronizar touch targets e controles interativos  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** reduzir controles ad hoc e consolidar geometria, estados, foco e nomes acessíveis nas primitives.

Checklist principal:

- [ ] inventariar ações fora das primitives;
- [ ] migrar drift real para `Button`/primitives;
- [ ] manter ~44x44px nos controles críticos;
- [ ] revisar espaçamento entre alvos;
- [ ] revisar icon buttons, label-in-name e estados;
- [ ] validar dark/light.

### #250 — Reflow e densidade das páginas financeiras

**Título:** [P1][Design/Frontend][Redesign v3] Revisar reflow e densidade das páginas financeiras  
**Responsáveis:** Design + Frontend; QA valida.  
**Descrição:** validar Dashboard, Transações, Contas, Categorias/limites, Calendário e padrões compartilhados em telas estreitas e zoom.

Checklist principal:

- [ ] validar 320 CSS px;
- [ ] validar zoom 200%;
- [ ] eliminar overflow horizontal evitável;
- [ ] revisar valores/nomes longos e multi-moeda;
- [ ] revisar wrapping/truncation;
- [ ] manter tipografia mínima do projeto;
- [ ] preservar ordem visual/semântica no empilhamento.

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
| **1 — Foundation** | Corrigir shell, foco, overlays e controles compartilhados | #247, #248, #249 | foundation mobile/a11y consistente | pronta para iniciar pelos findings confirmados |
| **2 — Fluxos críticos** | Aplicar o contrato a páginas, formulários e estados | #250, #251, #252 | UX coerente em rotas reais e ambos os temas | aguarda foundation; #252 já possui finding confirmado de contraste |
| **3 — QA** | Validar o head final em matriz independente | #253 | ledger final + gates + fechamento de #245 | pendente |

### Dependências

1. A #246 já produziu baseline suficiente para iniciar os findings concretos de #247–#249, mas permanece aberta até reconciliar a evidência interativa do checklist.
2. #247–#249 podem avançar em paralelo depois do baseline inicial, pois tratam foundation compartilhada.
3. #250–#252 dependem das primitives/foundation estabilizadas para evitar retrabalho, sem impedir correção antecipada de um finding P1 isolado e bem delimitado.
4. #253 só fecha após o head final das issues anteriores estar disponível.

## 6. Tabela comparativa — problemas, WCAG 2.2 e responsáveis

| Problema / risco | Evidência atual | WCAG 2.2 | Nível | Design | Frontend | QA | Issue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Painel de filtros fechado pode manter controles focáveis | conteúdo oculto por opacity/transform/pointer-events continua montado | 2.1.1 Keyboard; 2.4.3 Focus Order; 4.1.2 Name, Role, Value | A | Apoio | **Owner** | Valida | #248 |
| Foco pode ser ocultado por topbar/bottom nav sticky/fixed | shell reserva espaço, mas não possui política transversal explícita de scroll-padding/margin | 2.4.11 Focus Not Obscured; 2.4.7 Focus Visible | AA | Co-owner | **Owner** | Valida | #247 |
| Topbar/bottom nav podem ficar densas em telas muito estreitas | marca + 3 ações no topo; 5 colunas na navegação inferior | 1.4.10 Reflow; 2.4.6 Headings and Labels | AA | **Owner** | Co-owner | Valida | #247 |
| Controles ad hoc podem divergir de tamanho/foco/estado | ações locais fora de `Button`/primitives, ex. importação | 1.4.11 Non-text Contrast; 2.5.8 Target Size; 2.5.3 Label in Name | AA/A | **Owner** | **Owner** | Valida | #249 |
| Botão do dia atual gerou `label-content-name-mismatch` experimental | audit Lighthouse/axe com impacto serious e peso 0; source precisa validação contextual | 2.5.3 Label in Name | A | Apoio | **Owner** | **Owner QA** | #249 |
| Cards/listas/calendário precisam reflow após evolução do produto | novas superfícies posteriores ao baseline inicial do v2 | 1.4.4 Resize Text; 1.4.10 Reflow; 1.4.12 Text Spacing | AA | **Owner** | **Owner** | Valida | #250 |
| Importação usa `text-xs` em status visível | código atual usa 12px, abaixo do mínimo interno de 14px | padrão interno; revisar junto de reflow/estado | — | **Owner** | **Owner** | Valida | #250/#252 |
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
- App shell/mobile: #247
- Filtros/foco: #248
- Touch targets/primitives: #249
- Reflow/densidade: #250
- Formulários/teclado virtual: #251
- Contraste/status: #252
- QA final: #253

Este documento deve continuar sendo atualizado conforme findings reais surgirem, evitando transformar hipóteses de auditoria em “falhas confirmadas” sem evidência.