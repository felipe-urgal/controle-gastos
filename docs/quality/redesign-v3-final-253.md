# Redesign v3 — QA final da issue #253

Status: **em execução**  
Issue: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Branch inicial: `qa/redesign-v3-final-253`  
Baseline inicial de `main`: `e8c6a0487caac10fce41d72d41ce7abf025c3ab4`

## 1. Objetivo

Consolidar o QA final do Redesign v3 sem confundir automação com validação física. A #253 é o gate de reconciliação das pendências de #246, #247, #249, #250, #251 e #252.

A execução deve preservar as invariantes de `AGENTS.md` e separar claramente:

- evidência determinística reproduzível em CI;
- inspeção de navegador/engine;
- validação que depende de Safari/iPhone, teclado virtual, safe-area física, password manager ou tecnologia assistiva real.

## 2. Baseline atual

O trabalho partiu do `main` após o PR #270 (`ajustes`). Esse PR é tratado como baseline visual; o QA final não reverte compactações mobile apenas para voltar ao layout anterior.

As alterações informais já testadas em iPhone 13 Pro Max servem como contexto de produto, mas não são usadas isoladamente para marcar critérios formais da #253 como concluídos. Evidência de device QA precisa indicar fluxo, estado, orientação e resultado observado.

## 3. Primeiro recorte — matriz multi-engine do Playwright

O PR #271 ampliou o Playwright e o GitHub Actions de Chromium para uma matriz independente com:

- Chromium;
- Firefox;
- WebKit;
- `fail-fast: false`;
- PostgreSQL efêmero por job;
- instalação somente do browser necessário;
- artefatos separados por engine.

A suíte existente reaproveita checks determinísticos de viewport mobile, incluindo 320px e 390px, foco, overflow horizontal, touch targets, filtros e reflow.

### Limite da evidência WebKit

WebKit no runner Linux aumenta a confiança de compatibilidade com a engine do Safari, mas **não equivale a Safari real em iOS/macOS**. Não valida por si só:

- teclado virtual;
- safe-area física/notch;
- password manager/autofill real;
- VoiceOver;
- comportamento específico do Safari do dispositivo;
- orientação/zoom em hardware real.

Esses itens continuam pendentes até evidência manual.

## 4. Findings encontrados durante a matriz

### 4.1 E2E #101 — invocação incorreta do projeto

O workflow usava:

```bash
pnpm test:e2e -- --project=<browser>
```

O `--` extra era repassado ao Playwright e cada job tentava executar todos os projetos, embora instalasse apenas o próprio browser.

Correção:

```bash
pnpm test:e2e --project=<browser>
```

A falha `Executable doesn't exist` era de infraestrutura de execução, não regressão funcional.

### 4.2 E2E #104 — cookie Secure em HTTP local de produção

Com a matriz corretamente isolada, Chromium e Firefox passaram, enquanto WebKit falhou no fluxo autenticado. O login retornava 200 e registrava `auth_login_succeeded`, mas a sessão não era persistida.

Causa: o cookie usava `secure: process.env.NODE_ENV === "production"`. O E2E executa `next start` com `NODE_ENV=production`, porém em `http://127.0.0.1:5100`, produzindo cookie `Secure` sobre HTTP.

Correção integrada no PR #271:

- HTTPS direto → `Secure=true`;
- HTTP interno com `x-forwarded-proto=https` → `Secure=true`;
- HTTP direto → `Secure=false`;
- HTTPS direto nunca é rebaixado por header encaminhado;
- login e logout compartilham a mesma política;
- regressão unitária cobre os cenários de transporte.

Evidência final do PR #271 no head `a9f68a34f1a2cf8cf136401edd66eabff5051f7a`:

- ✅ CI #322;
- ✅ E2E #109 / Chromium;
- ✅ E2E #109 / Firefox;
- ✅ E2E #109 / WebKit;
- ✅ Lighthouse baseline #250.

PR #271 integrado em `main` pelo merge `8c2e7e33fd1c339a5a3076ea1ecf4ed45b82d720`.

## 5. Segundo recorte — consistência tipográfica em mobile

O baseline pós-PR #270 introduziu dois usos de `text-xs` em conteúdo financeiro visível:

- texto comparativo dos cards do Dashboard;
- valores do resumo financeiro da listagem de Transações.

O contrato do projeto mantém texto secundário em pelo menos **14px** e não recomenda diminuir fonte para fazer conteúdo caber. A #250 já havia corrigido o mesmo padrão em status visível da importação.

Correção integrada no PR #272:

- Dashboard: comparação dos cards passa de `text-xs` para `text-sm`;
- Transações: valores mobile do resumo passam de `text-xs` para `text-sm`, preservando `sm:text-xl` em viewports maiores;
- o E2E de 320px mede o `font-size` computado dos dois resumos e exige `>= 14px`;
- a checagem existente de ausência de overflow horizontal continua rodando depois da validação tipográfica.

A regressão usa o estilo computado do navegador, não apenas classes Tailwind.

Evidência final do PR #272 no head `3bb20564a8259a1a03000fa14bcedbd96efbaa2f`:

