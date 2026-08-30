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
- auto code review completo do diff pelo agente, seguindo o checklist do `AGENTS.md`;
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
| Bot Codex | integração automática de review reportou limite de uso | limitação externa | Não bloqueia o auto review exigido pelo `AGENTS.md`, que foi executado pelo próprio agente sobre o diff final | ✅ documentado |

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

A execução consolidada no head `8bf8a22e15233b421ecef7c69561713c4e6b68ca` foi o Lighthouse #96 / run `33330612996`.

| Rota | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 94 | 100 | 96 | 3.154 ms | 0,000 | 42 ms |
| `/login` | 93 | 100 | 96 | 3.188 ms | 0,000 | 33 ms |
| `/contas` | 92 | 100 | 100 | 3.316 ms | 0,005 | 46 ms |
| `/transacoes` | 91 | 100 | 100 | 3.362 ms | 0,001 | 138 ms |
| `/calendario` | 91 | 100 | 100 | 3.456 ms | 0,003 | 69 ms |

Resultado: **workflow success**, com Accessibility 100 em todas as rotas.

## Auto code review final

O diff completo foi revisado pelo agente conforme o checklist do `AGENTS.md`, cobrindo escopo/arquitetura, segurança, integridade de dados, backend/API, frontend, acessibilidade, responsividade, performance, banco/deploy e documentação.

Findings do review:

1. os ajustes de runtime não alteram autenticação, API, domínio financeiro, schema ou migration;
2. a correção do calendário melhora o nome acessível sem alterar comportamento funcional;
3. as error boundaries preservam o fluxo de retry e observabilidade, alterando apenas apresentação/semântica;
4. os documentos inicialmente apontavam gates intermediários e tratavam a indisponibilidade do bot Codex como bloqueio do auto review — isso foi corrigido antes do merge;
5. não restaram findings bloqueantes conhecidos.

## Gates automatizados

No head `8bf8a22e15233b421ecef7c69561713c4e6b68ca`, antes deste ajuste documental final:

- CI #131 / run `33330612989`: ✅ success;
- lint: ✅;
- typecheck: ✅;
- testes: ✅;
- build de produção: ✅;
- frontend budget: ✅;
- Lighthouse #96 / run `33330612996`: ✅ success;
- Preview Vercel do code head funcional `19f3dcab`: ✅ `Ready`;
- landing do Preview: ✅ HTTP 200;
- body renderizado do Preview sem gradiente legado: ✅.

Como este arquivo foi atualizado após o review para refletir o estado real, o novo head deve passar novamente pelos gates antes do merge, conforme a regra de ouro do `AGENTS.md`.

## Conclusão de fidelity

Não restou diferença visual ou de acessibilidade **bloqueante** conhecida após as correções do PR #186. As diferenças preservadas são intencionais e decorrem de regras funcionais do produto, significado de domínio ou de validações físicas explicitamente delegadas à #148.

A indisponibilidade do bot Codex por cota permanece registrada como limitação externa, mas o auto code review obrigatório do repositório foi executado pelo agente sobre o diff completo.

Refs #148, #163, #172, PR #185 e PR #186.
