# Redesign v3 — Formulários, autenticação e teclado virtual (#251)

Status: **responsabilidade de implementação concluída; QA transversal em #253**  
Issue: [#251](https://github.com/felipe-urgal/controle-gastos/issues/251)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Implementação: [PR #266](https://github.com/felipe-urgal/controle-gastos/pull/266)  
Data: **2026-09-02**

## Objetivo

Registrar a parte verificável em código e automação da revisão de formulários do Redesign v3, sem confundir essa evidência com validação de teclado virtual, password manager ou dispositivo real.

O escopo preserva regras financeiras, autenticação, contratos HTTP/API, schema e migrations. A mudança é de comportamento de formulário, acessibilidade e ergonomia de entrada.

## Resultado integrado

O PR #266 foi integrado em `main` pelo merge commit `d8107209dde40c7d214edbfdbfab9c3748e56e26`.

Head final revisado e validado: `2d8f5ff96aa132e2cb238ca437821906b31eb192`.

Gates verdes no mesmo head:

- CI #303;
- E2E Chromium #94;
- Lighthouse baseline #235.

A execução E2E #93 anterior falhou no novo teste porque `getByLabel(..., exact: true)` não resolveu um input que o trace e o DOM mostravam corretamente associado ao `label`. O teste foi corrigido para localizar os inputs pelo atributo nativo `name` e validar separadamente `toHaveAccessibleName(...)`. Nenhuma alteração visual ou semântica foi feita apenas para satisfazer o locator.

A matriz posterior da #253 executa a suíte completa em Chromium, Firefox e WebKit. No head `3bb20564` do PR #272, a regressão de formulários permaneceu verde nos três engines (E2E #112), junto com CI #325, Lighthouse #253 e frontend budget.

## Superfícies revisadas

- login;
- cadastro;
- recuperação de senha;
- redefinição de senha;
- edição de perfil e troca de senha;
- primitive compartilhada `Input`;
- container compartilhado de formulários financeiros;
- formulários de transação, conta e categoria por herança das primitives existentes.

## Evidência determinística

### Associação entre campo e erro

A primitive `Input` mantém `label` associado pelo `htmlFor`, `aria-invalid` e `aria-describedby` e passa a expor também `aria-errormessage` apontando para a mensagem visível do campo.

Erros de validação customizada devolvem o foco ao primeiro campo inválido pela ordem do DOM, limitado ao formulário atual e sem animação de scroll. Se outro campo inválido do mesmo formulário já recebeu foco, os demais não roubam esse foco.

### Erro global de submit

`FormContainer` continua anunciando falhas globais por meio do `Alert` e passa a fornecer um ponto de foco programático para o erro quando não existe campo marcado como inválido no mesmo formulário.

Isso cobre falhas de servidor e validações globais dos formulários financeiros/perfil sem competir com um erro específico de campo.

### Perfil e troca de senha

As validações locais de senha atual ausente e confirmação divergente deixaram de aparecer apenas como erro global. Elas agora são associadas diretamente aos respectivos campos, permitindo foco e contexto previsíveis.

O campo obrigatório de nome e a senha atual obrigatória quando a troca de senha está ativa também convertem a validação nativa em mensagem associada ao campo, evitando depender apenas do tooltip do navegador.

### Autofill e teclado

Os fluxos públicos preservam inputs HTML nativos e os contratos de autofill:

- nome: `autocomplete="name"`;
- e-mail: `autocomplete="email"`, `inputmode="email"`, sem capitalização e sem spellcheck;
- senha de login: `autocomplete="current-password"`;
- criação/reset de senha: `autocomplete="new-password"`.

Foram adicionados `enterkeyhint` coerentes com a sequência dos formulários (`next`, `go`, `send` e `done`) para orientar teclados virtuais que suportem o atributo. Campos de senha revisados também explicitam `autocapitalize="none"` e `spellcheck="false"`.

Nenhum handler de `paste`, `copy` ou `cut` foi adicionado e os campos de senha continuam sendo inputs nativos, portanto a implementação não cria bloqueio deliberado para colar senhas ou para integração de password managers.

### Formulários financeiros

Os formulários de conta, categoria e transação continuam usando as primitives compartilhadas. O campo monetário da transação já usa `inputMode="numeric"`; datas permanecem em `input type="date"`; selects e radio groups preservam controles semânticos existentes.

`FormActions` não é sticky/fixed. A política transversal de `scroll-padding`/`scroll-margin` do shell, implementada na #247, continua sendo a proteção automatizável contra foco encoberto por topbar/bottom navigation.

## Regressão automatizada

Foi adicionada `tests/e2e/form-accessibility.spec.mjs`, cobrindo:

- nome acessível dos campos públicos;
- `autocomplete`, `inputmode`, `enterkeyhint`, capitalização e spellcheck quando aplicável;
- foco no primeiro campo inválido em cadastro, recuperação e reset;
- `aria-invalid` e `aria-errormessage` apontando para a mensagem de erro real.

Essa regressão valida o contrato DOM/comportamental. Ela **não** simula com fidelidade um teclado virtual físico nem prova compatibilidade de um password manager específico.

## WCAG 2.2 relacionada

- 1.3.1 Info and Relationships (A)
- 1.3.5 Identify Input Purpose (AA)
- 2.1.1 Keyboard (A)
- 2.4.3 Focus Order (A)
- 2.4.7 Focus Visible (AA)
- 2.4.11 Focus Not Obscured (Minimum) (AA)
- 3.3.1 Error Identification (A)
- 3.3.2 Labels or Instructions (A)
- 3.3.7 Redundant Entry (A)
- 3.3.8 Accessible Authentication (Minimum) (AA)
- 4.1.2 Name, Role, Value (A)

## Validações que permanecem manuais

Não são declaradas como concluídas por esta implementação:

- teclado virtual real em iOS e Android;
- campo e CTA visíveis com teclado virtual aberto;
- password managers/autofill em navegador e dispositivo reais;
- copy/paste em combinações específicas de navegador/OS;
- zoom 200%;
- orientação portrait/landscape;
- keyboard-only ponta a ponta fora da cobertura determinística;
- leitor de tela/AT em ambiente real.

Esses pontos **não permanecem como responsabilidade duplicada da #251**. A partir da reconciliação final, são rastreados exclusivamente no gate transversal #253.

## Reconciliação de fechamento

A #251 pode ser encerrada como responsabilidade de implementação porque:

- os contratos determinísticos de labels, erros, foco e autofill foram integrados;
- a regressão dedicada foi repetida posteriormente na matriz multi-engine da #253;
- não há finding P0/P1 conhecido de formulário que precise permanecer nesta issue;
- teclado virtual, safe-area física, password manager e AT reais já estão explicitamente listados na #253.

A evidência conjunta com #250 está consolidada em `docs/quality/redesign-v3-flows-250-251.md`.

## Auto code review final

O diff final do head `2d8f5ff9` foi revisado antes do merge. Findings encontrados e corrigidos durante o ciclo:

- removido scroll suave ao focar erro para não contrariar reduced motion;
- busca de campos inválidos limitada ao formulário atual;
- primeiro erro determinado pela ordem do DOM em vez da ordem de effects;
- capitalização e spellcheck de campos de senha explicitados;
- validações obrigatórias do perfil associadas a mensagens de campo;
- helper inicial do E2E corrigido para receber `page` explicitamente;
- locator frágil do E2E substituído após análise do trace, preservando a verificação de nome acessível.

A revisão final não encontrou findings bloqueantes remanescentes. Não havia comments ou review threads pendentes, e a branch estava 0 commits atrás da `main` antes do merge.

Refs #245, #246, #247, #251, #253 e PR #266.