- ✅ CI #325;
- ✅ E2E #112 / Chromium;
- ✅ E2E #112 / Firefox;
- ✅ E2E #112 / WebKit;
- ✅ Lighthouse baseline #253;
- ✅ frontend budget incluído no CI #325;
- ✅ auto-review final no mesmo head, sem findings bloqueantes conhecidos.

PR #272 integrado em `main` pelo merge `c065b8cd2ed7c8bb31c5d220ab7f6635859215f0`.

## 6. Reconciliação da foundation — #247 e #249

A implementação de #247 e #249 já estava integrada pelos PRs #260 e #263. Com a matriz multi-engine atual da #253, a suíte que contém os checks de shell, targets e label-in-name voltou a passar em Chromium, Firefox e WebKit.

A evidência consolidada está em `docs/quality/redesign-v3-foundation-247-249.md`.

### #247 — App shell/mobile

Considerado concluído como responsabilidade de implementação:

- política de `scroll-padding`/`scroll-margin` para topbar, bottom nav e safe areas;
- targets críticos >=44px;
- regressão de 320/360/390px e overflow horizontal;
- estado ativo com pista adicional além da cor;
- cobertura posterior nos três engines da matriz E2E.

Zoom 200%, keyboard-only ponta a ponta, foco não-obscurecido em contexto real, landscape e dispositivo físico passam a ser rastreados exclusivamente pelo gate transversal #253, sem duplicação na #247.

### #249 — Touch targets/primitives

Considerado concluído como responsabilidade de implementação:

- ações prioritárias da importação normalizadas para `Button` quando semanticamente apropriado;
- regressão de target >=44px;
- finding experimental de `label-content-name-mismatch` do calendário reproduzido contextualmente, sem correção especulativa;
- cobertura posterior nos três engines da matriz E2E.

Espaçamento de targets na matriz física, dark/light contextual, Safari/dispositivo real e comportamento sob zoom permanecem no gate transversal #253.

A reconciliação permite encerrar #247 e #249 sem afirmar que o QA físico/manual do Redesign v3 terminou.

## 7. Reconciliação dos fluxos críticos — #250 e #251

A implementação determinística de #250 e #251 já estava integrada pelos PRs #264 e #266. A matriz multi-engine criada pela #253 executa novamente as regressões de reflow e formulários em Chromium, Firefox e WebKit; no head `3bb20564` do PR #272, a suíte completa permaneceu verde nos três engines (E2E #112).

A evidência consolidada está em `docs/quality/redesign-v3-flows-250-251.md`.

### #250 — Reflow e densidade

Considerado concluído como responsabilidade de implementação:

- reflow automatizado das rotas financeiras prioritárias em 320 CSS px;
- ausência de overflow horizontal evitável nas superfícies cobertas;
- wrapping de conteúdo/valores longos;
- tipografia secundária visível preservada em >=14px;
- ação sticky da importação protegida contra a bottom navigation;
- cobertura posterior nos três engines da matriz E2E.

Zoom 200%, text spacing completo, landscape, dispositivo real e comportamento específico de Safari passam a ser rastreados exclusivamente pelo gate transversal #253.

### #251 — Formulários e autenticação

Considerado concluído como responsabilidade de implementação:

- contrato de labels, nomes acessíveis e erros associados;
- foco determinístico após validação inválida e erro global;
- hints de autofill/teclado e inputs nativos preservados;
- ausência de bloqueio deliberado de copy/paste;
- regressão dedicada de acessibilidade de formulários;
- cobertura posterior nos três engines da matriz E2E.

Teclado virtual real, safe-area física, password managers, zoom/orientação, reader/AT e keyboard-only ponta a ponta fora da cobertura determinística passam a ser rastreados exclusivamente pela #253.

A reconciliação permite encerrar #250 e #251 sem declarar como concluída nenhuma validação física/manual que ainda não possui evidência.

## 8. Pendências que continuam manuais

Não marcar como concluído sem evidência real:

- keyboard-only ponta a ponta nas rotas críticas;
- foco não-obscurecido por sticky/fixed UI em contexto real;
- zoom 200% e text spacing;
- dark/light visual completo;
- Safari real;
- iPhone/iOS com teclado virtual e safe-area;
- Android quando disponível;
- password manager real;
- leitor de tela/AT smoke test;
- portrait/landscape em dispositivo real.

## 9. Próximos passos

1. reconciliar #246 e #252 com a evidência final sem duplicar QA manual;
2. executar/registrar a matriz manual disponível;
3. atualizar o ledger final com findings e limitações reais;
4. executar auto-review/gates do head final quando houver novo diff funcional;
5. somente então avaliar o fechamento do roadmap #245.

## 10. Referências

- `AGENTS.md`
- `README.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-foundation-247-249.md`
- `docs/quality/redesign-v3-flows-250-251.md`
- `docs/quality/redesign-v3-reflow-250.md`
- `docs/quality/redesign-v3-forms-251.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/e2e-playwright.md`
- Issue #253
- PR #270
- PR #271
- PR #272
- PR #273