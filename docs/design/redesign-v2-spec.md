# Redesign v2 — especificação visual aprovada

Status da direção: **APROVADO** em 2026-08-30.

## Fonte de verdade visual

O redesign segue o **Protótipo 2 — Dark Command Center** versionado ao lado deste documento em `redesign-prototype-2-approved.jpg`.

O protótipo é a referência para composição, proporções, densidade, sidebar, navegação mobile, superfícies, contraste, iconografia, tabelas/listas, cards financeiros e hierarquia das ações.

Ele **não é autorização para criar funcionalidades fictícias**. Elementos do mockup que ainda não existem no produto, como dashboard/Visão geral, Metas, Relatórios, notificações, plano premium ou próximos vencimentos, são somente demonstrações visuais e não entram no redesign até existir issue funcional própria.

## Estado de implementação

| Área | Issue | Estado |
| --- | ---: | --- |
| Direção/protótipo | #164 | ✅ concluída |
| Foundation | #165 | ✅ concluída |
| App shell | #166 | ✅ concluída |
| Transações | #167 | ✅ concluída |
| Contas | #168 | ✅ concluída |
| Categorias | #174 | ✅ concluída |
| Calendário | #169 | ✅ concluída |
| Perfil/configurações | #170 | ✅ concluída |
| Landing | #171 | ✅ concluída |
| Autenticação | #175 | ✅ concluída — PR #185 |
| QA/fidelity final | #172 | ✅ concluída — PR #186 |

Roadmap: #163 — ✅ concluído.

## Direção

- tema escuro como identidade principal da área autenticada;
- superfícies escuras neutras, bordas sutis e contraste claro entre níveis;
- verde como acento principal e ação positiva;
- vermelho reservado para despesa/erro/ação destrutiva;
- azul/roxo/laranja somente quando tiver significado de domínio ou categoria, sem ornamentação gratuita;
- densidade de command center, porém sem sacrificar leitura;
- desktop prioritariamente em listas/tabelas e painéis abertos, evitando card-grid excessivo;
- mobile compacto, com bottom navigation e ação primária claramente alcançável;
- sem glassmorphism, glow ou gradiente decorativo que não exista na referência.

## Tipografia e legibilidade — regra obrigatória

A densidade do protótipo **não pode resultar em texto pequeno**.

- texto base: **16px mínimo**;
- texto secundário/caption: **14px mínimo**;
- labels de controles: **14–16px**;
- títulos de seção: **20–24px**;
- título principal de página: **24–32px**, conforme viewport;
- valores financeiros primários: **24–32px**;
- line-height de corpo: mínimo aproximado de **1.45**;
- não reduzir fonte para fazer conteúdo caber: ajustar layout, coluna, truncamento acessível ou responsividade;
- zoom do navegador em 200% não pode destruir fluxo crítico;
- contraste deve atender WCAG AA para texto e controles essenciais.

## Geometria e interação

- touch target mínimo recomendado: **44×44px** em controles móveis e icon buttons críticos;
- foco visível e navegação completa por teclado;
- sidebar desktop com item ativo inequívoco e texto legível;
- bottom navigation deve respeitar safe-area;
- formulários devem funcionar com teclado virtual sem esconder ações;
- hover, focus, active, disabled, loading e error são estados obrigatórios das primitives;
- `prefers-reduced-motion` continua sendo respeitado.

## Como adaptar o mockup ao produto real

As rotas e capacidades atuais são a fonte funcional de verdade. O visual do protótipo se aplica a:

1. Transações;
2. Contas;
3. Categorias;
4. Calendário;
5. Perfil/configurações;
6. Landing;
7. Login/cadastro/recuperação/reset.

O futuro Dashboard (#154) poderá usar a mesma linguagem quando for implementado, mas **não será antecipado pelo redesign**.

## Gate visual de cada PR

Cada slice do redesign deve:

1. comparar implementação com este protótipo;
2. validar desktop e mobile;
3. registrar divergências intencionais;
4. preservar a escala tipográfica mínima deste documento;
5. passar CI, Lighthouse e frontend budget;
6. receber auto code review final antes do merge.

Preview Vercel continua desejável. Falhas de cota de deployment são tratadas como **limite externo de plataforma**, não como regressão do app; CI + Lighthouse + frontend budget permanecem os gates executáveis nesses casos.

## Gate final do roadmap

A #172 executou a revisão transversal de fidelidade e consistência após todas as áreas entrarem no sistema novo. O registro permanente da auditoria está em [`../quality/redesign-v2-fidelity-ledger.md`](../quality/redesign-v2-fidelity-ledger.md), e o baseline pós-redesign em [`../quality/ux-performance-baseline.md`](../quality/ux-performance-baseline.md).

O PR #186 corrigiu resíduos do visual legado encontrados no fechamento, consolidou a acessibilidade do calendário e reexecutou os gates automatizados. A #148 continua sendo a evidência manual de instalação/standalone PWA, safe-area, teclado virtual e smoke em dispositivo real e não deve ser simulada por CI.

Refs #163, #164, #172, #148, PR #185 e PR #186.
