# Auditoria de client boundaries pós-Orbit

Issue: #524  
Roadmap: #290 — Fase 1, item 9  
Baseline auditado: `f084447ad6d9ff8973f27c708c46059fc78118c7`

## Objetivo

Revisar a superfície `'use client'` após o rollout Orbit e separar boundaries necessárias de boundaries intermediárias redundantes, sem transformar heurística de bundle em otimização especulativa.

O baseline pós-Orbit (#481) mediu **1.302,6 KiB** de JS total e maior chunk de **227,7 KiB**, ambos dentro do frontend budget. O bundle analyzer atual não atribui módulos porque não gera relatório com Turbopack; portanto esta auditoria não atribui custo em KiB a um componente específico.

## Critérios

- **necessária** — o módulo usa hooks, browser APIs, state/context ou recebe/declara callbacks interativos que exigem boundary client;
- **intermediária redundante** — o módulo não usa nenhuma capacidade client própria e apenas compõe componentes que já são ilhas cliente;
- **inconclusiva** — pode haver oportunidade, mas falta evidência de custo/benefício para justificar mudança.

## Evidência

| Superfície | Evidência | Classificação | Ação |
| --- | --- | --- | --- |
| `app/context/auth-context.tsx` | reducer/effects/router e estado de autenticação | necessária | manter |
| `app/context/theme-context.tsx` | effects/external store e estado de tema | necessária | manter |
| `app/context/ui-context.tsx` | context/state/callbacks de UI | necessária | manter |
| páginas Orbit de Dashboard/Contas/Transações/Calendário | hooks, browser APIs, filtros, overlays, effects e eventos | necessária | manter |
| forms de conta/categoria/transação | `useState`, router, submit handlers e inputs interativos | necessária | manter |
| edit/show de conta/categoria/usuário | hooks de leitura/mutation e callbacks | necessária | manter |
| `NewPage` / `PageHeader` | compõem `ProtectedRoute`; `PageHeader` também suporta callback `onDelete`; consumidores client importam esses componentes | necessária no desenho atual | não refatorar neste recorte |
| `account/new/index.tsx` | sem hook/state/browser API; props estáticas; compõe `NewPage` + `AccountForm` client | **intermediária redundante** | #525 |
| `category/new/index.tsx` | sem hook/state/browser API; props estáticas; compõe `NewPage` + `CategoryForm` client | **intermediária redundante** | #525 |
| reexports Orbit (`account/index/index.tsx`, `transactions/index/index.tsx`, `calendar/calendar/index.tsx`, `dashboard/dashboard/index.tsx`) | a diretiva é redundante no arquivo reexport, mas o alvo reexportado é uma árvore client real | inconclusiva / sem ganho material demonstrado | não abrir issue isolada |
| `SplashScreen` + `framer-motion` | único uso funcional encontrado de `framer-motion`; componente é exibido durante loading de `ProtectedRoute` | inconclusiva | manter; medir antes de substituir |

## Finding material

### #525 — wrappers `new` de conta e categoria

As rotas App Router de `/contas/nova` e `/categorias/nova` já são server components e carregam wrappers intermediários marcados `'use client'` sem necessidade própria. Os forms filhos mantêm sua boundary client real.

O recorte seguro é remover somente as duas diretivas e deixar o Next build validar a composição server wrapper → client children. Nenhum markup, copy ou comportamento deve mudar.

## Decisões sem mudança

### Reexports Orbit

Remover uma diretiva de um arquivo que apenas reexporta um componente Orbit já totalmente client não demonstra, por si só, redução da ilha hidratada. Fazer isso em massa seria churn sem evidência.

### `framer-motion`

O baseline aponta crescimento agregado de JS, mas não atribui esse crescimento a `framer-motion`. A biblioteca aparece funcionalmente no SplashScreen e não será removida apenas por heurística. Qualquer substituição futura deve comparar bundle/build e UX antes/depois.

### Contexts globais

Auth, theme e UI são client por natureza no desenho atual. Reduzir seu alcance exigiria análise de provider placement e rerenders, não simples remoção de diretiva; não foi encontrado finding material suficiente neste audit para justificar refactor amplo.

## Regra de manutenção

Ao criar componente novo:

1. não adicionar `'use client'` por transitividade; adicionar somente quando o próprio módulo precisar de capacidade client;
2. server components podem compor ilhas client com props serializáveis;
3. manter hooks/browser APIs na menor ilha funcional que preserve clareza;
4. não fragmentar componentes pequenos apenas para perseguir contagem de boundaries;
5. otimização de dependência pesada exige medição comparável.

## Critério de conclusão

#524 pode ser encerrada quando:

- este audit estiver integrado em `main`;
- #525 estiver concluída;
- CI canônico de `main` estiver verde após os merges.
