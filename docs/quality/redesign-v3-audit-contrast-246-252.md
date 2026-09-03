# Redesign v3 — Reconciliação da auditoria e contraste (#246 / #252)

Status: **responsabilidades determinísticas concluídas; QA transversal permanece em #253**  
Issues: [#246](https://github.com/felipe-urgal/controle-gastos/issues/246) e [#252](https://github.com/felipe-urgal/controle-gastos/issues/252)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
QA final: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)

## Objetivo

Reconciliar as duas últimas issues de implementação/baseline ainda abertas do Redesign v3 sem transformar automação em evidência física.

A #246 continua sendo a fotografia histórica que originou o backlog. A #252 contém a implementação determinística que corrigiu os findings de contraste, estados e mensagens. O que resta nas duas depende de inspeção transversal/manual e já pertence ao gate final #253.

Nenhuma regra financeira, API, autenticação, ownership, schema ou migration é alterada por esta reconciliação.

## #246 — Auditoria/baseline

A auditoria inicial registrada em `docs/quality/redesign-v3-audit.md` cumpriu sua responsabilidade de baseline:

- inventariou rotas públicas e autenticadas prioritárias;
- registrou contratos positivos existentes;
- classificou findings e riscos sem promover hipótese a falha confirmada;
- vinculou cada finding relevante às issues de implementação;
- identificou o problema de foco dos filtros (#248), contraste de `text-subtle` (#252), tipografia/reflow da importação (#250), drift de primitive (#249) e riscos de shell/forms/AT;
- preservou explicitamente como pendentes zoom, text spacing, keyboard-only, reader/AT, Safari/device real e demais itens não demonstráveis naquele ambiente.

Os findings determinísticos derivados do baseline foram tratados nas issues filhas e seus PRs. Portanto a #246 não precisa permanecer aberta apenas para repetir a matriz transversal que a #253 já possui como responsabilidade explícita.

A documentação original da auditoria permanece histórica e não é reescrita para fingir que os testes manuais existiam no momento da baseline.

## #252 — Contraste, estados e mensagens

A implementação determinística foi integrada pelo PR #268, com follow-up documental no PR #269.

Evidência do head final `38ed0ef4`:

- CI #308 verde;
- E2E Chromium #97 verde;
- Lighthouse baseline #238 verde;
- auto-review final executado no mesmo head.

A entrega comprovou:

- `--text-subtle` claro >=4.5:1 nas superfícies suportadas;
- `--border-strong` >=3:1 nas superfícies suportadas quando a fronteira identifica controle;
- `--border` decorativo preservado como sutil;
- estados prioritários da importação migrados para tokens semânticos;
- válido/duplicata/inválido e income/expense com pistas textuais além da cor;
- live regions `status/polite` limitadas ao conteúdo textual relevante;
- regressão de contraste calculada a partir dos tokens reais;
- E2E do preview real protegendo os status dinâmicos.

A matriz multi-engine criada depois pela #253 voltou a executar a suíte em Chromium, Firefox e WebKit; no PR #272, E2E #112 ficou verde nos três engines. Isso aumenta confiança de engine, mas WebKit/Linux não equivale a Safari/iOS/macOS real.

## Pendências transferidas exclusivamente para #253

Não são declaradas como concluídas por este documento:

- keyboard-only ponta a ponta;
- foco não-obscurecido em contexto real;
- zoom 200%;
- text spacing completo;
- inspeção visual dark/light de toda a matriz;
- classificação contextual de bordas/ícones restantes dependente de renderização;
- reader/AT smoke test real;
- Safari real;
- iOS/Android e safe-area física;
- teclado virtual e password managers reais;
- portrait/landscape em dispositivo real.

Esses itens são transversais e permanecem visíveis em `docs/quality/redesign-v3-final-253.md` e na issue #253.

## Critério de fechamento de #246 e #252

O fechamento representa apenas que:

1. a responsabilidade de baseline/triagem da #246 está concluída;
2. a responsabilidade determinística de implementação da #252 está concluída;
3. nenhum finding P0/P1 determinístico conhecido dessas duas issues ficou solto sem tratamento ou tracking;
4. toda validação que exige ambiente físico, AT ou inspeção contextual continua no gate final #253.

O fechamento **não** significa conformidade WCAG integral nem conclusão do Redesign v3.

## Auto-review desta reconciliação

- escopo restrito a documentação/tracking;
- evidências históricas preservadas em vez de reescritas retroativamente;
- nenhuma validação manual foi convertida em sucesso artificial;
- WebKit foi tratado como evidência de engine, não como Safari real;
- referências a PRs, heads e gates conferidas contra os documentos já integrados;
- nenhum finding bloqueante conhecido neste diff documental.

## Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/redesign-v3-final-253.md`
- PR #268
- PR #269
- PR #271
- PR #272
- PR #273
- PR #274

Refs #245, #246, #252 e #253.
