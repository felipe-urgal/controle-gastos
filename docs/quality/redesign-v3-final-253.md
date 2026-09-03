# Redesign v3 — QA final da issue #253

Status: **em execução**  
Issue: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Branch inicial: `qa/redesign-v3-final-253`  
Baseline de `main` no início da execução: `e8c6a0487caac10fce41d72d41ce7abf025c3ab4`

## 1. Objetivo

Consolidar o QA final do Redesign v3 sem confundir automação com validação física. A #253 é o gate de reconciliação das pendências de #246, #247, #249, #250, #251 e #252.

A execução deve preservar as invariantes de `AGENTS.md` e separar claramente:

- evidência determinística reproduzível em CI;
- inspeção de navegador/engine;
- validação que depende de Safari/iPhone, teclado virtual, safe-area física, password manager ou tecnologia assistiva real.

## 2. Baseline atual

O trabalho parte do `main` após o PR #270 (`ajustes`). Esse PR é tratado como baseline visual atual; esta etapa não reverte as compactações mobile introduzidas nele apenas para voltar ao layout anterior.

As alterações informais já testadas em iPhone 13 Pro Max servem como contexto de produto, mas não são usadas isoladamente para marcar os critérios formais da #253 como concluídos. Evidência de device QA precisa indicar fluxo, estado, orientação e resultado observado.

## 3. Primeiro recorte — matriz multi-engine do Playwright

Antes desta branch, o Playwright e o GitHub Actions executavam somente Chromium. A #253 exige Chromium, Firefox e WebKit/Safari quando disponíveis.

Mudanças deste recorte:

- `playwright.config.mjs` passa a definir projetos `chromium`, `firefox` e `webkit`;
- `.github/workflows/e2e.yml` passa a executar uma matriz independente por engine;
- `fail-fast: false` preserva evidência dos três jobs quando um engine falha;
- cada job instala apenas o browser necessário e usa PostgreSQL efêmero próprio;
- artefatos de Playwright passam a ser nomeados por browser;
- `pnpm test:e2e:install` instala os três browsers para desenvolvimento local;
- `docs/quality/e2e-playwright.md` documenta a nova matriz e seus limites.

A suíte existente já contém checks determinísticos de viewport mobile, incluindo 320px e 390px, além de foco, overflow horizontal, touch targets, filtros e reflow. A matriz nova reaproveita essa cobertura em vez de duplicar specs apenas para satisfazer checklist.

### Limite da evidência WebKit

WebKit no runner Linux aumenta a confiança de compatibilidade com a engine do Safari, mas **não equivale a Safari real em iOS/macOS**. Não valida por si só:

- teclado virtual;
- safe-area física/notch;
- password manager/autofill real;
- VoiceOver;
- comportamento específico do Safari do dispositivo;
- orientação/zoom em hardware real.

Esses itens continuam pendentes até evidência manual.

## 4. Observação do baseline pós-PR #270

O PR #270 melhorou a compactação percebida em mobile, porém introduziu pontos que precisam ser reconciliados durante o QA final sem serem alterados neste primeiro commit de infraestrutura:

- `app/components/pages/dashboard/dashboard/index.tsx` usa `text-xs` no texto comparativo dos cards em mobile;
- `app/components/pages/transactions/index/summary/index.tsx` usa `text-xs` nos valores do resumo em mobile.

O contrato do projeto mantém texto secundário em pelo menos 14px e a evidência anterior da #250 já removeu `text-xs` de status visível pelo mesmo motivo. Portanto estes pontos ficam registrados como **finding P2 de consistência/tipografia a reconciliar na #253**, não como prova automática de falha WCAG.

Nenhuma correção visual foi aplicada neste primeiro recorte para não misturar a ativação da matriz de QA com decisões de densidade. O finding deve ser validado no contexto final de 320/360/390px antes do fechamento.

## 5. Evidência automatizada esperada do PR

O PR desta branch só pode declarar a matriz integrada após o head final produzir evidência dos três jobs:

- Chromium;
- Firefox;
- WebKit.

Se um engine falhar:

1. inspecionar trace/screenshot/vídeo e logs;
2. classificar se é bug real, flake ou premissa específica do browser;
3. corrigir finding relevante;
4. repetir os gates no novo head;
5. não remover/desabilitar o engine apenas para obter verde.

## 6. Pendências que continuam manuais

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

## 7. Critério para o próximo passo

Após o CI multi-engine ficar saudável, usar os resultados para:

1. registrar browser-specific findings, se houver;
2. reconciliar o finding P2 de tipografia do baseline atual;
3. atualizar #253 e as issues filhas afetadas;
4. executar/registrar a matriz manual disponível;
5. somente então preparar o ledger final e o fechamento do roadmap #245.

## 8. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-reflow-250.md`
- `docs/quality/redesign-v3-forms-251.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/e2e-playwright.md`
- Issue #253
- PR #270
