# Redesign v2 — especificação visual aprovada

Status da direção: **APROVADO e IMPLEMENTADO**.  
Direção aprovada em **2026-08-30**. Última revisão documental: **2026-09-01**.

## Fonte de verdade visual

O redesign segue o **Protótipo 2 — Dark Command Center** versionado em `redesign-prototype-2-approved.jpg`.

O protótipo é referência para composição, proporções, densidade, sidebar, navegação mobile, superfícies, contraste, iconografia, tabelas/listas, cards financeiros e hierarquia das ações.

Ele **não autoriza funcionalidades fictícias**. Metas, Relatórios, notificações, plano premium ou próximos vencimentos continuam fora do produto até existir uma entrega funcional própria.

O Dashboard deixou de ser um elemento apenas conceitual com a #154 / PR #197. A importação CSV/OFX também foi entregue na #155 / PR #199 e segue a mesma linguagem visual do produto real.

## Estado de implementação

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

### Evolução funcional sobre o baseline visual

| Área | Issue | PR | Estado |
| --- | ---: | ---: | --- |
| Parcelamento | #152 | #191 | ✅ concluído |
| Limites mensais | #153 | #193 | ✅ concluído |
| Dashboard financeiro mensal | #154 | #197 | ✅ concluído |
| Importação CSV/OFX | #155 | #199 | ✅ concluída |

Essas entregas usam a linguagem visual aprovada sem reabrir o roadmap #163.

## Direção

- tema escuro como identidade principal da área autenticada;
- superfícies escuras neutras, bordas sutis e contraste claro entre níveis;
- verde como acento principal e ação positiva;
- vermelho reservado para despesa, erro e ação destrutiva;
- azul, roxo e laranja somente quando tiverem significado de domínio/categoria;
- densidade de command center sem sacrificar leitura;
- desktop prioritariamente em listas, tabelas e painéis abertos;
- mobile compacto, com bottom navigation e ação primária alcançável;
- sem glassmorphism, glow ou gradiente decorativo sem função.

## Tipografia e legibilidade

A densidade do protótipo **não pode resultar em texto pequeno**.

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

## Geometria e interação

- touch target crítico em torno de **44×44px** ou maior;
- foco visível e navegação por teclado;
- sidebar desktop com estado ativo inequívoco;
- bottom navigation respeitando safe-area;
- formulários utilizáveis com teclado virtual;
- hover, focus, active, disabled, loading e error tratados nas primitives;
- `prefers-reduced-motion` respeitado.

## Aplicação ao produto real

A linguagem visual se aplica às superfícies existentes:

1. Dashboard;
2. Transações, incluindo importação;
3. Contas;
4. Categorias e limites mensais;
5. Calendário;
6. Perfil/configurações;
7. Landing;
8. Login/cadastro/recuperação/reset.

O protótipo continua sendo fonte **visual**. Regras financeiras, APIs, rotas e features reais são definidas pelo domínio, código e issues correspondentes.

## Gate visual

Toda mudança visual relevante deve:

1. comparar implementação com esta especificação;
2. validar desktop e mobile;
3. registrar divergências intencionais;
4. preservar a escala tipográfica mínima;
5. passar CI, Lighthouse e frontend budget quando aplicável;
6. receber auto code review final no mesmo head que será mergeado.

Preview Vercel é desejável. `api-deployments-free-per-day` é limitação externa e não deve gerar commit artificial ou ser mascarada como regressão de código.

## Fechamento do roadmap

A #172 / PR #186 executou a revisão transversal final do redesign. As evidências históricas estão em:

- [`../quality/redesign-v2-fidelity-ledger.md`](../quality/redesign-v2-fidelity-ledger.md);
- [`../quality/ux-performance-baseline.md`](../quality/ux-performance-baseline.md).

O PR #186 corrigiu resíduos do visual legado e consolidou a acessibilidade final. A #148 continua responsável exclusivamente pelas validações que dependem de dispositivo/navegador real: instalação/standalone, safe-area física, teclado virtual, atualização do app instalado e smoke de leitor de tela.

## Referências

#148, #152–#155, #163–#175, PRs #173, #176–#186, #191, #193, #197 e #199.
