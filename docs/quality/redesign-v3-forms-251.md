# Redesign v3 — Formulários, autenticação e teclado virtual (#251)

Status: **implementação determinística em revisão**  
Issue: [#251](https://github.com/felipe-urgal/controle-gastos/issues/251)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Data: **2026-09-02**

## Objetivo

Registrar a parte verificável em código e automação da revisão de formulários do Redesign v3, sem confundir essa evidência com validação de teclado virtual, password manager ou dispositivo real.

O escopo preserva regras financeiras, autenticação, contratos HTTP/API, schema e migrations. A mudança é de comportamento de formulário, acessibilidade e ergonomia de entrada.

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

Erros de validação customizada passam a devolver o foco ao primeiro campo inválido sem introduzir animação de scroll. Se outro campo inválido já recebeu foco no mesmo ciclo, os demais não roubam esse foco.

### Erro global de submit

`FormContainer` continua anunciando falhas globais por meio do `Alert` e passa a fornecer um ponto de foco programático para o erro quando não existe campo marcado como inválido.

Isso cobre falhas de servidor e validações globais dos formulários financeiros/perfil sem competir com um erro específico de campo.

### Perfil e troca de senha

As validações locais de senha atual ausente e confirmação divergente deixaram de aparecer apenas como erro global. Elas agora são associadas diretamente aos respectivos campos, permitindo foco e contexto previsíveis.

### Autofill e teclado

Os fluxos públicos preservam inputs HTML nativos e os contratos de autofill:

- nome: `autocomplete="name"`;
- e-mail: `autocomplete="email"`, `inputmode="email"`, sem capitalização e sem spellcheck;
- senha de login: `autocomplete="current-password"`;
- criação/reset de senha: `autocomplete="new-password"`.

Foram adicionados `enterkeyhint` coerentes com a sequência dos formulários (`next`, `go`, `send` e `done`) para orientar teclados virtuais que suportem o atributo.

Nenhum handler de `paste`, `copy` ou `cut` foi adicionado e os campos de senha continuam sendo inputs nativos, portanto a implementação não cria bloqueio deliberado para colar senhas ou para integração de password managers.

### Formulários financeiros

Os formulários de conta, categoria e transação continuam usando as primitives compartilhadas. O campo monetário da transação já usa `inputMode="numeric"`; datas permanecem em `input type="date"`; selects e radio groups preservam controles semânticos existentes.

`FormActions` não é sticky/fixed. A política transversal de `scroll-padding`/`scroll-margin` do shell, implementada na #247, continua sendo a proteção automatizável contra foco encoberto por topbar/bottom navigation.

## Regressão automatizada

Foi adicionada `tests/e2e/form-accessibility.spec.mjs`, cobrindo em Chromium:

- `autocomplete`, `inputmode` e `enterkeyhint` dos fluxos públicos;
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

Esses pontos permanecem rastreados na #251 e no gate final #253.

## Auto code review

A revisão do diff deve confirmar antes do merge:

- nenhuma regra de negócio, API, auth server-side, schema ou migration foi alterada;
- foco de erro não entra em loop nem rouba foco de outro campo inválido já focado;
- erro global só recebe foco quando não existe erro específico de campo;
- atributos de autofill/teclado continuam compatíveis com HTML nativo;
- nenhuma barreira a password manager/copy-paste foi introduzida;
- movimento programático não ignora `prefers-reduced-motion`;
- E2E não declara como validado o que depende de dispositivo real;
- documentação e issues refletem as limitações de evidência.

Refs #245, #246, #247, #251 e #253.
