# Fidelity ledger — Redesign v2

Data: **2026-08-30**  
Roadmap: #163  
QA final: #172  
Implementação: PR #186  
Referência visual: `docs/design/redesign-prototype-2-approved.jpg`  
Spec: `docs/design/redesign-v2-spec.md`

## Objetivo

Registrar a revisão transversal final do **Protótipo 2 — Dark Command Center**, separando divergências acidentais de adaptações intencionais ao produto real. O protótipo é fonte de verdade visual; as rotas e regras de domínio existentes continuam sendo a fonte funcional de verdade.

## Evidências usadas

- auditoria do código e busca por resíduos do visual legado;
- comparação com a direção e regras da spec aprovada;
- CI completo com lint, typecheck, testes, build e frontend budget;
- Lighthouse mobile nas cinco rotas críticas com sessão autenticada isolada;
- Preview Vercel em estado `Ready` e smoke HTTP da landing;
- revisão transversal de componentes responsivos, touch targets, foco, safe-area, tipografia e ARIA;
- #148 preservada para o que exige dispositivo real, standalone, teclado virtual ou leitor de tela físico.

## Ledger de diferenças e findings

| Área | Finding / diferença | Classificação | Ação / justificativa | Estado |
| --- | --- | --- | --- | --- |
| Root layout | `body` ainda aplicava gradiente `slate → purple → indigo` | divergência acidental | Removido; fundo passa a vir exclusivamente dos tokens/superfícies do design system | ✅ corrigido no PR #186 |
| Error boundary | `app/error.tsx` ainda usava `bg-white/10` + `backdrop-blur` | divergência acidental | Glassmorphism removido e painel migrado para `ds-panel`/tokens v2 | ✅ corrigido |
| Error boundaries | digest técnico aparecia em `text-xs` (12px) | regressão de legibilidade | Elevado para `text-sm` (14px); corpo/ação em 16px | ✅ corrigido |
| Calendário | cabeçalho semanal aplicava `aria-label` a `div` genérica | regressão de acessibilidade | Nome completo passou a ser exposto por texto `sr-only` no mobile, sem atributo ARIA proibido | ✅ corrigido |
| Calendário | botão do dia atual não incluía o texto visível “Hoje” no nome acessível | regressão de acessibilidade | Nome acessível passou a incluir o dia e “Hoje” antes do resumo detalhado | ✅ corrigido |
| Tipografia | usos remanescentes de `text-xs` em Hero/AuthShell | diferença intencional | São wrappers de ícone; não representam texto legível ao usuário | ✅ justificado |
| Cores semânticas | azul/roxo/laranja podem existir em categorias/ícones de domínio | diferença intencional | A spec permite essas cores quando possuem significado de domínio; ornamentação gratuita continua proibida | ✅ justificado |
| Funcionalidades do mockup | Dashboard, Metas, Relatórios, notificações, premium e próximos vencimentos não aparecem | diferença intencional | Protótipo não autoriza features fictícias; backlog funcional continua em issues próprias | ✅ justificado |
| Rotas públicas | probe de sessão `/api/user` retorna `401` quando não autenticado e mantém Best Practices 96 em `/` e `/login` | comportamento conhecido | O estado é tratado como `unauthenticated`; score 96 já existia no baseline histórico. Não alterar semântica de auth apenas para elevar score visual | ✅ não bloqueante |
| PWA/dispositivo | standalone, safe-area física, teclado virtual e leitor de tela real não são simulados no CI | limite intencional de evidência | Permanecem explicitamente na #148 | ⏭️ #148 |
| Auto code review | integração Codex reportou limite de uso no PR #186 | limitação externa | Não mascarar como review automático concluído; complementar com revisão de diff do fechamento e registrar a exceção | ⚠️ externo |

## Varredura de resíduos visuais

No code head do PR #186, a auditoria encontrou e corrigiu as ocorrências materiais de:

- `purple-` / `indigo-` decorativos no root layout;
- `bg-gradient` decorativo no root layout;
- `backdrop-blur` na error boundary;
- texto visível abaixo da escala mínima nas error boundaries.

Após as correções, as buscas direcionadas não apontaram outro uso material desses padrões em superfícies principais. Animações utilitárias legadas ainda declaradas no stylesheet sem uso não são renderizadas e não alteram fidelidade visual; sua remoção não foi misturada ao QA por não trazer ganho funcional ao usuário.

## Responsividade e interação

A revisão manteve como evidência automatizada e estrutural:

- layout com breakpoints mobile/desktop em shell e páginas;
- bottom navigation com tratamento de safe-area;
- controles críticos usando `min-h-11`/dimensões compatíveis com ~44px;
- foco `focus-visible` explícito em ações críticas;
- modais/drawers com semântica e navegação por teclado já cobertas pela base;
- `prefers-reduced-motion` preservado;
- Lighthouse executado no perfil mobile nas cinco rotas críticas.

Não foi declarado como concluído nenhum teste que dependa de hardware/viewport físico. Esses pontos permanecem na #148.

## Lighthouse pós-redesign

Amostra final funcional antes do commit apenas documental deste ledger: code head `19f3dcabcb592c61e0ee4579885fd32ff0e2ac5c`, Lighthouse #94 / run `33330229641`.

| Rota | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 95 | 100 | 96 | 2.961 ms | 0,000 | 61 ms |
| `/login` | 93 | 100 | 96 | 3.178 ms | 0,000 | 37 ms |
| `/contas` | 93 | 100 | 100 | 3.287 ms | 0,005 | 51 ms |
| `/transacoes` | 92 | 100 | 100 | 3.353 ms | 0,001 | 88 ms |
| `/calendario` | 89 | 100 | 100 | 3.656 ms | 0,003 | 89 ms |

Resultado: **workflow success**, com Accessibility 100 em todas as rotas.

## Gates automatizados

- CI #129 / run `33330229627`: ✅ success;
- lint: ✅;
- typecheck: ✅;
- testes: ✅;
- build de produção: ✅;
- frontend budget: ✅;
- Lighthouse #94 / run `33330229641`: ✅ success;
- Preview Vercel do PR #186: ✅ `Ready`;
- landing do Preview: ✅ HTTP 200;
- body renderizado do Preview sem gradiente legado: ✅.

## Conclusão de fidelity

Não restou diferença visual ou de acessibilidade **bloqueante** conhecida após as correções do PR #186. As diferenças preservadas são intencionais e decorrem de regras funcionais do produto, significado de domínio ou de validações físicas explicitamente delegadas à #148.

A única limitação externa do fechamento é a indisponibilidade do review automático do Codex por cota da integração. Isso deve permanecer transparente no PR e não ser confundido com falha de CI, Lighthouse ou deployment.

Refs #148, #163, #172, PR #185 e PR #186.
