# Controle de Gastos

Aplicação web de finanças pessoais para organizar **dashboard, contas, categorias, transações, calendário, recorrências mensais, parcelamentos, limites mensais e importação CSV/OFX**, com autenticação, exportação de dados, PWA, observabilidade e quality gates automatizados.

[![CI](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml)
[![E2E](https://github.com/felipe-urgal/controle-gastos/actions/workflows/e2e.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/e2e.yml)
[![Lighthouse](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml)

**Produção:** https://controle-gastos-pessoal.vercel.app/

> Nunca adicione senhas, JWTs, API keys, connection strings reais ou qualquer outro segredo ao Git, README, issues, PRs ou logs compartilhados.

---

## Estado atual

Última sincronização documental: **2026-09-01**.

O **Redesign v2 — Protótipo 2 / Dark Command Center** está concluído e consolidado. O backlog funcional planejado na #136 também foi entregue até a importação CSV/OFX.

### Entregas consolidadas

| Área | Issue | PR / estado |
| --- | ---: | --- |
| Ações rápidas de transação | #149 | ✅ concluída — PR #160 |
| Exportação CSV/JSON | #150 | ✅ concluída — PR #161 |
| Recorrências mensais finitas | #151 | ✅ concluída — PR #162 |
| Parcelamento | #152 | ✅ concluída — PR #191 |
| Limites mensais por categoria | #153 | ✅ concluída — PR #193 |
| Dashboard financeiro mensal | #154 | ✅ concluída — PR #197 |
| Importação CSV/OFX | #155 | ✅ concluída — PR #199 |
| Flash da landing na restauração de sessão | #196 | ✅ corrigido — PR #197 |
| Warnings de lint | #204 | ✅ concluída — PR #205 |
| E2E mínimo com Playwright | #206 | ✅ implementado — PR #207 |
| Redesign v2 | #163 | ✅ concluído — PR #186 encerrou o QA final |

### Pendências abertas

- #133 — DX/CI avançado: política de dependências, auditoria e checks/branch protection; o E2E mínimo está coberto pela #206 e os warnings pela #204;
- #148 — smoke PWA **manual** em dispositivo/navegador real;
- #198 — definir semântica multi-moeda para agregados financeiros;
- #137 — roadmap histórico, mantido aberto enquanto #133 e #148 tiverem pendências.

A #128 de segurança está encerrada: credenciais foram rotacionadas/revogadas e o GitHub Support confirmou que não é necessária nova reescrita do histórico apenas por caches/referências residuais.

---

## Princípios de domínio

- dados financeiros são sempre isolados pelo usuário autenticado;
- o saldo de conta é **derivado de transações**, nunca persistido como segunda fonte de verdade;
- somente transações `COMPLETED` participam do saldo realizado;
- `PENDING` e `CANCELLED` não alteram o saldo;
- categoria é a fonte de verdade do tipo financeiro `INCOME`/`EXPENSE`;
- operações de leitura não criam nem alteram dados;
- recorrências e parcelamentos são metadados/séries: somente ocorrências concretas entram no financeiro;
- limites são planejamento e não alteram transações ou saldo;
- valores monetários permanecem em centavos inteiros;
- IDs recebidos do cliente não provam ownership: relações são revalidadas no servidor;
- migrations aplicadas são imutáveis; correções usam `forward-fix`.

Decisão arquitetural: [`docs/adr/0001-account-balance-source-of-truth.md`](docs/adr/0001-account-balance-source-of-truth.md).

### Limitação multi-moeda

O modelo aceita contas em moedas diferentes, mas ainda não existe moeda-base/conversão cambial para agregados transversais. Dashboard, calendário e limites não devem ser interpretados como valores convertidos quando misturam moedas. A definição correta está rastreada na #198.

---

## Funcionalidades

### Autenticação e conta

- cadastro, login e logout;
- sessão JWT validada server-side;
- recuperação/redefinição de senha;
- rate limiting em fluxos sensíveis;
- restauração de sessão sem flash da landing pública;
- edição de perfil e preferência de mostrar/ocultar valores;
- tema claro/escuro/sistema;
- exclusão da conta;
- exportação CSV/JSON.

### Dashboard financeiro mensal

- rota autenticada `/dashboard`, entrada principal após login/restauração de sessão;
- período selecionável por mês/ano;
- receitas, despesas e saldo realizado somente com `COMPLETED`;
- comparação com mês anterior, incluindo base zero como não aplicável;
- saldos atuais por conta derivados das transações;
- despesas por categoria;
- fluxo dos últimos 6 meses;
- progresso somente leitura dos limites mensais;
- gráficos leves em CSS com informação equivalente em texto;
- `showValues` respeitado;
- nenhuma persistência de totais/saldos agregados.

Contrato: [`docs/product/monthly-dashboard.md`](docs/product/monthly-dashboard.md).

### Contas

- CRUD, ativação/desativação e tipos `CREDIT_DEBIT`/`INVESTMENT`;
- cor, ícone e descrição;
- saldo sempre derivado de transações concluídas.

### Categorias e limites mensais

- categorias `INCOME` e `EXPENSE` com CRUD, status, cor, ícone e ordenação;
- categoria permanece a fonte de verdade do tipo financeiro;
- limite mensal disponível somente para categoria `EXPENSE`;
- um limite por usuário/categoria/ano/mês;
- limite em centavos inteiros positivos;
- realizado derivado de `EXPENSE + COMPLETED`;
- editar/remover limite não altera transações nem saldo.

Contrato: [`docs/product/category-monthly-limits.md`](docs/product/category-monthly-limits.md).

### Transações

- estados `PENDING`, `COMPLETED` e `CANCELLED`;
- CRUD, detalhe, filtros, busca, paginação e modos de visualização;
- concluir pendência em ação rápida;
- duplicar por pré-preenchimento, sem escrita antes da confirmação;
- isolamento de conta/categoria/transação por usuário.

### Recorrências mensais

- séries mensais finitas por quantidade ou data final;
- até 60 ocorrências;
- preservação do dia âncora com fallback para o último dia válido;
- primeira ocorrência mantém o status escolhido e futuras nascem `PENDING`;
- série + ocorrências criadas atomicamente;
- cada ocorrência continua sendo uma `Transaction` independente.

### Parcelamentos

- disponível para categorias `EXPENSE`;
- total distribuído em centavos exatos entre 2 e 60 parcelas;
- resto de centavos distribuído deterministicamente;
- primeira parcela mantém o status escolhido e futuras nascem `PENDING`;
- datas avançam mensalmente com fallback de fim de mês;
- série + parcelas criadas atomicamente;
- edição/cancelamento individual afeta somente a ocorrência no MVP.

### Importação CSV/OFX

- rota `/transacoes/importar`;
- fluxo obrigatório arquivo → preview → confirmação;
- preview não grava transações;
- CSV e OFX normalizados para um DTO comum;
- arquivo máximo de 2 MB e até 1.000 transações;
- valores convertidos diretamente para centavos;
- ownership de conta/categoria revalidado na confirmação;
- deduplicação por fingerprint determinístico e idempotência em reimportações;
- `FITID` do OFX utilizado quando disponível;
- arquivo bruto não é persistido nem logado;
- confirmação grava somente itens selecionados em transação atômica.

Contrato: [`docs/product/transaction-import.md`](docs/product/transaction-import.md).

### Calendário

- navegação mensal e visão diária;
- resumo financeiro mensal;
- criação/edição a partir de um dia;
- somente `COMPLETED` entra em receitas/despesas/saldo realizado do dia e do mês.

---

## UX/UI — Dark Command Center

Fonte visual: [`docs/design/redesign-v2-spec.md`](docs/design/redesign-v2-spec.md).

Regras centrais:

- dark como identidade principal;
- superfícies neutras e bordas sutis;
- verde como acento principal;
- sem glassmorphism/glow/gradiente decorativo sem função;
- texto base >= 16px e apoio >= 14px;
- touch targets críticos próximos de 44x44px ou maiores;
- foco visível, teclado e semântica acessível;
- `prefers-reduced-motion` e safe areas;
- desktop privilegia listas/tabelas e painéis abertos;
- não reduzir tipografia para “fazer caber”.

---

## Stack

| Área | Tecnologia |
| --- | --- |
| Framework | Next.js `16.3.3` |
| UI | React `19` |
| Linguagem | TypeScript `5.8` |
| CSS | Tailwind CSS `4` |
| Banco | PostgreSQL / Neon em produção |
| ORM | Prisma `7.4.1` |
| Adapter | `@prisma/adapter-pg` + `pg` |
| Validação | Zod `4` |
| Auth | JWT + bcryptjs |
| E-mail | Resend |
| Datas | date-fns |
| Ícones | react-icons |
| Testes | Vitest + Playwright `1.51.1` (E2E) |
| Lint | ESLint 9 + eslint-config-next |
| Runtime | Node.js `24.x` |
| Package manager | pnpm `10.34.5` |
| Deploy | Vercel |

`package.json#packageManager` é a fonte de verdade da versão do pnpm.

---

## Arquitetura

```text
Pages / Components
       ↓
Hooks / Frontend Services
       ↓
App Router API
       ↓
Auth + Zod + regras de domínio
       ↓
Prisma
       ↓
PostgreSQL
```

Diretórios principais:

```text
app/(pages)          páginas e layouts
app/components       UI, shell, feedback e domínio
app/context          auth, tema e UI global
app/hooks            estado/orquestração de telas
app/services         clientes HTTP do frontend
app/api              endpoints App Router
app/schemas          contratos Zod
app/lib              domínio e infraestrutura server-side
app/types            tipos compartilhados
prisma               schema e migrations
tests/e2e            fluxo de navegador Playwright
docs                 ADRs, design, produto, qualidade e operação
scripts              Lighthouse e frontend budget
```

### Modelo de dados

- `User`: identidade e preferências;
- `Account`: conta financeira sem saldo autoritativo persistido;
- `Category`: classificação financeira;
- `CategoryMonthlyLimit`: planejamento mensal; persiste somente o limite;
- `Transaction`: movimentação financeira concreta;
- `TransactionSeries`: metadados `RECURRING`/`INSTALLMENT`;
- `PasswordResetToken` / `AuthRateLimit`: infraestrutura de autenticação;
- `Transaction` também contém os metadados mínimos de idempotência da importação, sem `ImportJob` paralelo.

Schema: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Rotas e APIs principais

Rotas públicas: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`.

Rotas autenticadas: `/dashboard`, `/transacoes`, `/transacoes/importar`, `/contas`, `/categorias`, `/calendario`, `/usuario/show/:id`.

APIs relevantes:

```text
/api/dashboard
/api/accounts
/api/categories
/api/category-limits
/api/transactions
/api/transactions/complete
/api/transactions/recurring
/api/transactions/installments
/api/transactions/import/preview
/api/transactions/import/confirm
/api/auth/*
/api/user
/api/user/export
/api/health
/api/observability/client-error
```

---

## Setup local

Pré-requisitos: Node.js `24.x`, Corepack, pnpm `10.34.5` e PostgreSQL de desenvolvimento.

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env
# preencher .env somente com credenciais de desenvolvimento
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Aplicação local: `http://localhost:5100`.

O Next.js suporta `.env.local`, mas `prisma.config.ts` carrega `dotenv/config`; comandos Prisma precisam de `DATABASE_URL` disponível no ambiente do processo.

---

## Variáveis de ambiente

Contrato versionado em `.env.example`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_replace_me
NEXT_PUBLIC_SITE_URL=http://localhost:5100
```

Nunca use credenciais reais no repositório, em issue/PR ou em logs compartilhados.

---

## Prisma, scripts e gates

O build executa `prisma generate && next build`; ele **não** executa `prisma migrate deploy`.

Comandos principais:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
pnpm test:e2e:install
pnpm test:e2e
pnpm analyze
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
```

O `test:e2e` espera um build de produção disponível. A configuração inicia `next start` na porta `5100`; detalhes e isolamento estão em [`docs/quality/e2e-playwright.md`](docs/quality/e2e-playwright.md).

Política de migrations:

- revisar SQL antes do PR;
- nunca editar migration já aplicada;
- preferir `forward-fix`;
- migration destrutiva exige checkpoint/restore;
- quando runtime novo depende de schema novo, aplicar migration compatível antes da promoção do código.

### CI, E2E e Lighthouse

`.github/workflows/ci.yml` executa instalação por lockfile, PostgreSQL efêmero, migrations, lint, typecheck, testes, build e frontend budget.

`.github/workflows/e2e.yml` executa o fluxo autenticado mínimo em Chromium contra PostgreSQL efêmero, cobrindo login, criação de transação, sessão inválida e logout. Trace, screenshot e vídeo são preservados quando houver falha.

`.github/workflows/lighthouse.yml` mede em perfil mobile as rotas públicas e autenticadas críticas, incluindo `/dashboard` após a #154. O histórico de medições está em [`docs/quality/ux-performance-baseline.md`](docs/quality/ux-performance-baseline.md).

Budget padrão:

| Métrica | Limite |
| --- | ---: |
| asset individual em `public/` | 500 KiB |
| chunk JS individual | 700 KiB |
| total de chunks JS | 5 MiB |

---

## PWA e acessibilidade

A base possui manifest/ícones, `viewport-fit=cover`, safe areas, foco visível, labels/erros associados, dialogs com foco/Escape, `aria-current`, touch targets e `prefers-reduced-motion`.

O projeto **não possui service worker customizado** e não promete offline completo.

O smoke de instalação/standalone, safe-area física, teclado virtual, atualização do app instalado e leitor de tela continua deliberadamente manual na #148.

---

## Segurança e observabilidade

- JWT validado server-side com issuer/audience/expiração;
- login/forgot/reset com rate limiting;
- reset tokens não ficam utilizáveis em texto puro;
- ownership financeiro validado no servidor;
- exportação exclui dados de autenticação;
- CSV exportado neutraliza formula injection;
- importação não persiste/loga arquivo bruto;
- logs estruturados minimizam dados sensíveis;
- `x-request-id` permite correlação;
- `/api/health` realiza readiness de aplicação/banco sem expor detalhes internos.

Runbook: [`docs/operations/runbook.md`](docs/operations/runbook.md).

---

## Deploy e produção

Contrato operacional: [`.dev-dashboard/production.json`](.dev-dashboard/production.json) e [`docs/operations/production-contract.md`](docs/operations/production-contract.md).

A estratégia é `git-managed` pela Vercel; migrations Prisma são separadas do deployment.

Quando código depende de migration nova:

1. validar migration e plano de recuperação;
2. aplicar `prisma migrate deploy` explicitamente;
3. confirmar `prisma migrate status` saudável;
4. promover o código;
5. confirmar deployment `READY`;
6. validar `/api/health`, smoke e 5xx.

A cota `api-deployments-free-per-day` é limitação externa da Vercel, não erro de código. Não gere commits artificiais para contorná-la.

---

## Fluxo de desenvolvimento

O contrato completo para agentes está em [`AGENTS.md`](AGENTS.md).

Fluxo esperado:

```text
Issue → branch dedicada → implementação → gates → auto code review → correções → gates no head final → PR → merge → smoke/deploy quando aplicável
```

Prefixos usuais: `feature/`, `bugfix/`, `hotfix/`, `security/`, `refactor/`, `test/`, `docs/`, `ux/`.

Não trabalhar diretamente em `main`. Branches de PR devem ser removidas após merge quando seguro.

---

## Documentação

- [AGENTS.md](AGENTS.md)
- [ADR de saldo](docs/adr/0001-account-balance-source-of-truth.md)
- [Spec do redesign](docs/design/redesign-v2-spec.md)
- [Runbook de produção](docs/operations/runbook.md)
- [Contrato operacional](docs/operations/production-contract.md)
- [Exportação de dados](docs/product/user-data-export.md)
- [Limites mensais por categoria](docs/product/category-monthly-limits.md)
- [Dashboard financeiro mensal](docs/product/monthly-dashboard.md)
- [Importação CSV/OFX](docs/product/transaction-import.md)
- [E2E Playwright](docs/quality/e2e-playwright.md)
- [Fidelity ledger do redesign](docs/quality/redesign-v2-fidelity-ledger.md)
- [Baseline UX/performance/PWA](docs/quality/ux-performance-baseline.md)
- [Roadmap histórico #137](https://github.com/felipe-urgal/controle-gastos/issues/137)
- [Roadmap UX/UI concluído #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

---

**Repositório:** https://github.com/felipe-urgal/controle-gastos  
**Produção:** https://controle-gastos-pessoal.vercel.app/
