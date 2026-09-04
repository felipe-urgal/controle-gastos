# Redesign v2 — baseline visual histórico

Status da direção: **HISTÓRICO — APROVADO e IMPLEMENTADO**.  
Direção aprovada em **2026-08-30**. Última revisão documental: **2026-09-04**.

> Para a área autenticada, a linguagem visual atual é **Orbit**, definida em [`orbit-spec.md`](orbit-spec.md) e iniciada pela #302. Este documento permanece como baseline histórico do ciclo v2 e como evidência das decisões e validações daquela implementação.

## Fonte de verdade visual do ciclo v2

O redesign v2 seguiu o **Protótipo 2 — Dark Command Center** versionado em `redesign-prototype-2-approved.jpg`.

O protótipo foi a referência daquele ciclo para composição, proporções, densidade, sidebar, navegação mobile, superfícies, contraste, iconografia, tabelas/listas, cards financeiros e hierarquia das ações.

Ele **nunca autorizou funcionalidades fictícias**. Metas, Relatórios, notificações, plano premium ou próximos vencimentos permaneceram fora do produto até existir uma entrega funcional própria.

O Dashboard deixou de ser um elemento apenas conceitual com a #154 / PR #197. A importação CSV/OFX também foi entregue na #155 / PR #199 usando a linguagem visual daquele ciclo.

## Precedência atual

- área autenticada: seguir [`orbit-spec.md`](orbit-spec.md) + a issue aprovada da rota;
- regras financeiras, APIs e domínio: seguir `AGENTS.md`, ADRs, docs de produto e código vigente;
- este documento: consultar como histórico e baseline de auditoria do redesign v2;
- landing/autenticação: continuam fora da migração automática para Orbit e só mudam com escopo próprio.

## Estado de implementação do ciclo v2

| Área | Issue | PR | Estado |
| --- | ---: | ---: | --- |
| Direção/protótipo | #164 | #173 | ✅ concluída |
| Foundation | #165 | #176 | ✅ concluída |
| App shell | #166 | #177 | ✅ concluída |
| Transações | #167 | #179 | ✅ concluída |
| Contas | #168 | #180 | ✅ concluída |
| Categorias | #174 | #181 | ✅ concluída |
| Calendário | #169 | #182 | ✅ concluída |
| Perfil/configurações | #170 | #183 | ✅ concluída |
| Landing | #171 | #184 | ✅ concluída |
| Autenticação | #175 | #185 | ✅ concluída |
| QA/fidelity final | #172 | #186 | ✅ concluída |

Roadmap visual #163: **✅ concluído**.

### Evolução funcional sobre o baseline v2

| Área | Issue | PR | Estado |
| --- | ---: | ---: | --- |
| Parcelamento | #152 | #191 | ✅ concluído |
| Limites mensais | #153 | #193 | ✅ concluído |
| Dashboard financeiro mensal | #154 | #197 | ✅ concluído |
| Importação CSV/OFX | #155 | #199 | ✅ concluída |

Essas entregas preservam o registro histórico do ciclo v2. Evoluções visuais posteriores da área autenticada passam a seguir Orbit sem reescrever o histórico anterior.

## Direção histórica v2

A direção aprovada naquele ciclo era:

- tema escuro como identidade principal da área autenticada;
- superfícies escuras neutras, bordas sutis e contraste claro entre níveis;
- verde como acento principal e ação positiva;
- vermelho reservado para despesa, erro e ação destrutiva;
- azul, roxo e laranja somente quando tivessem significado de domínio/categoria;
- densidade de command center sem sacrificar leitura;
- desktop prioritariamente em listas, tabelas e painéis abertos;
- mobile compacto, com bottom navigation e ação primária alcançável;
- sem glassmorphism, glow ou gradiente decorativo sem função.

A adoção de Orbit altera especificamente a semântica de identidade da área autenticada: roxo passa a representar navegação/seleção/ações Orbit e verde volta a ser principalmente semântico para receita/sucesso/positivo. Isso não invalida o registro acima; apenas marca a evolução posterior.

## Tipografia e legibilidade preservadas

A densidade visual **não pode resultar em texto pequeno**, tanto no v2 histórico quanto em Orbit.

- texto base: **16px mínimo**;
- texto secundário/caption: **14px mínimo**;
- labels: **14–16px**;
- títulos de seção: **20–24px**;
- título principal: **24–32px**, conforme viewport;
- valores financeiros primários: **24–32px**;
- line-height de corpo: aproximadamente **1.45** ou maior;
- não reduzir fonte para fazer conteúdo caber;
- zoom do navegador em 200% não pode destruir fluxo crítico;
- contraste deve atender WCAG AA em texto e controles essenciais.

## Geometria e interação preservadas

- touch target crítico em torno de **44×44px** ou maior;
- foco visível e navegação por teclado;
- sidebar desktop com estado ativo inequívoco;
- bottom navigation respeitando safe-area;
- formulários utilizáveis com teclado virtual;
- hover, focus, active, disabled, loading e error tratados nas primitives;
- `prefers-reduced-motion` respeitado.

## Aplicação histórica ao produto real

O ciclo v2 cobriu:

1. Dashboard;
2. Transações, incluindo importação;
3. Contas;
4. Categorias e limites mensais;
5. Calendário;
6. Perfil/configurações;
7. Landing;
8. Login/cadastro/recuperação/reset.

A lista descreve o **baseline entregue naquele ciclo**. Para uma alteração nova na área autenticada, consultar Orbit e a issue atual da rota. Landing e autenticação não devem ser alteradas por consequência indireta da migração Orbit.

## Gate visual atual

Toda mudança visual relevante deve:

1. identificar qual contrato visual vigente se aplica à superfície;
2. para área autenticada Orbit, comparar implementação com [`orbit-spec.md`](orbit-spec.md) e a issue da rota;
3. validar desktop e mobile na medida permitida pelo ambiente da entrega;
4. registrar divergências intencionais;
5. preservar a escala tipográfica mínima;
6. passar o CI obrigatório simples definido em `AGENTS.md` no head final;
7. receber auto code review final no mesmo head que será mergeado.

Frontend budget, Lighthouse e análise de bundle permanecem disponíveis como **diagnósticos manuais sob demanda** quando houver risco concreto ou requisito explícito. Eles não são bloqueadores automáticos de merge e não justificam criar ou disparar workflows adicionais por rotina.

Preview Vercel é desejável. `api-deployments-free-per-day` é limitação externa e não deve gerar commit artificial nem ser mascarada como regressão de código.

## Fechamento do roadmap v2

A #172 / PR #186 executou a revisão transversal final do redesign v2. As evidências históricas estão em:

- [`../quality/redesign-v2-fidelity-ledger.md`](../quality/redesign-v2-fidelity-ledger.md);
- [`../quality/ux-performance-baseline.md`](../quality/ux-performance-baseline.md).

O PR #186 corrigiu resíduos do visual legado e consolidou a acessibilidade final daquele ciclo. A #148 continua responsável exclusivamente pelas validações que dependem de dispositivo/navegador real: instalação/standalone, safe-area física, teclado virtual, atualização do app instalado e smoke de leitor de tela.

## Referências

- #148, #152–#155, #163–#175;
- #292–#302 para a evolução Orbit;
- PRs #173, #176–#186, #191, #193, #197 e #199;
- [`orbit-spec.md`](orbit-spec.md).
