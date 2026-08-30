# Controle de Gastos

Aplicação web de finanças pessoais para organizar **contas, categorias, transações, calendário e recorrências mensais**, com autenticação, exportação de dados, PWA, observabilidade e quality gates automatizados.

[![CI](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml)
[![Lighthouse baseline](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml)

**Produção:** https://controle-gastos-pessoal.vercel.app/

> Nunca adicione senhas, JWTs, API keys, connection strings reais ou qualquer outro segredo ao Git, README, issues, PRs ou logs compartilhados.

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Redesign v2](#redesign-v2)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Rotas](#rotas)
- [Pré-requisitos](#pré-requisitos)
- [Setup local](#setup-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Prisma e migrations](#prisma-e-migrations)
- [Scripts](#scripts)
- [Testes e CI](#testes-e-ci)
- [Lighthouse e frontend budget](#lighthouse-e-frontend-budget)
- [PWA e acessibilidade](#pwa-e-acessibilidade)
- [Segurança](#segurança)
- [Observabilidade](#observabilidade)
- [Deploy e produção](#deploy-e-produção)
- [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Documentação adicional](#documentação-adicional)

---

## Sobre o projeto

O **Controle de Gastos** é construído com Next.js App Router e PostgreSQL. O objetivo é manter o domínio financeiro simples e previsível, evitando fontes de verdade duplicadas e efeitos colaterais em operações de leitura.

O domínio é organizado principalmente em:

- **Contas**: onde as movimentações acontecem;
- **Categorias**: classificam receitas e despesas;
- **Transações**: movimentações financeiras concretas;
- **Séries de transações**: metadados de recorrências mensais finitas.

### Princípios do projeto

- os dados são isolados pelo usuário autenticado;
- o saldo de conta é derivado de transações, não persistido como segunda fonte de verdade;
- somente movimentações concretas concluídas participam dos cálculos financeiros correspondentes;
- APIs de leitura não criam nem alteram dados;
- migrations são versionadas e imutáveis depois de aplicadas em produção;
- CI, testes, build, Lighthouse e orçamento de frontend fazem parte do processo de entrega;
- mudanças visuais precisam preservar acessibilidade, responsividade e legibilidade.

---

## Funcionalidades

### Autenticação e usuário

- cadastro;
- login e logout;
- sessão autenticada;
- recuperação de senha;
- redefinição de senha;
- rate limiting em ações sensíveis de autenticação;
- edição de perfil;
- preferência para exibir ou ocultar valores financeiros;
- exclusão da conta;
- exportação de dados em CSV/JSON.

### Contas

- criação, edição e exclusão;
- ativação/desativação;
- cor e ícone personalizados;
- descrição;
- tipos `CREDIT_DEBIT` e `INVESTMENT`;
- saldo calculado a partir das transações do usuário.

### Categorias

- receitas (`INCOME`) e despesas (`EXPENSE`);
- criação, edição e exclusão;
- ativação/desativação;
- cor, ícone e descrição;
- posição/ordenação;
- categoria como fonte de verdade para o tipo financeiro da transação.

### Transações

- receitas e despesas;
- estados `PENDING`, `COMPLETED` e `CANCELLED`;
- criação, edição, exclusão e detalhe;
- conclusão rápida de transações pendentes;
- duplicação com pré-preenchimento, sem escrita antes da confirmação;
- filtros, busca, paginação e modos de visualização;
- isolamento por usuário de conta, categoria e transação.

### Recorrências mensais

- séries mensais finitas;
- criação por quantidade de ocorrências ou data final;
- preservação do dia âncora;
- tratamento correto de meses que não possuem o dia original, por exemplo `31/jan -> 28/29/fev -> 31/mar`;
- primeira ocorrência preserva o status escolhido;
- ocorrências seguintes são criadas como `PENDING`;
- série e ocorrências são persistidas atomicamente em uma transação PostgreSQL;
- cada ocorrência continua sendo uma `Transaction` independente e pode ser editada individualmente.

### Calendário

- navegação mensal;
- visualização de movimentações por dia;
- integração com contas e transações existentes.

### Experiência

- desktop e mobile;
- tema claro/escuro;
- manifest e assets PWA;
- safe areas;
- estados de loading, erro e vazio;
- navegação por teclado;
- foco visível;
- suporte a `prefers-reduced-motion`.

---

## Redesign v2

A interface está sendo redesenhada seguindo a direção **Protótipo 2 — Dark Command Center**.

![Protótipo 2 aprovado](docs/design/redesign-prototype-2-approved.jpg)

### Fontes oficiais

- [Especificação visual](docs/design/redesign-v2-spec.md)
- [Roadmap do redesign — #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

O protótipo é fonte de verdade para composição, hierarquia, navegação, densidade, contraste e comportamento responsivo. Ele **não autoriza criar funcionalidades fictícias** exibidas apenas para composição visual.

### Regras obrigatórias de UI

- dark como identidade principal da área autenticada;
- superfícies escuras neutras e bordas sutis;
- verde como acento principal;
- sem glassmorphism, glow ou gradiente decorativo sem função;
- texto base com **16px mínimo**;
- texto secundário com **14px mínimo**;
- títulos e valores financeiros com hierarquia clara;
- controles móveis críticos com alvo aproximado de **44x44px** ou maior;
- desktop preferencialmente com listas, tabelas e painéis abertos;
- bottom navigation no mobile;
- não reduzir fonte para “fazer caber”. Ajuste layout, truncamento ou responsividade.

O andamento de cada slice deve ser consultado no roadmap #163.

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
| Autenticação | JWT + bcryptjs |
| E-mail | Resend |
| Datas | date-fns |
| Motion | Framer Motion |
| Ícones | react-icons |
| Testes | Vitest |
| Lint | ESLint 9 + eslint-config-next |
| Runtime | Node.js `24.x` |
| Package manager | pnpm `10.34.5` |
| Deploy | Vercel |
| PostgreSQL gerenciado em produção | Neon |

A versão do pnpm definida em `package.json#packageManager` é a fonte de verdade para ambiente local e CI.

---

## Arquitetura

O projeto usa **Next.js App Router**.

```text
Interface / Pages
       ↓
Hooks e Services
       ↓
API Routes
       ↓
Validação + autenticação + regras de domínio
       ↓
Prisma
       ↓
PostgreSQL
```

### Responsabilidades por diretório

- `app/(pages)`: páginas e layouts;
- `app/components`: primitives, layout e componentes de domínio;
- `app/context`: autenticação, tema e UI global;
- `app/hooks`: estado e coordenação de telas;
- `app/services`: clientes HTTP e serviços do frontend;
- `app/api`: endpoints do App Router;
- `app/schemas`: validação de payloads;
- `app/lib`: regras, CRUD, autenticação e infraestrutura de servidor;
- `app/types`: tipos compartilhados;
- `app/utils`: utilitários;
- `prisma`: schema e migrations;
- `scripts`: Lighthouse, resumo de métricas e orçamento de frontend;
- `docs`: design, qualidade e operação.

### Regra de autorização

Um ID recebido do frontend **não prova propriedade**. APIs que recebem `accountId`, `categoryId`, `transactionId` ou outra relação devem validar que o recurso pertence ao usuário autenticado.

---

## Modelo de dados

O schema está em `prisma/schema.prisma`.

### `User`

Identidade e preferências do usuário. Possui relações com contas, categorias, transações, séries recorrentes e tokens de reset.

### `Account`

Conta financeira do usuário.

Importante: **não existe saldo persistido como fonte de verdade** em `Account`. O valor é derivado das transações aplicáveis.

### `Category`

Classifica a movimentação como receita ou despesa. O tipo da categoria é a fonte de verdade usada pelo backend para o comportamento financeiro.

### `Transaction`

Movimentação financeira concreta.

Valores monetários são armazenados como **inteiros**, evitando aritmética de ponto flutuante no domínio.

Estados:

```text
PENDING
COMPLETED
CANCELLED
```

### `TransactionSeries`

Metadados de uma recorrência mensal. Não substitui as transações concretas e não é uma segunda fonte de saldo.

### `PasswordResetToken`

Token de recuperação de senha com expiração.

### `AuthRateLimit`

Estado persistido de rate limiting para ações sensíveis de autenticação.

---

## Rotas

### Públicas

| Rota | Objetivo |
| --- | --- |
| `/` | landing |
| `/login` | login |
| `/signup` | cadastro |
| `/forgot-password` | solicitar recuperação |
| `/reset-password` | redefinir senha |

### Autenticadas

| Rota | Objetivo |
| --- | --- |
| `/transacoes` | transações |
| `/contas` | contas |
| `/categorias` | categorias |
| `/calendario` | calendário |
| `/usuario/show/:id` | perfil/configurações |

Os domínios também possuem rotas aninhadas de criação, edição e detalhe quando aplicável.

### APIs por domínio

```text
/api/accounts
/api/categories
/api/transactions
/api/auth
/api/user
/api/health
/api/observability
```

Endpoints relevantes:

- `POST /api/transactions/recurring`: cria série mensal + ocorrências;
- `/api/user/export`: exporta dados do usuário;
- `GET /api/health`: readiness da aplicação e banco.

---

## Pré-requisitos

- Node.js `24.x`;
- Corepack;
- pnpm `10.34.5`;
- PostgreSQL acessível. PostgreSQL 17 é recomendado para manter proximidade com CI e produção.

### Alinhar pnpm

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

### 1. Clonar

```bash
git clone https://github.com/felipe-urgal/controle-gastos.git
cd controle-gastos
```

### 2. Instalar dependências

```bash
pnpm install --frozen-lockfile
```

Não apague ou regenere `pnpm-lock.yaml` para contornar incompatibilidade de package manager. Alinhe sua versão do pnpm ao `packageManager` do projeto.

### 3. Configurar ambiente

Para o caminho mais simples, use `.env`:

```bash
cp .env.example .env
```

Edite `.env` e use **somente credenciais de desenvolvimento**.

> O Next.js também suporta `.env.local`, mas os exemplos de Prisma CLI deste README assumem `DATABASE_URL` disponível no processo ou em `.env`, pois `prisma.config.ts` carrega `dotenv/config`.

Se preferir manter o banco apenas em `.env.local`, exporte `DATABASE_URL` na sessão antes de rodar comandos do Prisma.

### 4. Aplicar migrations existentes

```bash
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

### 5. Iniciar

```bash
pnpm dev
```

Abra:

```text
http://localhost:5100
```

---

## Variáveis de ambiente

Contrato atual em `.env.example`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_replace_me
NEXT_PUBLIC_SITE_URL=http://localhost:5100
```

### `DATABASE_URL`

Connection string PostgreSQL utilizada pelo Prisma e pela aplicação.

### `JWT_SECRET`

Segredo forte e aleatório da sessão JWT. O placeholder do exemplo não serve para produção.

### `RESEND_API_KEY`

Chave da Resend para fluxos de e-mail, especialmente recuperação de senha.

### `NEXT_PUBLIC_SITE_URL`

Base pública usada pelo frontend. Em desenvolvimento:

```text
http://localhost:5100
```

### Regras para secrets

- `.env*` é ignorado pelo Git;
- `.env.example` é a única exceção versionada;
- nunca fazer commit de `.env`, `.env.local` ou arquivo de produção;
- nunca colar segredo em issue/PR;
- nunca mostrar connection string em captura de tela ou `echo` de troubleshooting;
- CI usa placeholders próprios para ambientes efêmeros.

---

## Prisma e migrations

Configuração:

```text
prisma/schema.prisma
prisma.config.ts
prisma/migrations/
```

### Status

```bash
pnpm exec prisma migrate status
```

### Aplicar migrations existentes

```bash
pnpm exec prisma migrate deploy
```

### Gerar client

```bash
pnpm exec prisma generate
```

### Criar migration em desenvolvimento

```bash
pnpm exec prisma migrate dev --name nome_da_migration
```

Revise o SQL gerado antes de enviar o PR.

### Política de migration

- nunca editar uma migration já aplicada em produção;
- preferir `forward-fix` para corrigir schema já migrado;
- migrations destrutivas exigem estratégia de recuperação;
- o build **não** executa `migrate deploy` automaticamente;
- aplicar migration em produção é uma etapa explícita;
- código e schema precisam ser promovidos em ordem compatível.

---

## Scripts

| Comando | Função |
| --- | --- |
| `pnpm dev` | Next dev server na porta `5100` |
| `pnpm build` | `prisma generate && next build` |
| `pnpm start` | inicia um build de produção existente |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Prisma generate + TypeScript sem emissão |
| `pnpm test` | Vitest |
| `pnpm test:watch` | Vitest em watch |
| `pnpm analyze` | build com bundle analyzer |
| `pnpm check:frontend-budget` | valida assets e chunks |

Quality gate local completo:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

---

## Testes e CI

Workflow: `.github/workflows/ci.yml`.

Executa em PR para `main` e push em `main`.

### Ambiente

- Ubuntu;
- Node 24;
- pnpm definido pelo projeto;
- PostgreSQL 17 efêmero;
- envs de teste sem secrets reais;
- instalação congelada pelo lockfile.

### Pipeline

1. checkout;
2. setup pnpm;
3. setup Node;
4. `pnpm install --frozen-lockfile`;
5. `prisma migrate deploy` no banco de teste;
6. lint;
7. typecheck;
8. testes;
9. build;
10. frontend budget.

Um PR não deve ser tratado como pronto enquanto o head final não passar novamente pelos gates depois das correções de review.

---

## Lighthouse e frontend budget

Workflow: `.github/workflows/lighthouse.yml`.

O job cria banco PostgreSQL efêmero, aplica migrations, gera build de produção, sobe a aplicação na porta `5100`, cria um usuário isolado e executa Lighthouse em rotas públicas e autenticadas.

Rotas auditadas:

```text
/
/login
/contas
/transacoes
/calendario
```

Relatórios são publicados como artifact do GitHub Actions por tempo limitado.

### Interpretação

Lighthouse é uma medição **lab**. Ele ajuda a detectar regressões, mas não substitui dados de campo de Core Web Vitals. INP real, por exemplo, depende de telemetria de uso real.

### Budget padrão

| Métrica | Limite |
| --- | ---: |
| asset individual em `public/` | 500 KiB |
| chunk JS individual | 700 KiB |
| total de chunks JS | 5 MiB |

Bundle analyzer:

```bash
pnpm analyze
```

Budget:

```bash
pnpm build
pnpm check:frontend-budget
```

Mudanças de orçamento precisam ser justificadas; aumentar o limite não deve ser a primeira resposta a uma regressão.

---

## PWA e acessibilidade

O projeto mantém manifest, ícones e configurações para experiência PWA/mobile.

Requisitos já incorporados à base:

- `viewport-fit=cover`;
- tratamento de safe areas;
- foco visível;
- labels associados a inputs;
- `aria-invalid`/mensagens de erro;
- modais com semântica de diálogo;
- navegação por teclado;
- `aria-current` na navegação;
- touch targets adequados;
- respeito a `prefers-reduced-motion`.

O produto não deve depender exclusivamente de mouse ou toque em fluxos críticos.

---

## Segurança

Diretrizes atuais:

- senha nunca é persistida em texto puro;
- sessão usa JWT;
- endpoints protegidos validam autenticação;
- recursos financeiros são filtrados/validados pelo usuário da sessão;
- login e recuperação/reset possuem rate limiting;
- tokens de reset expiram;
- logs não devem conter secrets nem payload financeiro sensível;
- exportação não inclui senha, JWT ou reset token;
- CSV neutraliza células que poderiam ser interpretadas como fórmula;
- downloads de exportação usam headers defensivos de cache/sniffing;
- arquivos de ambiente reais não são versionados.

Ao alterar relações de uma transação, valide novamente propriedade da conta/categoria de destino. Não confie no objeto antigo nem apenas no ID recebido.

---

## Observabilidade

### Health/readiness

```http
GET /api/health
```

- `200`: aplicação e consulta mínima ao PostgreSQL disponíveis;
- `503`: aplicação respondeu, mas o banco falhou no readiness;
- `cache-control: no-store`;
- `x-request-id` para correlação.

Smoke de produção:

```bash
curl -i https://controle-gastos-pessoal.vercel.app/api/health
```

### Logs estruturados

Eventos de servidor usam JSON com campos como:

- timestamp;
- level;
- service/environment;
- event;
- requestId;
- route;
- status;
- durationMs quando aplicável.

Nunca registrar senha, JWT, token de reset, connection string, e-mail/IP bruto ou payload financeiro sensível.

Consulte [docs/operations/runbook.md](docs/operations/runbook.md) para incidentes, rollback e recuperação.

---

## Deploy e produção

### Vercel

Produção:

```text
https://controle-gastos-pessoal.vercel.app/
```

`vercel.json` força instalação reproduzível:

```bash
pnpm install --frozen-lockfile
```

### Build

```bash
prisma generate && next build
```

O build não altera o banco.

### Deploy sem alteração de schema

Fluxo normal:

1. PR;
2. CI/Lighthouse/budget;
3. auto code review;
4. correções;
5. gates do head final;
6. merge;
7. deployment de produção;
8. smoke e logs quando a mudança justificar.

### Deploy com migration

Para uma migration **aditiva e compatível** com o código atual:

1. finalizar implementação e review;
2. confirmar a migration esperada;
3. checar `prisma migrate status` em produção;
4. criar estratégia/checkpoint de recuperação quando necessário;
5. aplicar `prisma migrate deploy`;
6. confirmar `Database schema is up to date!`;
7. validar estruturas relevantes sem expor dados;
8. mergear/promover o código dependente;
9. aguardar deployment saudável;
10. executar smoke e verificar 5xx.

Migrations destrutivas ou incompatíveis exigem plano específico e não devem reutilizar esse fluxo de forma automática.

### Rollback

Rollback de aplicação só é seguro se o schema atual continuar compatível com o deployment anterior. Consulte o runbook antes de reverter código associado a migration.

---

## Fluxo de desenvolvimento

Fluxo padrão do projeto:

```text
Issue
  ↓
Branch
  ↓
Implementação
  ↓
PR
  ↓
CI + Lighthouse + budget
  ↓
Auto code review
  ↓
Correções
  ↓
Nova rodada dos gates
  ↓
Merge
  ↓
Smoke / observabilidade
```

### Prefixos de branch

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

Exemplos:

```text
feature/monthly-recurring-transactions
bugfix/user-delete
security/next-security-update
ux/redesign-shell
```

### Antes do merge

Confira:

- escopo da issue respeitado;
- nenhuma feature não planejada entrou no diff;
- nenhum segredo/dado sensível foi adicionado;
- CI verde;
- Lighthouse verde quando aplicável;
- frontend budget verde;
- migrations revisadas quando existirem;
- desktop/mobile revisados em mudanças visuais;
- acessibilidade básica preservada;
- auto code review final sem finding bloqueante.

---

## Estrutura do repositório

```text
.
├── .github/
│   └── workflows/             # CI e Lighthouse
├── app/
│   ├── (pages)/               # páginas e layouts
│   ├── api/                   # APIs App Router
│   ├── components/
│   │   ├── base-pages/        # wrappers de páginas
│   │   ├── feedback/          # loading/error/empty/alerts
│   │   ├── forms/             # estruturas de formulário
│   │   ├── layout/            # shell/navegação/proteção
│   │   ├── navigation/        # filtros/paginação
│   │   ├── overlays/          # modais/overlays
│   │   ├── pages/             # componentes de domínio
│   │   └── ui/                # primitives
│   ├── context/               # auth/theme/UI
│   ├── hooks/                 # hooks por fluxo
│   ├── lib/                   # regras e infraestrutura
│   ├── schemas/               # Zod
│   ├── services/              # clientes HTTP
│   ├── stylesheets/           # tokens/CSS global
│   ├── types/                 # tipos
│   └── utils/                 # utilitários
├── docs/
│   ├── design/                # protótipo e spec do redesign
│   ├── operations/            # runbook
│   └── quality/               # auditorias/baselines
├── prisma/
│   ├── migrations/            # histórico de schema
│   └── schema.prisma
├── public/                    # manifest, ícones e assets
├── scripts/                   # Lighthouse e budget
├── .env.example               # contrato de env sem secrets
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── prisma.config.ts
└── vercel.json
```

---

## Documentação adicional

### Design

- [Protótipo aprovado](docs/design/redesign-prototype-2-approved.jpg)
- [Especificação do redesign](docs/design/redesign-v2-spec.md)
- [Roadmap #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

### Operação

- [Runbook de produção](docs/operations/runbook.md)

### Qualidade

- `docs/quality/`
- `.github/workflows/ci.yml`
- `.github/workflows/lighthouse.yml`
- `scripts/check-frontend-budget.mjs`

---

## Checklist rápido

### Primeira execução

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env
# preencher .env apenas com credenciais de desenvolvimento
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Aplicação:

```text
http://localhost:5100
```

### Antes de um PR

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

---

**Repositório:** https://github.com/felipe-urgal/controle-gastos  
**Produção:** https://controle-gastos-pessoal.vercel.app/
