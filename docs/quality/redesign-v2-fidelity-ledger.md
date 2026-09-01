# Fidelity ledger — Redesign v2

Data da auditoria: **2026-08-30**  
Roadmap: #163  
QA final: #172  
Implementação: PR #186  
Referência visual: `docs/design/redesign-prototype-2-approved.jpg`  
Spec: `docs/design/redesign-v2-spec.md`

> **Nota de sincronização — 2026-09-01:** este documento é uma evidência **histórica** do fechamento visual do PR #186. Naquela fotografia o Dashboard ainda era tratado como evolução funcional separada; depois ele foi efetivamente entregue na #154 / PR #197. A importação CSV/OFX também foi entregue na #155 / PR #199. As métricas e findings abaixo não foram reescritos retroativamente.

## Objetivo

Registrar a revisão transversal final do **Protótipo 2 — Dark Command Center**, separando divergências acidentais de adaptações intencionais ao produto real. O protótipo é fonte de verdade visual; rotas, regras de domínio e funcionalidades entregues continuam sendo a fonte funcional de verdade.

## Evidências usadas no fechamento

- auditoria do código e busca por resíduos do visual legado;
- comparação com a direção e regras da spec aprovada;
- CI completo com lint, typecheck, testes, build e frontend budget;
- Lighthouse mobile nas rotas críticas então existentes, com sessão autenticada isolada;
- Preview Vercel em estado `Ready` e smoke HTTP da landing;
- revisão de componentes responsivos, touch targets, foco, safe-area, tipografia e ARIA;
- auto code review completo do diff pelo agente, seguindo `AGENTS.md`;
- #148 preservada para validações que dependem de dispositivo/navegador real.

## Ledger de diferenças e findings

| Área | Finding / diferença | Classificação | Ação / justificativa | Estado |
| --- | --- | --- | --- | --- |
| Root layout | gradiente `slate → purple → indigo` remanescente | divergência acidental | removido; fundo passa a vir dos tokens/superfícies | ✅ PR #186 |
| Error boundary | `bg-white/10` + `backdrop-blur` | divergência acidental | glassmorphism removido | ✅ corrigido |
| Error boundaries | digest técnico em 12px | legibilidade | elevado para 14px; corpo/ação em 16px | ✅ corrigido |
| Calendário | `aria-label` em `div` genérica | acessibilidade | nome completo exposto semanticamente | ✅ corrigido |
| Calendário | dia atual não incluía “Hoje” no nome acessível | acessibilidade | nome acessível alinhado ao texto visível | ✅ corrigido |
| Tipografia | `text-xs` em wrappers de ícone | diferença intencional | não representa texto legível ao usuário | ✅ justificado |
| Cores semânticas | azul/roxo/laranja em categorias/ícones | diferença intencional | permitido quando há significado de domínio | ✅ justificado |
| Features do mockup | features sem issue própria não aparecem | diferença intencional | protótipo não autoriza funcionalidade fictícia | ✅ preservado |
| PWA/dispositivo | standalone, teclado virtual e leitor de tela não simulados | limite de evidência | mantidos na #148 | ⏭️ #148 |

### Leitura histórica da linha de features

Em 2026-08-30, Dashboard ainda estava fora do escopo do PR #186. Em 2026-08-31, a #154 foi concluída no PR #197 e o Dashboard passou a fazer parte do produto real. Isso **não invalida** o ledger: confirma a regra de que feature funcional só entra após issue/entrega própria.

Metas, Relatórios, notificações, plano premium e próximos vencimentos continuam não autorizados apenas por aparecerem no mockup.

## Varredura de resíduos visuais

No fechamento do PR #186 foram removidos os usos materiais identificados de:

- `purple-` / `indigo-` decorativos no root layout;
- `bg-gradient` decorativo no root layout;
- `backdrop-blur` na error boundary;
- texto visível abaixo da escala mínima nas error boundaries.

Usos remanescentes sem impacto visual material, como utilitários não renderizados ou dimensionamento de ícones, foram documentados sem ampliar artificialmente o escopo do QA.

## Responsividade e interação

A revisão preservou como evidência estrutural/automatizada:

- shell e páginas com breakpoints mobile/desktop;
- bottom navigation com safe-area;
- controles críticos compatíveis com ~44px;
- foco `focus-visible`;
- modais/drawers com semântica, teclado e Escape;
- `prefers-reduced-motion`;
- Lighthouse em perfil mobile.

Validações físicas continuam na #148.

## Lighthouse pós-redesign — fotografia histórica

Execução consolidada no head `8bf8a22e15233b421ecef7c69561713c4e6b68ca`, Lighthouse #96 / run `33330612996`:

| Rota | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 94 | 100 | 96 | 3.154 ms | 0,000 | 42 ms |
| `/login` | 93 | 100 | 96 | 3.188 ms | 0,000 | 33 ms |
| `/contas` | 92 | 100 | 100 | 3.316 ms | 0,005 | 46 ms |
| `/transacoes` | 91 | 100 | 100 | 3.362 ms | 0,001 | 138 ms |
| `/calendario` | 91 | 100 | 100 | 3.456 ms | 0,003 | 69 ms |

Resultado: **workflow success**, com Accessibility 100 em todas as rotas medidas.

O Dashboard não é inserido retroativamente nesta tabela. Após sua entrega, o workflow corrente passou a medi-lo e o PR #197 registrou Lighthouse #130 verde incluindo `/dashboard`.

## Auto code review e gates do PR #186

O diff completo foi revisado conforme `AGENTS.md`, cobrindo arquitetura, segurança, integridade, API, frontend, acessibilidade, responsividade, performance, banco/deploy e documentação.

No head final validado do PR #186:

- CI: ✅;
- lint/typecheck/test/build: ✅;
- frontend budget: ✅;
- Lighthouse: ✅;
- Preview funcional: ✅;
- auto code review: ✅ sem finding bloqueante conhecido.

A indisponibilidade temporária do bot externo Codex por quota não substituiu nem invalidou o auto review obrigatório executado pelo agente.

## Conclusão

O redesign v2 foi encerrado na #163/#172 sem divergência visual ou de acessibilidade bloqueante conhecida. Evoluções funcionais posteriores — inclusive Dashboard #154/#197 e importação #155/#199 — reutilizam o baseline visual aprovado sem reabrir o roadmap de redesign.

A #148 continua sendo a fonte de evidência para smoke PWA/dispositivo real.

Refs #148, #154, #155, #163, #172, PR #186, PR #197 e PR #199.
