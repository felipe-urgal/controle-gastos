# Redesign v3 — Fechamento do QA final e roadmap (#253 / #245)

Status: **fechamento preparado — concluído após o merge do PR final**  
QA final: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data: **2026-09-03**  
Baseline final de `main` antes deste fechamento: `75049b3dd13ca1785d6274952f379abca64a4df8`

## 1. Decisão de fechamento

O Redesign v3 pode ser encerrado como **entrega concluída com limitações de evidência explicitamente documentadas**.

Isso significa:

- as correções determinísticas e regressões automatizáveis planejadas foram integradas;
- todas as issues filhas #246–#252 foram concluídas/reconciliadas;
- nenhum finding P0/P1 conhecido permanece sem tratamento ou justificativa no tracking do v3;
- a matriz automatizada relevante ficou verde nos heads funcionais de referência;
- o ambiente de produção correspondente à `main` final está saudável no nível observável disponível;
- validações que exigem hardware, tecnologia assistiva ou comportamento físico específico **não são declaradas como aprovadas**.

O fechamento de #253/#245 **não é uma certificação de conformidade WCAG integral** e não transforma ausência de ambiente físico em sucesso de QA.

## 2. Evidência funcional consolidada

### PR #271 — matriz multi-engine

Head final `a9f68a34`:

- ✅ CI #322;
- ✅ E2E #109 / Chromium;
- ✅ E2E #109 / Firefox;
- ✅ E2E #109 / WebKit;
- ✅ Lighthouse #250;
- ✅ correção e regressão da política `Secure` de autenticação em HTTP local/TLS termination.

### PR #272 — tipografia e reflow mobile

Head final `3bb20564`:

- ✅ CI #325;
- ✅ E2E #112 / Chromium;
- ✅ E2E #112 / Firefox;
- ✅ E2E #112 / WebKit;
- ✅ Lighthouse #253;
- ✅ frontend budget;
- ✅ auto-review final sem findings bloqueantes conhecidos.

### Reconciliações finais

- #247 + #249: PR #273 / `redesign-v3-foundation-247-249.md`;
- #250 + #251: PR #274 / `redesign-v3-flows-250-251.md`;
- #246 + #252: PR #278 / `redesign-v3-audit-contrast-246-252.md`.

Após o PR #278, #246–#252 estão encerradas.

## 3. Produção observável

No momento desta decisão:

- projeto Vercel `controle-gastos` ligado ao repositório `felipe-urgal/controle-gastos`;
- deployment atual da `main` no SHA `75049b3d` com estado **READY** e target **production**;
- domínio principal configurado: `controle-gastos-pessoal.vercel.app`;
- consulta de runtime errors dos últimos 30 minutos sem erros registrados.

Nas últimas 24 horas foi observado um único `DeprecationWarning` do `pg` em `/api/transactions/[id]`, originado em deployment anterior. Não há evidência de crash associado, não é finding de UI/acessibilidade do Redesign v3 e não bloqueia este fechamento. Deve ser tratado como manutenção técnica separada caso passe a se repetir ou cause impacto funcional.

## 4. Limitações de evidência — não executadas nesta rodada

Os itens abaixo **não são marcados como aprovados** porque o ambiente necessário não esteve disponível para uma execução reproduzível nesta rodada:

- Safari real em macOS/iOS;
- iPhone/iOS com teclado virtual e safe-area física;
- Android real com teclado virtual;
- password managers reais;
- VoiceOver/NVDA/TalkBack ou reader/AT equivalente real;
- keyboard-only ponta a ponta manual nas rotas críticas;
- inspeção manual de foco não-obscurecido em todos os contextos sticky/fixed;
- zoom real de navegador em 200%;
- text spacing override completo;
- inspeção visual completa dark/light em toda a matriz;
- portrait/landscape em dispositivo físico;
- classificação contextual de bordas/ícones cuja função visual dependa da renderização real.

WebKit no runner Linux aumenta a confiança de engine, mas não substitui Safari/iOS real.

## 5. Interpretação do gate #253

A #253 é considerada concluída porque o gate final:

1. consolidou as evidências automatizadas disponíveis;
2. encontrou e corrigiu findings reais reproduzíveis durante a matriz;
3. reconciliou todas as issues filhas com seus documentos e gates;
4. registrou sem ambiguidade o que foi e o que não foi validado;
5. não deixou finding P0/P1 conhecido sem owner/justificativa;
6. preservou limitações físicas como limitações, sem falsos checkmarks.

Novos findings provenientes de Safari real, AT, dispositivo físico, zoom/text spacing ou uso de produção devem abrir **novas issues específicas**, em vez de reabrir silenciosamente o escopo histórico do Redesign v3.

## 6. Critério do roadmap #245

Com o merge deste fechamento:

- #246–#252: concluídas;
- #253: concluída com limitações de evidência documentadas;
- documentação de auditoria, foundation, fluxos críticos, contraste e QA final sincronizada;
- roadmap #245 pode ser encerrado.

## 7. Referências

- `AGENTS.md`
- `docs/design/redesign-v3-roadmap.md`
- `docs/quality/redesign-v3-audit.md`
- `docs/quality/redesign-v3-foundation-247-249.md`
- `docs/quality/redesign-v3-flows-250-251.md`
- `docs/quality/redesign-v3-audit-contrast-246-252.md`
- `docs/quality/redesign-v3-contrast-252.md`
- `docs/quality/redesign-v3-final-253.md`
- PRs #271, #272, #273, #274 e #278
- Issues #245 e #253
