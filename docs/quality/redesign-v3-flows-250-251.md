# Redesign v3 — Reconciliação de reflow e formulários (#250 + #251)

Status: **responsabilidades de implementação concluídas; QA transversal concentrado na #253**  
Issues: [#250](https://github.com/felipe-urgal/controle-gastos/issues/250) e [#251](https://github.com/felipe-urgal/controle-gastos/issues/251)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Gate final: [#253](https://github.com/felipe-urgal/controle-gastos/issues/253)

## Objetivo

Consolidar a evidência já integrada de #250 e #251 e eliminar duplicação de tracking entre essas issues e o QA final #253.

O fechamento das duas issues representa o fim da responsabilidade de **implementação determinística/automatizável**. Não representa validação física de Safari/iOS/Android, teclado virtual, password manager, zoom real, text spacing ou tecnologia assistiva.

## #250 — Reflow e densidade

Implementação principal: PR #264, merge `23f0165e`  
Head funcional validado: `1e1aa2e`

Evidência já integrada:

- rotas financeiras cobertas a 320 CSS px;
- ausência de overflow horizontal evitável nas superfícies cobertas;
- conteúdo e valores longos com wrapping compatível com mobile;
- tipografia visível da importação preservada em >=14px;
- ação sticky da importação posicionada acima da bottom navigation;
- CI #292, E2E Chromium #85 e Lighthouse #226 verdes no head funcional.

A matriz posterior da #253 voltou a executar a suíte E2E em Chromium, Firefox e WebKit. No head `3bb20564` do PR #272, a regressão de reflow/tipografia permaneceu verde nos três engines (E2E #112), com CI #325, Lighthouse #253 e frontend budget verdes.

### Limite de evidência transferido para #253

Continuam exclusivamente no gate transversal:

- zoom de navegador em 200%;
- text spacing completo;
- portrait/landscape real;
- dispositivo móvel real;
- inspeção contextual de scroll horizontal essencial quando houver;
- comportamento dependente de Safari/device físico.

## #251 — Formulários, autenticação e teclado virtual

Implementação principal: PR #266, merge `d8107209`  
Head funcional validado: `2d8f5ff9`

Evidência já integrada:

- labels e nomes acessíveis associados;
- `aria-invalid`, `aria-describedby` e `aria-errormessage` coerentes;
- foco no primeiro campo inválido pela ordem do DOM;
- foco contextual em erro global quando não há erro específico de campo;
- `autocomplete`, `inputMode`, `enterKeyHint`, capitalização e spellcheck revisados;
- inputs nativos preservados, sem bloqueio deliberado de copy/paste;
- CI #303, E2E Chromium #94 e Lighthouse #235 verdes no head funcional.

A matriz posterior da #253 também executa `form-accessibility.spec.mjs` em Chromium, Firefox e WebKit. No head `3bb20564` do PR #272, a suíte E2E completa permaneceu verde nos três engines (E2E #112).

### Limite de evidência transferido para #253

Continuam exclusivamente no gate transversal:

- teclado virtual real em iOS/Android;
- campo/CTA com teclado aberto e safe-area física;
- password manager/autofill real;
- copy/paste em combinações específicas de navegador/OS;
- zoom 200% e orientação real;
- keyboard-only ponta a ponta além da cobertura automatizada;
- leitor de tela/AT real.

## Decisão de reconciliação

#250 e #251 não precisam permanecer abertas apenas para duplicar itens já explicitamente pertencentes à matriz final da #253.

Após o merge desta reconciliação:

- #250 fecha como implementação de reflow concluída;
- #251 fecha como implementação de formulários/acessibilidade determinística concluída;
- toda validação física/manual remanescente continua aberta e visível em #253;
- nenhuma pendência manual é convertida em sucesso por inferência de CI/E2E/Lighthouse.

## Auto-review documental

- referências de merges, heads e gates conferidas com a documentação já integrada;
- a matriz multi-engine é tratada como evidência de engine, não Safari/device real;
- nenhuma regra financeira, API, autenticação, ownership, schema ou migration é alterada;
- não há mudança funcional de código nesta reconciliação;
- não há finding bloqueante conhecido no diff documental.

## Referências

- `docs/quality/redesign-v3-reflow-250.md`
- `docs/quality/redesign-v3-forms-251.md`
- `docs/quality/redesign-v3-final-253.md`
- `docs/design/redesign-v3-roadmap.md`
- PR #264
- PR #266
- PR #271
- PR #272
- Issues #245, #250, #251 e #253
