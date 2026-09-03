# Redesign v3 — Reconciliação da foundation #247 e #249

Status: **pronto para encerramento das issues de implementação; QA transversal segue em #253**  
Issues: [#247](https://github.com/felipe-urgal/controle-gastos/issues/247) e [#249](https://github.com/felipe-urgal/controle-gastos/issues/249)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Gate final: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Baseline desta reconciliação: `main` em `c065b8cd2ed7c8bb31c5d220ab7f6635859215f0`

## 1. Objetivo

Reconciliar as duas issues de foundation que já tiveram implementação, regressões e gates integrados, evitando manter #247 e #249 abertas apenas por validações transversais que já pertencem formalmente ao gate final #253.

Esta reconciliação **não transforma automação em evidência de dispositivo real**. Zoom 200%, Safari/iPhone real, teclado virtual, safe-area física, reader/AT, password manager e inspeção visual contextual continuam sob #253 quando aplicáveis.

## 2. #247 — App shell e navegação mobile

Implementação principal: PR #260 — `fix: revisar app shell mobile do redesign v3`  
Head validado: `b44fd8ce84ebbe3726d437defb9ad2b4eb2cf7d3`  
Merge: `4c2c6c3c60795c5aa8799f65cb7e36d9f3212084`

### Evidência integrada

- política explícita de `scroll-padding`/`scroll-margin` considerando topbar, bottom nav e safe areas;
- contrato comum de altura do shell mobile;
- target mínimo interno de aproximadamente 44px para marca, ações da topbar e itens da bottom nav;
- labels da bottom nav preservadas em 360/390px, com modo compacto apenas abaixo de 340px;
- estado ativo reforçado por mais de uma pista visual;
- E2E para 320/360/390px, ausência de overflow horizontal evitável, targets e spacing de foco;
- CI #273 verde;
- E2E Chromium #66 verde;
- Lighthouse #206 verde no head validado.

### Evidência acumulada posterior

O mesmo fluxo E2E passou a rodar em matriz independente após o PR #271. No head final do PR #271, o E2E #109 passou em Chromium, Firefox e WebKit. Após o recorte tipográfico do PR #272, o E2E #112 voltou a passar nos três engines, preservando os checks de shell/mobile já existentes.

### Reconciliação

A responsabilidade de implementação da #247 está concluída. Os itens abaixo não permanecem como dívida exclusiva da #247; são validações finais transversais e seguem explicitamente em #253:

- zoom 200% e text spacing em runtime;
- keyboard-only ponta a ponta e inspeção contextual de foco não-obscurecido;
- landscape;
- Safari/iPhone e demais dispositivos reais;
- strings/labels extremas quando dependerem de inspeção visual contextual.

## 3. #249 — Touch targets e controles interativos

Implementação principal: PR #263 — `fix: padronizar controles interativos do redesign v3`  
Head validado: `0d85afff2b2206cdcb33abd1b2d138d951381d42`  
Merge: `7022a93ca879856b59ba8e486728e8063aa0f7b3`

### Evidência integrada

- `Importar CSV/OFX` migrado para a primitive `Button`;
- ações equivalentes da importação (`Cancelar`, `Gerar preview`, `Confirmar`, `Importar outro arquivo`, `Ver transações`) migradas para a mesma primitive quando semanticamente apropriado;
- estados disabled/loading preservados pelo contrato compartilhado;
- target crítico coberto por regressão >=44px;
- exceções legítimas mantidas como controles especializados, sem migração indiscriminada;
- finding experimental `label-content-name-mismatch` do dia atual do calendário foi reproduzido contextualmente no browser em vez de gerar correção especulativa;
- regressão exige que o accessible name comece pelo texto visível `<dia> Hoje`;
- CI #280 verde;
- E2E #73 verde;
- Lighthouse #214 verde no head validado.

### Evidência acumulada posterior

A suíte que contém os checks de target e label-in-name passou posteriormente em Chromium, Firefox e WebKit na matriz final da #253 (E2E #109 e novamente #112 após o PR #272).

### Reconciliação

A responsabilidade de implementação da #249 está concluída. As validações contextuais remanescentes deixam de ser duplicadas na issue e seguem no gate final #253:

- inspeção completa de espaçamento entre alvos em toda a matriz real;
- dark/light contextual;
- Safari/dispositivo real;
- comportamento de foco/targets em zoom e estados que só possam ser julgados pela renderização final.

## 4. Estado após a reconciliação

| Issue | Implementação | Regressão automatizada | Multi-engine atual | Pendência final |
| --- | --- | --- | --- | --- |
| #247 | PR #260 integrado | 320/360/390px, overflow, targets, scroll spacing | Chromium/Firefox/WebKit via #253 | QA manual transversal em #253 |
| #249 | PR #263 integrado | targets, primitives e label-in-name do calendário | Chromium/Firefox/WebKit via #253 | QA manual transversal em #253 |

Portanto, #247 e #249 podem ser encerradas como **implementação concluída e reconciliada**, sem afirmar que a matriz física/manual do Redesign v3 está completa.

## 5. Próximo gate

A #253 permanece dona de:

- keyboard-only ponta a ponta;
- foco não-obscurecido em contexto real;
- zoom 200% e text spacing;
- dark/light visual final;
- Safari/iPhone e demais dispositivos reais quando disponíveis;
- teclado virtual/safe-area física;
- password managers reais;
- leitor de tela/AT smoke test;
- ledger final e fechamento do roadmap #245.

## 6. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-final-253.md`
- PR #260
- PR #263
- PR #271
- PR #272
- Issues #245, #247, #249 e #253
