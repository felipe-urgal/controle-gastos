# Redesign v3 — Auditoria baseline de layout, mobile e WCAG 2.2

Status: **baseline inicial concluído; validação interativa complementar pendente**  
Issue: [#246](https://github.com/felipe-urgal/controle-gastos/issues/246)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data: **2026-09-02**  
Baseline de código: `main` em `3ca57dec7ff856a6e085e6f0e68a901cc72ef0a4`  
Produção observada: `https://controle-gastos-pessoal.vercel.app`

## 1. Objetivo

Esta auditoria estabelece a fotografia inicial do **Redesign v3** sem reabrir regras de negócio nem declarar conformidade WCAG apenas por automação.

O objetivo é separar claramente:

1. **finding confirmado** — reproduzível no código, tokens ou evidência automatizada suficientemente direta;
2. **finding automatizado a validar** — ferramenta detectou uma possível falha, mas a interpretação ainda exige revisão contextual/manual;
3. **risco a validar** — arquitetura/layout justifica teste, mas não há evidência suficiente para chamá-lo de falha;
4. **baseline positivo** — contrato já presente que deve ser preservado durante as correções.

A auditoria é insumo para #247–#253. Ela não substitui a validação final independente da #253.

## 2. Método e limites da evidência

### 2.1 Evidência usada

Foram usados quatro tipos de evidência:

- inspeção do código atual em `main`;
- cálculo de contraste a partir dos tokens reais de `app/stylesheets/globals.css`;
- resposta da aplicação publicada para rotas públicas;
- artefatos do workflow `Lighthouse baseline` e histórico recente de CI/E2E.

### 2.2 O que não foi declarado como validado

Nesta execução não havia um navegador interativo controlável disponível para reproduzir de forma confiável toda a matriz manual. Por isso permanecem explicitamente pendentes:

- screenshots comparativos em 320/360/390/768/1024/>=1440 CSS px;
- zoom real de 200%;
- text spacing override completo;
- navegação keyboard-only ponta a ponta;
- verificação visual de foco parcialmente/totalmente encoberto por sticky/fixed UI;
- screen-reader smoke test;
- teclado virtual e safe areas em dispositivo móvel real;
- Firefox e WebKit/Safari.

Esses itens não são inferidos a partir do código nem de Lighthouse.

## 3. Inventário de superfícies

### 3.1 Rotas públicas

| Rota | Entrega HTTP/produção | Evidência complementar | Situação no baseline |
| --- | --- | --- | --- |
| `/` | responde em produção | Lighthouse mobile histórico | coberta por baseline automatizado |
| `/login` | responde em produção | Lighthouse mobile histórico | coberta por baseline automatizado |
| `/signup` | responde em produção | inspeção de código/rota | interação manual pendente |
| `/forgot-password` | responde em produção | inspeção de código/rota | interação manual pendente |
| `/reset-password` | responde em produção | inspeção de código/rota | interação manual pendente |

### 3.2 Rotas autenticadas prioritárias

| Rota | Cobertura automatizada existente | Validação v3 ainda necessária |
| --- | --- | --- |
| `/dashboard` | Lighthouse autenticado + E2E geral | 320px, zoom, dark/light e keyboard-only |
| `/transacoes` | Lighthouse autenticado + E2E geral | filtros, reflow, foco, conteúdo longo |
| `/transacoes/importar` | código auditado | reflow, teclado, status e arquivo em mobile |
| `/contas` | Lighthouse autenticado + E2E geral | conteúdo longo, zoom e estados |
| `/categorias` | código auditado | reflow, limites, contraste e estados |
| `/calendario` | Lighthouse autenticado + E2E geral | label-in-name, grid estreito e zoom |
| `/usuario/show/:id` | código/contrato do shell | forms, teclado virtual e foco após erro |

### 3.3 Estados transversais a preservar/revalidar

- loading;
- empty;
- error;
- success;
- disabled;
- pending/cancelled;
- seleção/estado ativo;
- conteúdo e nomes longos;
- valores financeiros e multi-moeda.

## 4. Baseline positivo já existente

A foundation atual já contém contratos importantes e eles não devem ser regressados nas próximas issues:

- `html` em `pt-BR` e viewport com `viewport-fit=cover`;
- skip link para conteúdo principal;
- `main` identificável e focável programaticamente;
- foco visível global com outline explícito;
- corpo com fonte base de 16px e line-height 1.5;
- `.ds-control` com min-height de 44px e fonte de 16px;
- labels/helpers do design system em 14px;
- safe-area tokens/classes;
- `prefers-reduced-motion` reduz animações/transições;
- topbar mobile com ações de tema, perfil e logout em 44x44px;
- bottom navigation com `aria-label`, `aria-current` e indicação ativa adicional além da cor;
- primitives `Input`/`Select`/`Button` já concentram grande parte do contrato de label, erro, foco e target;
- `main` atual passou pelo workflow CI após o merge #256.

Esses pontos representam **foundation**, não uma declaração de conformidade integral das telas.

## 5. Findings confirmados

### F-01 — P1 — Painel de filtros fechado pode permanecer na ordem de foco

**Issue dona:** [#248](https://github.com/felipe-urgal/controle-gastos/issues/248)  
**WCAG relacionada:** 2.1.1 Keyboard; 2.4.3 Focus Order; 2.4.7 Focus Visible.  
**Tipo de evidência:** código atual.

`DynamicFilters` mantém os controles montados quando o painel está fechado e altera principalmente `opacity`, `transform` e `pointer-events`.

No estado fechado, o painel pode ficar visualmente invisível enquanto descendants como `Input`, `Select` e `Button` continuam semanticamente presentes e potencialmente alcançáveis por Tab. Além disso, `Escape` fecha o painel sem restauração explícita do foco ao acionador que o abriu.

**Impacto:** usuário de teclado pode alcançar conteúdo invisível ou perder contexto após fechar os filtros.

**Ação:** corrigir em #248, com regressão automatizada de foco quando tecnicamente viável.

### F-02 — P1 — `--text-subtle` não atinge 4.5:1 em texto normal no tema claro

**Issue dona:** [#252](https://github.com/felipe-urgal/controle-gastos/issues/252)  
**WCAG:** 1.4.3 Contrast (Minimum), AA.  
**Tipo de evidência:** cálculo de tokens + usos reais em texto de 14px.

O token claro `--text-subtle: #6c7b72` é usado em texto normal/secundário. As razões calculadas são:

| Combinação | Contraste | Resultado para texto normal |
| --- | ---: | --- |
| `#6c7b72` / `#f6f8f7` (`background`) | **4.18:1** | falha 4.5:1 |
| `#6c7b72` / `#ffffff` (`surface`) | **4.46:1** | falha 4.5:1 |
| `#6c7b72` / `#f0f4f2` (`surface-raised`) | **4.02:1** | falha 4.5:1 |
| `#6c7b72` / `#e8eeea` (`surface-subtle`) | **3.79:1** | falha 4.5:1 |

Como comparação, `--text-muted: #526158` passa com folga no tema claro, e `--text-subtle: #89968f` passa no background escuro.

Há usos reais de `text-subtle` em labels auxiliares de navegação/listas e outros textos normais. Portanto não é apenas um risco teórico do token.

**Ação:** revisar token e combinações reais em #252, preservando a hierarquia visual sem reduzir tamanho de fonte.

### F-03 — P2 — Importação usa texto visível de 12px em badges/status

**Issues donas:** [#250](https://github.com/felipe-urgal/controle-gastos/issues/250) e [#252](https://github.com/felipe-urgal/controle-gastos/issues/252)  
**WCAG:** não é falha WCAG apenas por tamanho; é drift do contrato interno de tipografia.  
**Tipo de evidência:** código atual.

`app/components/pages/transactions/import/index.tsx` usa `text-xs` em badges/contagens de status visíveis ao usuário. O Redesign v3 preserva o padrão interno de texto secundário >=14px.

O mesmo fluxo também usa classes cromáticas locais para status (`emerald`, `red`, `amber`) em vez dos tokens semânticos compartilhados.

**Ação:** revisar tipografia/densidade em #250 e padronização semântica dos estados em #252.

### F-04 — P2 — Ação `Importar CSV/OFX` foge da primitive canônica

**Issue dona:** [#249](https://github.com/felipe-urgal/controle-gastos/issues/249)  
**WCAG relacionada à revisão:** 1.4.11 Non-text Contrast; 2.4.7 Focus Visible; 2.5.8 Target Size.  
**Tipo de evidência:** código atual.

A listagem de Transações renderiza `Importar CSV/OFX` como `<a>` com classes locais, enquanto as primitives do projeto já concentram geometria, foco e estados de `Button`.

Isso não constitui, isoladamente, uma falha WCAG confirmada. É um **drift estrutural** que aumenta o risco de divergência de target, foco, contraste e estados.

**Ação:** inventariar e normalizar controles ad hoc em #249.

## 6. Finding automatizado que exige validação contextual

### A-01 — P1 a confirmar — `label-content-name-mismatch` no dia atual do calendário

**Issue dona:** [#249](https://github.com/felipe-urgal/controle-gastos/issues/249)  
**WCAG potencial:** 2.5.3 Label in Name, A.  
**Tipo de evidência:** Lighthouse/axe experimental.

No artefato Lighthouse do SHA `5c8437a9cea5d49fbc73835dd120e9d5a0a704cf`, `/calendario` recebeu score agregado de Accessibility 100, mas o relatório contém a auditoria `label-content-name-mismatch` com:

- `score: 0`;
- impacto `serious`;
- tag `wcag253`;
- peso `0` no score Lighthouse por estar em grupo experimental/hidden.

O elemento apontado é o botão do dia atual, cujo texto visível contém o número do dia e `Hoje`, e cujo `aria-label` é construído por `CalendarGrid`.

A inspeção do source mostra que o `aria-label` inclui `visibleDateLabel`, então a classificação como falha definitiva precisa de reprodução com accessible-name computation/browser/AT antes da correção. Pode ser comportamento de normalização do audit experimental ou um mismatch contextual real.

**Ação:** #249 deve reproduzir o nome computado e ajustar apenas se o mismatch for confirmado. O score 100 não deve ocultar esse sinal.

## 7. Riscos medidos ou estruturais ainda não classificados como falha

### R-01 — Foco encoberto por topbar/bottom nav

**Issue:** [#247](https://github.com/felipe-urgal/controle-gastos/issues/247)  
**WCAG:** 2.4.11 Focus Not Obscured (Minimum), AA.

O shell usa topbar `sticky`, bottom nav `fixed` e reserva padding inferior no `main`. Isso é uma boa mitigação visual, porém não existe política transversal explícita de `scroll-padding`/`scroll-margin`.

Necessário validar por teclado, especialmente ao navegar para elementos próximos às extremidades e em zoom.

### R-02 — Bottom nav de cinco colunas e topbar em 320px/zoom

**Issue:** #247  
**WCAG:** 1.4.10 Reflow; 1.4.4 Resize Text; 2.4.6 Headings and Labels.

A topbar combina marca + três ações fixas de 44px. A bottom nav distribui cinco itens e permite `truncate` nas labels. O design pode funcionar, mas 320px, 200% zoom, landscape e labels maiores precisam de reprodução real.

### R-03 — Bordas sutis têm contraste baixo e precisam de análise por função

**Issue:** #252  
**WCAG potencial:** 1.4.11 Non-text Contrast, AA.

Contrastes medidos, por exemplo:

| Combinação | Contraste |
| --- | ---: |
| light `border` / `surface` | 1.39:1 |
| light `border-strong` / `surface` | 1.97:1 |
| dark `border` / `surface` | 1.40:1 |
| dark `border-strong` / `surface` | 1.91:1 |

Esses valores não permitem concluir que **toda** borda falha 1.4.11: bordas puramente decorativas não precisam atingir 3:1, e alguns controles podem ser identificáveis por outras pistas. A revisão deve ser contextual, elemento a elemento, em #252.

### R-04 — Reflow, long content, multi-moeda e truncation

**Issue:** #250  
**WCAG:** 1.4.4, 1.4.10, 1.4.12.

Há `truncate` intencional em topbar, navegação, calendário e superfícies financeiras. Truncation não é falha automática. Deve-se confirmar que informação/ação essencial permanece disponível em 320px, zoom 200% e text spacing aumentado.

### R-05 — Forms, autenticação e teclado virtual

**Issue:** #251  
**WCAG:** 1.3.5, 2.4.11, 3.3.1, 3.3.2, 3.3.7, 3.3.8, 4.1.2.

A foundation de `Input`/auth é boa, mas teclado virtual, password manager, paste, autofill e foco após erro exigem fluxo interativo/mobile.

### R-06 — Mensagens dinâmicas e leitor de tela

**Issues:** #251, #252 e #253  
**WCAG:** 4.1.3 Status Messages e critérios de nome/erro relacionados.

A presença de `role=alert`/semântica em componentes isolados não prova que todos os estados dinâmicos sejam anunciados no fluxo real. Necessário smoke test com tecnologia assistiva.

## 8. Evidência automatizada existente

### 8.1 `main` atual

Baseline desta auditoria: `3ca57dec7ff856a6e085e6f0e68a901cc72ef0a4`.

O workflow **CI #266** concluiu com sucesso nesse SHA. Lighthouse e E2E não foram disparados nesse merge porque os workflows possuem filtros de paths e o merge #256 alterou apenas configuração de deploy.

### 8.2 Último Lighthouse relevante de frontend

No SHA `5c8437a9cea5d49fbc73835dd120e9d5a0a704cf`, o workflow **Lighthouse baseline #205** concluiu com sucesso e publicou artefato para:

| Rota | Performance | Accessibility | Best Practices |
| --- | ---: | ---: | ---: |
| `/` | 93 | 100 | 96 |
| `/login` | 93 | 100 | 96 |
| `/dashboard` | 92 | 100 | 100 |
| `/contas` | 93 | 100 | 100 |
| `/transacoes` | 92 | 100 | 100 |
| `/calendario` | 90 | 100 | 100 |

O workflow constrói a aplicação em modo produção, usa PostgreSQL efêmero, cria sessão autenticada isolada e executa Lighthouse mobile nas rotas acima.

**Importante:** score 100 de Accessibility não é prova de WCAG 2.2. O próprio artefato do calendário contém A-01 em audit experimental de peso zero.

### 8.3 E2E existente

O workflow E2E usa Playwright Chromium, build de produção e banco efêmero. Há execução recente verde no mesmo histórico de frontend. Isso reduz risco de regressão funcional ampla, mas não cobre automaticamente a matriz de viewport/zoom/AT exigida pelo v3.

## 9. Matriz da #246 — estado real desta auditoria

| Validação | Estado | Evidência / próximo passo |
| --- | --- | --- |
| inventário de rotas/componentes/estados | **concluído** | seções 3–7 |
| produção pública básica | **concluído** | rotas públicas respondem; SSR/estrutura observados |
| contraste de tokens prioritários | **concluído parcialmente** | F-02 + R-03; revisão contextual completa fica em #252 |
| classificação P0/P1/P2 | **concluído para findings encontrados** | seção 5/6 |
| finding → issue dona | **concluído** | #247–#252 |
| 320/360/390/768/1024/>=1440 | **pendente interativo** | #247/#250/#253 |
| zoom 200% | **pendente interativo** | #247/#250/#253 |
| text spacing | **pendente interativo** | #250/#253 |
| keyboard-only ponta a ponta | **pendente interativo** | #247/#248/#251/#253 |
| foco não-obscurecido | **pendente interativo** | #247/#251/#253 |
| screen reader smoke | **pendente** | #251/#252/#253 |
| teclado virtual/safe-area real | **pendente dispositivo** | #251/#253 |
| Firefox/WebKit/Safari | **pendente** | #253 |

## 10. Priorização para execução

Nenhum P0 foi identificado nesta baseline.

### P1

1. **#248** — remover conteúdo invisível da ordem de foco e restaurar foco dos filtros;
2. **#252** — corrigir `text-subtle` claro e revisar contraste funcional de estados/controles;
3. **#247** — validar/corrigir shell em viewport estreito e Focus Not Obscured;
4. **#249** — padronizar primitives/targets e reproduzir A-01 do calendário.

### P2 / polish contratual

- tipografia de 12px na importação (#250/#252);
- classes cromáticas locais de status na importação (#252);
- demais drifts de primitive identificados durante #249.

## 11. Critério para avançar após o baseline

A Fase 1 pode começar porque os findings estruturais necessários para orientar #247–#249 já estão identificados e vinculados.

A #246, porém, só deve ser fechada quando a evidência interativa que pertence explicitamente ao seu checklist estiver registrada, ou quando o escopo remanescente for formalmente transferido para #253 sem duplicar uma falsa validação.

Até lá:

- este documento é a fonte de baseline reproduzível;
- #247–#252 recebem os findings específicos;
- #253 continua responsável pelo gate final independente e por browser/device coverage completa.

## 12. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/design/redesign-v2-spec.md`
- `docs/quality/redesign-v2-fidelity-ledger.md`
- `.github/workflows/lighthouse.yml`
- `.github/workflows/e2e.yml`
- `app/stylesheets/globals.css`
- `app/components/navigation/dynamic-filters/index.tsx`
- `app/components/layout/client-layout/index.tsx`
- `app/components/layout/mobile-topbar/index.tsx`
- `app/components/layout/bottom-nav/index.tsx`
- `app/components/pages/calendar/calendar-grid/index.tsx`
- `app/components/pages/transactions/index/index.tsx`
- `app/components/pages/transactions/import/index.tsx`
