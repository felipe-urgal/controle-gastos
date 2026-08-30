# Controle de Gastos

Aplicação web de finanças pessoais para organizar **contas, categorias, transações, calendário, recorrências mensais e parcelamentos**, com autenticação, exportação de dados, PWA, observabilidade e quality gates automatizados.

[![CI](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml)
[![Lighthouse](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml)

**Produção:** https://controle-gastos-pessoal.vercel.app/

> Nunca adicione senhas, JWTs, API keys, connection strings reais ou qualquer outro segredo ao Git, README, issues, PRs ou logs compartilhados.

---

## Estado atual

O produto possui uma base funcional e operacional estável. O **Redesign v2 — Protótipo 2 / Dark Command Center** foi concluído e consolidado; a evolução funcional segue sobre esse baseline visual final.

### Redesign

| Etapa | Issue | Estado |
| --- | ---: | --- |
| Direção visual | #164 | ✅ concluída |
| Foundation/design system | #165 | ✅ concluída |
| Shell desktop/mobile | #166 | ✅ concluída |
| Transações | #167 | ✅ concluída |
| Contas | #168 | ✅ concluída |
| Categorias | #174 | ✅ concluída |
| Calendário | #169 | ✅ concluída |
| Perfil/configurações | #170 | ✅ concluída |
| Landing pública | #171 | ✅ concluída |
| Autenticação | #175 | ✅ concluída no PR #185 |
| QA/fidelity final | #172 | ✅ concluída no PR #186 |

Roadmap visual concluído: [#163](https://github.com/felipe-urgal/controle-gastos/issues/163).

O protótipo aprovado e sua especificação permanecem como referência visual:

- [`docs/design/redesign-prototype-2-approved.jpg`](docs/design/redesign-prototype-2-approved.jpg)
- [`docs/design/redesign-v2-spec.md`](docs/design/redesign-v2-spec.md)

O protótipo é fonte de verdade **visual**, não autorização para antecipar funcionalidades. Dashboard, limites e importação continuam em issues de produto próprias.

### Backlog funcional atual

- #149 — ações rápidas de transação: ✅ concluída;
- #150 — exportação CSV/JSON: ✅ concluída;
- #151 — recorrências mensais finitas: ✅ concluída;
- #152 — parcelamento: ✅ concluída no PR #191;
- #153 — limites mensais por categoria: planejada;
- #154 — dashboard financeiro: planejada;
- #155 — importação CSV/OFX: planejada.

---

## Princípios de domínio

- dados financeiros são sempre isolados pelo usuário autenticado;
- o saldo de conta é **derivado de transações**, nunca persistido como segunda fonte de verdade;
- somente transações `COMPLETED` participam do saldo realizado;
- `PENDING` e `CANCELLED` não alteram o saldo;
- categoria é a fonte de verdade do tipo financeiro `INCOME`/`EXPENSE`;
- operações de leitura não criam nem alteram dados;
- migrations aplicadas em produção são imutáveis; correções usam `forward-fix`;
- IDs recebidos do cliente não provam ownership: relações precisam ser revalidadas no servidor.

A decisão sobre saldo está documentada em [`docs/adr/0001-account-balance-source-of-truth.md`](docs/adr/0001-account-balance-source-of-truth.md).

---

## Funcionalidades

### Autenticação e conta

- cadastro;
- login/logout;
- sessão JWT;
- recuperação e redefinição de senha;
- rate limiting em fluxos sensíveis;
- edição de perfil;
- preferência de mostrar/ocultar valores;
- tema claro/escuro/sistema;
- exclusão da conta;
- exportação de dados em CSV e JSON.

### Contas

- criar, editar, visualizar e excluir;
- ativar/desativar;
- tipos `CREDIT_DEBIT` e `INVESTMENT`;
- cor, ícone e descrição;
- saldo derivado das transações concluídas.

### Categorias

- receitas (`INCOME`) e despesas (`EXPENSE`);
- CRUD;
- ativação/desativação;
- cor, ícone, descrição e ordenação;
- tipo da categoria usado pelo backend como referência financeira.

### Transações

- `PENDING`, `COMPLETED` e `CANCELLED`;
- CRUD e detalhe;
- filtros, busca, paginação e modos de visualização;
- ação rápida para concluir pendência;
- duplicação com pré-preenchimento e confirmação explícita;
- isolamento de conta/categoria/transação por usuário.

### Recorrências mensais

- séries mensais finitas;
- criação por quantidade ou data final;
- limite de até 60 ocorrências;
- preservação do dia âncora, inclusive fim de mês;
- primeira ocorrência mantém o status escolhido;
- ocorrências futuras nascem `PENDING`;
- série + ocorrências são criadas atomicamente;
- cada ocorrência continua sendo uma `Transaction` independente.

### Parcelamentos

- disponível inicialmente para categorias de despesa (`EXPENSE`);
- valor total distribuído em centavos exatos entre 2 e 60 parcelas;
- resto de centavos distribuído deterministicamente nas primeiras parcelas;
- primeira parcela mantém o status escolhido e as futuras nascem `PENDING`;
- datas avançam mensalmente com fallback para o último dia válido;
- série + parcelas são criadas atomicamente;
- cada ocorrência exibe `Parcela N/Total` sem alterar a descrição original;
- edição/cancelamento individual afeta somente a ocorrência no MVP.

### Calendário

- navegação mensal;
- resumo financeiro mensal;
- visão diária;
- status visíveis sem depender só de cor;
- criação/edição de transação a partir de um dia;
- somente transações concluídas entram em receitas/despesas/saldo realizado do dia/mês.

---

## UX/UI — Dark Command Center

Regras obrigatórias do redesign:

- dark como identidade principal;
- superfícies neutras e bordas sutis;
- verde como acento principal;
- sem glassmorphism, glow ou gradientes decorativos sem função;
- texto base **>= 16px**;
- texto secundário **>= 14px**;
- touch targets críticos em torno de **44x44px** ou maiores;
- foco visível e navegação por teclado;
- `prefers-reduced-motion` respeitado;
- safe areas em mobile/PWA;
- desktop privilegia listas, tabelas e painéis abertos em vez de card-grid excessivo;
- não reduzir fonte para “fazer caber”: adaptar layout, quebra, truncamento ou responsividade.

---

## Stack

| Área | Tecnologia |
| --- | --- |
| Framework | Next.js `16.3.3` |
| UI | React `19` |
| Linguagem | TypeScript `5.8` |
| CSS | Tailwind CSS `4` |
| Banco | PostgreSQL |
| ORM | Prisma `7.4.1` |
| Adapter | `@prisma/adapter-pg` + `pg` |
| Validação | Zod `4` |
| Auth | JWT + bcryptjs |
| E-mail | Resend |
| Datas | date-fns |
| Ícones | react-icons |
| Testes | Vitest |
| Lint | ESLint 9 + eslint-config-next |
| Runtime | Node.js `24.x` |
| Package manager | pnpm `10.34.5` |
| Deploy | Vercel |
| PostgreSQL de produção | Neon |

`package.json#packageManager` é a fonte de verdade da versão do pnpm para local e CI.

---

## Arquitetura

O projeto usa Next.js App Router.

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

### Diretórios principais

```text
app/(pages)          páginas e layouts
app/components       UI, shell, feedback e componentes de domínio
app/context          auth, tema e UI global
app/hooks            estado/orquestração de telas
app/services         clientes HTTP do frontend
app/api              endpoints App Router
app/schemas          contratos Zod
app/lib              domínio, CRUD, auth e infraestrutura server-side
app/types            tipos compartilhados
prisma               schema e migrations
docs                 ADRs, design, produto, qualidade e operação
scripts              Lighthouse e frontend budget
```

---

## Modelo de dados

### `User`

Identidade e preferências. Relaciona-se com contas, categorias, transações, séries mensais e controles de autenticação.

### `Account`

Conta financeira. Não possui saldo persistido como fonte de verdade.

### `Category`

Classifica a movimentação como receita ou despesa.

### `Transaction`

Movimentação concreta. Valores monetários são armazenados como inteiros para preservar centavos.

### `TransactionSeries`

Metadados de séries mensais dos tipos `RECURRING` e `INSTALLMENT`. A série não entra no saldo: somente suas transações concretas `COMPLETED` entram.

### `PasswordResetToken` / `AuthRateLimit`

Infraestrutura de recuperação de senha e proteção contra abuso.

Schema: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Rotas

### Públicas

| Rota | Uso |
| --- | --- |
| `/` | landing |
| `/login` | login |
| `/signup` | cadastro |
| `/forgot-password` | solicitar recuperação |
| `/reset-password` | redefinir senha |

### Autenticadas

| Rota | Uso |
| --- | --- |
| `/transacoes` | transações |
| `/contas` | contas |
| `/categorias` | categorias |
| `/calendario` | calendário |
| `/usuario/show/:id` | perfil e configurações |

### APIs relevantes

```text
/api/accounts
/api/categories
/api/transactions
/api/transactions/recurring
/api/transactions/installments
/api/auth/*
/api/user
/api/user/export
/api/health
/api/observability/client-error
```

---

## Pré-requisitos

- Node.js `24.x`;
- Corepack;
- pnpm `10.34.5`;
- PostgreSQL acessível para desenvolvimento.

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm --version
```

Esperado:

```text
10.34.5
```

---

## Setup local

```bash
git clone https://github.com/felipe-urgal/controle-gastos.git
cd controle-gastos
pnpm install --frozen-lockfile
cp .env.example .env
```

Preencha `.env` somente com credenciais de desenvolvimento.

Depois:

```bash
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Aplicação local:

```text
http://localhost:5100
```

### `.env.local` e Prisma CLI

O Next.js suporta `.env.local`, mas `prisma.config.ts` carrega `dotenv/config`. Para comandos Prisma, mantenha `DATABASE_URL` em `.env` de desenvolvimento ou exporte-a na sessão do terminal.

Nunca use ou exponha credenciais de produção para desenvolvimento local.

---

## Variáveis de ambiente

Contrato versionado em `.env.example`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_replace_me
NEXT_PUBLIC_SITE_URL=http://localhost:5100
```

- `DATABASE_URL`: PostgreSQL;
- `JWT_SECRET`: segredo da sessão;
- `RESEND_API_KEY`: envio de recuperação de senha;
- `NEXT_PUBLIC_SITE_URL`: URL pública/base da aplicação.

### Segurança de envs

- `.env*` não é versionado;
- `.env.example` contém apenas placeholders;
- não cole secrets em issues/PRs;
- não use `echo` para connection strings em troubleshooting compartilhado;
- CI usa credenciais efêmeras/placeholders de teste.

---

## Prisma e migrations

Comandos principais:

```bash
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Criar migration em desenvolvimento:

```bash
pnpm exec prisma migrate dev --name nome_da_migration
```

Política:

- revisar o SQL antes do PR;
- nunca editar migration já aplicada em produção;
- preferir `forward-fix`;
- migration destrutiva exige checkpoint/restore e plano de recuperação;
- o build da Vercel **não executa** `prisma migrate deploy`;
- quando o novo código depende de schema aditivo, o banco deve ficar compatível antes da promoção do código.

---

## Scripts

| Comando | Função |
| --- | --- |
| `pnpm dev` | dev server na porta 5100 |
| `pnpm build` | `prisma generate && next build` |
| `pnpm start` | inicia build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Prisma generate + TypeScript |
| `pnpm test` | Vitest |
| `pnpm test:watch` | Vitest watch |
| `pnpm analyze` | bundle analyzer |
| `pnpm check:frontend-budget` | valida orçamento de frontend |

Gate local completo:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

---

## CI, Lighthouse e frontend budget

### CI

`.github/workflows/ci.yml` executa:

1. instalação com lockfile congelado;
2. PostgreSQL efêmero;
3. migrations;
4. lint;
5. typecheck;
6. testes;
7. build;
8. frontend budget.

### Lighthouse

`.github/workflows/lighthouse.yml` mede em perfil mobile:

```text
/
/login
/contas
/transacoes
/calendario
```

As rotas protegidas usam usuário/sessão efêmeros do próprio job.

O baseline histórico e o baseline pós-redesign estão registrados em [`docs/quality/ux-performance-baseline.md`](docs/quality/ux-performance-baseline.md). A QA final #172 / PR #186 consolidou o baseline do redesign v2; ele serve como evidência de regressão, não como SLO permanente.

### Budget padrão

| Métrica | Limite |
| --- | ---: |
| asset individual em `public/` | 500 KiB |
| chunk JS individual | 700 KiB |
| total de chunks JS | 5 MiB |

---

## PWA e acessibilidade

A base já possui:

- manifest e ícones;
- `viewport-fit=cover`;
- safe areas;
- foco visível;
- associação label/input/erro;
- semântica de diálogo e focus trap;
- `aria-current` na navegação;
- touch targets adequados;
- suporte a `prefers-reduced-motion`.

O projeto **não possui service worker customizado** neste momento; portanto, não promete funcionamento offline completo.

O smoke manual de instalação/standalone/teclado virtual em dispositivo real permanece pendente na issue #148 e deve usar o baseline visual final consolidado no #172.

---

## Segurança

- senhas são armazenadas com hash;
- JWT é validado server-side;
- issuer/audience/expiração fazem parte do hardening de sessão;
- login/forgot/reset possuem rate limiting;
- reset token não fica utilizável em texto puro no banco;
- recursos financeiros são validados por usuário;
- exportação não inclui credenciais/autenticação;
- CSV neutraliza formula injection;
- logs não devem conter secrets nem payload financeiro sensível;
- arquivos reais de ambiente não são versionados.

A issue #128 permanece aberta somente pelo residual de limpeza de referências/caches administrados pelo GitHub; credenciais já foram rotacionadas e a árvore atual foi higienizada.

---

## Observabilidade

Health/readiness:

```http
GET /api/health
```

- `200`: aplicação e banco disponíveis;
- `503`: banco indisponível no readiness;
- `Cache-Control: no-store`;
- `x-request-id` para correlação.

Smoke:

```bash
curl -i https://controle-gastos-pessoal.vercel.app/api/health
```

Logs estruturados minimizam dados sensíveis e podem ser correlacionados por `requestId`.

Runbook: [`docs/operations/runbook.md`](docs/operations/runbook.md).

---

## Deploy e produção

### Vercel

`vercel.json` força instalação reproduzível:

```bash
pnpm install --frozen-lockfile
```

Build:

```bash
prisma generate && next build
```

O build não altera schema.

### Limite temporário de deployments

A conta Vercel pode retornar:

```text
api-deployments-free-per-day
Resource is limited - try again in 24 hours
```

Isso é **cota de plataforma**, não erro de compilação. Não crie commits/redeploys artificiais para contornar a cota. Enquanto ela estiver ativa, CI + Lighthouse + frontend budget continuam sendo os gates executáveis de código; Preview/produção volta a ser validado quando a cota resetar.

### Fluxo padrão

```text
Issue
  ↓
Branch
  ↓
Implementação
  ↓
PR
  ↓
CI + Lighthouse + frontend budget
  ↓
Auto code review
  ↓
Correções
  ↓
Gates novamente no head final
  ↓
Merge
  ↓
Deploy / smoke / logs quando disponível e aplicável
```

### Com migration aditiva

1. finalizar implementação/review;
2. confirmar a migration esperada;
3. validar `prisma migrate status` em produção;
4. criar checkpoint quando necessário;
5. aplicar `prisma migrate deploy`;
6. confirmar schema `up to date`;
7. validar estruturas sem expor dados;
8. mergear/promover o código dependente;
9. acompanhar deploy;
10. executar smoke e verificar 5xx.

Migrations destrutivas exigem plano específico.

---

## Fluxo de desenvolvimento

Prefixos usuais:

```text
feature/
bugfix/
hotfix/
security/
refactor/
test/
docs/
ux/
```

Antes de mergear:

- escopo da issue respeitado;
- sem feature não planejada;
- sem secrets;
- CI verde;
- Lighthouse verde quando aplicável;
- frontend budget verde;
- migration revisada quando existir;
- desktop/mobile e acessibilidade revisados em mudanças visuais;
- **auto code review final sem finding bloqueante**.

Branches de PR devem ser removidas após merge; o repositório deve manter `delete_branch_on_merge` habilitado para evitar acúmulo.

---

## Estrutura do repositório

```text
.
├── .github/workflows/        CI e Lighthouse
├── app/
│   ├── (pages)/              páginas/layouts
│   ├── api/                  APIs
│   ├── components/           UI, shell e domínio
│   ├── context/              auth/tema/UI
│   ├── hooks/                coordenação de telas
│   ├── lib/                  domínio e infraestrutura
│   ├── schemas/              Zod
│   ├── services/             HTTP client-side
│   ├── stylesheets/          tokens e CSS global
│   └── types/                tipos
├── docs/
│   ├── adr/
│   ├── design/
│   ├── operations/
│   ├── product/
│   └── quality/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── scripts/
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── prisma.config.ts
└── vercel.json
```

---

## Documentação adicional

- [ADR de saldo](docs/adr/0001-account-balance-source-of-truth.md)
- [Protótipo aprovado](docs/design/redesign-prototype-2-approved.jpg)
- [Spec do redesign](docs/design/redesign-v2-spec.md)
- [Runbook de produção](docs/operations/runbook.md)
- [Contrato de exportação](docs/product/user-data-export.md)
- [Baseline UX/performance/PWA](docs/quality/ux-performance-baseline.md)
- [Roadmap de hardening/evolução #137](https://github.com/felipe-urgal/controle-gastos/issues/137)
- [Roadmap UX/UI concluído #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

---

## Checklist rápido de primeira execução

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env
# preencher .env somente com credenciais de desenvolvimento
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Aplicação local:

```text
http://localhost:5100
```

---

**Repositório:** https://github.com/felipe-urgal/controle-gastos  
**Produção:** https://controle-gastos-pessoal.vercel.app/