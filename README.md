# Controle de Gastos

Aplicação web para organização financeira pessoal, com contas, categorias, transações, calendário, recorrências mensais, exportação de dados, autenticação e experiência PWA.

[![CI](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/ci.yml)
[![Lighthouse baseline](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/felipe-urgal/controle-gastos/actions/workflows/lighthouse.yml)

**Produção:** https://controle-gastos-pessoal.vercel.app/

> Este README descreve o estado atual do projeto, o fluxo de desenvolvimento e as regras operacionais relevantes. Segredos, tokens, connection strings reais e credenciais nunca devem ser adicionados ao repositório, issues, PRs ou logs compartilhados.

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Redesign v2](#redesign-v2)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Rotas principais](#rotas-principais)
- [Pré-requisitos](#pré-requisitos)
- [Configuração local](#configuração-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco e Prisma](#banco-e-prisma)
- [Scripts](#scripts)
- [Testes e quality gates](#testes-e-quality-gates)
- [Lighthouse e performance](#lighthouse-e-performance)
- [PWA e acessibilidade](#pwa-e-acessibilidade)
- [Segurança](#segurança)
- [Observabilidade](#observabilidade)
- [Deploy](#deploy)
- [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Documentação adicional](#documentação-adicional)

---

## Visão geral

O **Controle de Gastos** é uma aplicação financeira pessoal construída com Next.js App Router e PostgreSQL. A aplicação mantém os dados isolados por usuário e organiza o domínio financeiro em quatro entidades principais:

- **Contas**: origem/destino das movimentações financeiras;
- **Categorias**: classificação de receitas e despesas;
- **Transações**: movimentações financeiras concretas;
- **Séries de transações**: metadados de recorrências mensais finitas.

O saldo de uma conta é derivado das transações concluídas. Não existe uma segunda fonte persistida de saldo na tabela de contas.

### Princípios atuais do projeto

- fonte única de verdade para regras financeiras;
- isolamento de dados por usuário;
- migrations versionadas com Prisma;
- build reproduzível com `pnpm --frozen-lockfile`;
- CI obrigatório antes de merge;
- Lighthouse automatizado nas rotas críticas;
- orçamento de bundle e assets monitorado;
- observabilidade com request ID e health check;
- nenhuma migration automática escondida dentro do build;
- acessibilidade, responsividade e PWA tratadas como requisitos de produto.

---

## Funcionalidades

### Autenticação e conta do usuário

- cadastro;
- login;
- logout;
- sessão autenticada;
- recuperação e redefinição de senha;
- rate limiting das operações sensíveis de autenticação;
- edição de perfil;
- preferência para exibir/ocultar valores financeiros;
- exclusão de conta;
- exportação dos dados do usuário em CSV/JSON.

### Contas

- criação;
- edição;
- exclusão;
- ativação/desativação;
- cor e ícone personalizados;
- tipos de conta de uso financeiro e investimento;
- saldo calculado a partir das transações concluídas.

### Categorias

- categorias de receita e despesa;
- criação, edição e exclusão;
- ativação/desativação;
- cor, ícone e descrição;
- ordenação/posição;
- categoria como fonte de verdade para o tipo financeiro da transação.

### Transações

- receitas e despesas;
- estados `PENDING`, `COMPLETED` e `CANCELLED`;
- criação, edição, exclusão e detalhe;
- conclusão rápida de transações pendentes;
- duplicação com pré-preenchimento sem escrita automática;
- filtros, busca, paginação e modos de visualização;
- atualização do saldo somente quando a transação concreta está concluída.

### Recorrências mensais

- séries mensais finitas;
- criação por quantidade de ocorrências ou data final;
- preservação do dia âncora no calendário;
- tratamento de meses sem o dia original, por exemplo `31/jan -> 28/29/fev -> 31/mar`;
- primeira ocorrência respeita o status escolhido;
- ocorrências seguintes nascem como `PENDING`;
- criação da série e de todas as ocorrências em uma única transação PostgreSQL;
- cada ocorrência continua editável individualmente.

### Calendário

- visão mensal das transações;
- navegação entre meses;
- consulta de movimentações por dia;
- integração com contas e transações existentes.

### Experiência

- layouts desktop e mobile;
- tema claro/escuro;
- PWA com manifest e ícones;
- safe areas para dispositivos móveis;
- estados de loading, erro e vazio;
- navegação por teclado e foco visível;
- suporte a `prefers-reduced-motion`.

---

## Redesign v2

O produto está passando por um redesign estrutural da área autenticada. A direção aprovada é o **Protótipo 2 — Dark Command Center**.

![Protótipo 2 aprovado](docs/design/redesign-prototype-2-approved.jpg)

### Fonte de verdade visual

- [Especificação visual aprovada](docs/design/redesign-v2-spec.md)
- [Roadmap do redesign — issue #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

A implementação deve preservar as regras funcionais existentes. Elementos fictícios usados apenas na composição do mockup não devem virar funcionalidades sem uma issue de produto própria.

Regras importantes do redesign:

- tema escuro como identidade principal da área autenticada;
- superfícies neutras, sem glassmorphism ou gradientes decorativos gratuitos;
- verde como acento principal;
- texto base com **16px mínimo**;
- texto secundário com **14px mínimo**;
- touch targets críticos com aproximadamente **44x44px** ou mais;
- desktop orientado a listas, tabelas e painéis abertos;
- mobile compacto, legível e compatível com safe areas;
- nenhuma redução de fonte apenas para fazer conteúdo caber.

### Etapas do redesign

O trabalho foi quebrado em slices independentes para permitir review e rollback seguros:

1. direção visual e protótipos;
2. foundation/design system;
3. shell e navegação;
4. transações;
5. contas;
6. categorias;
7. calendário;
8. perfil/configurações;
9. landing pública;
10. autenticação;
11. QA visual, responsividade, acessibilidade e performance.

---

## Stack

| Área | Tecnologia |
| --- | --- |
| Framework | Next.js `16.3.3` |
| UI | React `19` |
| Linguagem | TypeScript `5.8` |
| Estilos | Tailwind CSS `4` |
| Banco | PostgreSQL |
| ORM | Prisma `7.4.1` |
| Driver/adapter | `pg` + `@prisma/adapter-pg` |
| Validação | Zod `4` |
| Autenticação | JWT + bcryptjs |
| E-mail | Resend |
| Datas | date-fns |
| Animações | Framer Motion |
| Ícones | react-icons |
| Testes | Vitest |
| Lint | ESLint 9 + eslint-config-next |
| Runtime | Node.js `24.x` |
| Package manager | pnpm `10.34.5` |
| Produção | Vercel |
| PostgreSQL gerenciado | Neon |

O `packageManager` do `package.json` é a fonte de verdade da versão do pnpm usada localmente e no CI.

---

## Arquitetura

O projeto usa **Next.js App Router**.

### Camadas principais

```text
UI / Pages
   ↓
Hooks / Services
   ↓
API Routes
   ↓
Validação / Autorização / CRUD de domínio
   ↓
Prisma
   ↓
PostgreSQL
```

### Responsabilidades

- `app/(pages)`: rotas e layouts da interface;
- `app/components`: componentes compartilhados e telas de domínio;
- `app/hooks`: estado e coordenação de fluxos no cliente;
- `app/services`: clientes para APIs e serviços compartilhados;
- `app/api`: endpoints HTTP do App Router;
- `app/schemas`: validações de entrada;
- `app/lib`: regras, utilitários de servidor, CRUD e infraestrutura;
- `app/context`: autenticação, tema e estado global de UI;
- `prisma`: schema e migrations;
- `scripts`: automações de quality/performance;
- `docs`: decisões, operação, qualidade e design.

### Autorização

Rotas protegidas usam a sessão autenticada e operações de domínio devem sempre filtrar/validar recursos pelo usuário autenticado. IDs recebidos do cliente não podem ser tratados como prova de propriedade.

---

## Modelo de dados

### `User`

Responsável por identidade e preferências. Relaciona-se com contas, categorias, transações, séries de recorrência e tokens de redefinição.

### `Account`

Representa uma conta financeira. Não persiste saldo calculado. O saldo deve ser derivado das transações do usuário.

Tipos atuais:

- `CREDIT_DEBIT`
- `INVESTMENT`

### `Category`

Classifica uma movimentação como:

- `INCOME`
- `EXPENSE`

A categoria é a fonte de verdade do tipo financeiro ao criar/alterar uma transação.

### `Transaction`

Armazena valores monetários como **inteiros**, evitando ponto flutuante no domínio financeiro.

Estados:

- `PENDING`
- `COMPLETED`
- `CANCELLED`

Somente movimentações concretas concluídas devem afetar os cálculos financeiros correspondentes.

### `TransactionSeries`

Guarda metadados de uma série recorrente mensal. As ocorrências continuam sendo registros reais de `Transaction`.

A série não é uma segunda entidade de saldo nem cria transações durante operações de leitura.

### Autenticação

Também existem modelos para:

- tokens de redefinição de senha;
- rate limits persistidos para ações sensíveis de autenticação.

---

## Rotas principais

### Públicas

| Rota | Função |
| --- | --- |
| `/` | Landing |
| `/login` | Login |
| `/signup` | Cadastro |
| `/forgot-password` | Solicitação de recuperação de senha |
| `/reset-password` | Redefinição de senha |

### Autenticadas

| Rota | Função |
| --- | --- |
| `/contas` | Gestão de contas |
| `/categorias` | Gestão de categorias |
| `/transacoes` | Gestão de transações |
| `/calendario` | Calendário financeiro |
| `/usuario/show/:id` | Perfil/configurações do usuário |

Existem rotas aninhadas de criação, edição e detalhe para os domínios acima.

### APIs relevantes

As APIs são organizadas por domínio em:

```text
/api/accounts
/api/categories
/api/transactions
/api/auth
/api/user
/api/health
/api/observability
```

Endpoints especiais incluem:

- `POST /api/transactions/recurring` para criação atômica de recorrências mensais;
- `/api/user/export` para exportação dos dados do usuário;
- `GET /api/health` para readiness da aplicação e do banco.

---

## Pré-requisitos

Instale:

- Node.js `24.x`;
- Corepack habilitado;
- pnpm `10.34.5`;
- PostgreSQL acessível localmente ou em ambiente de desenvolvimento.

O repositório também possui `.nvmrc` para facilitar o alinhamento da versão do Node.

### Alinhar pnpm com o projeto

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

## Configuração local

### 1. Clone o repositório

```bash
git clone https://github.com/felipe-urgal/controle-gastos.git
cd controle-gastos
```

### 2. Instale as dependências

```bash
pnpm install --frozen-lockfile
```

Não remova ou regenere o lockfile para contornar erros de versão. Alinhe a versão do pnpm com o `packageManager` do projeto.

### 3. Crie o arquivo local de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com valores válidos do seu ambiente de desenvolvimento.

### 4. Prepare o banco

Para um banco novo ou desatualizado:

```bash
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

### 5. Inicie a aplicação

```bash
pnpm dev
```

A aplicação local sobe em:

```text
http://localhost:5100
```

---

## Variáveis de ambiente

Use `.env.example` como contrato de configuração.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_replace_me
NEXT_PUBLIC_SITE_URL=http://localhost:5100
```

### `DATABASE_URL`

Connection string PostgreSQL usada pelo Prisma e pela aplicação.

### `JWT_SECRET`

Segredo forte e aleatório usado pela autenticação. Nunca reutilize o placeholder do `.env.example` fora de desenvolvimento/teste.

### `RESEND_API_KEY`

Chave da Resend usada nos fluxos de e-mail, principalmente recuperação de senha.

### `NEXT_PUBLIC_SITE_URL`

URL pública esperada pelo frontend. Em desenvolvimento normalmente é:

```text
http://localhost:5100
```

### Regras de segurança para envs

- `.env*` é ignorado pelo Git;
- `.env.example` é a única exceção versionada;
- nunca adicionar credenciais reais a arquivos de documentação;
- nunca colar connection string, JWT, senha ou API key em issue/PR;
- nunca usar `echo` em credenciais durante troubleshooting compartilhado.

---

## Banco e Prisma

O schema está em:

```text
prisma/schema.prisma
```

A configuração do datasource usa `DATABASE_URL` via:

```text
prisma.config.ts
```

### Verificar migrations

```bash
pnpm exec prisma migrate status
```

### Aplicar migrations existentes

Ambiente local, CI ou produção quando explicitamente planejado:

```bash
pnpm exec prisma migrate deploy
```

### Gerar Prisma Client

```bash
pnpm exec prisma generate
```

### Criar uma nova migration

Ao desenvolver uma alteração de schema em banco de desenvolvimento:

```bash
pnpm exec prisma migrate dev --name nome_da_migration
```

Revise o SQL gerado antes de subir a migration.

### Regras de migration

- migrations aplicadas em produção são imutáveis;
- preferir migration de correção (`forward-fix`) em vez de editar migration histórica;
- mudanças destrutivas exigem checkpoint/snapshot ou branch de recuperação;
- o build da aplicação **não** executa `prisma migrate deploy` automaticamente;
- quando um deploy depende de uma migration aditiva, aplicar e validar o schema antes de promover o código dependente;
- nunca executar migrations destrutivas sem revisão explícita do impacto.

---

## Scripts

| Comando | Função |
| --- | --- |
| `pnpm dev` | Next.js dev server na porta `5100` |
| `pnpm build` | `prisma generate` + build de produção do Next.js |
| `pnpm start` | inicia o build de produção |
| `pnpm lint` | executa ESLint no projeto |
| `pnpm typecheck` | gera Prisma Client e executa TypeScript sem emitir arquivos |
| `pnpm test` | executa Vitest uma vez |
| `pnpm test:watch` | Vitest em modo watch |
| `pnpm analyze` | gera build com bundle analyzer habilitado |
| `pnpm check:frontend-budget` | valida orçamento de assets e chunks JS |

Para reproduzir o quality gate principal localmente:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

---

## Testes e quality gates

O CI roda em pull requests para `main` e em pushes na `main`.

Ambiente do CI:

- Ubuntu;
- Node 24;
- pnpm definido pelo `packageManager`;
- PostgreSQL 17 efêmero;
- variáveis exclusivamente de teste;
- instalação com lockfile congelado.

Pipeline:

1. checkout;
2. setup pnpm;
3. setup Node;
4. `pnpm install --frozen-lockfile`;
5. `prisma migrate deploy` no banco efêmero;
6. lint;
7. typecheck;
8. testes;
9. build;
10. frontend budget.

Não devem ser usadas credenciais reais no GitHub Actions para os testes automatizados que funcionam com infraestrutura efêmera.

---

## Lighthouse e performance

Existe um workflow dedicado de Lighthouse que sobe a aplicação em modo de produção contra um PostgreSQL efêmero e mede rotas públicas e autenticadas.

Rotas atualmente auditadas:

- `/`;
- `/login`;
- `/contas`;
- `/transacoes`;
- `/calendario`.

O workflow cria uma sessão de teste isolada, executa Lighthouse e publica os relatórios como artifact temporário do GitHub Actions.

### Natureza dos dados

Lighthouse é uma medição **lab**. Para Core Web Vitals reais, especialmente INP, dados de campo são necessários. Os números do workflow devem ser usados para detectar regressões e comparar tendências, não como telemetria de usuários reais.

### Frontend budget

Limites padrão atuais:

| Item | Limite |
| --- | ---: |
| Asset individual em `public/` | 500 KiB |
| Chunk JS individual | 700 KiB |
| Total dos chunks JS | 5 MiB |

Os limites podem ser sobrescritos por variáveis específicas do script quando necessário, mas qualquer aumento deve ser justificado em review.

Bundle analyzer:

```bash
pnpm analyze
```

Budget:

```bash
pnpm build
pnpm check:frontend-budget
```

---

## PWA e acessibilidade

O projeto possui manifest e assets para experiência instalável.

Princípios mantidos:

- `viewport-fit=cover`;
- safe areas em navegação mobile;
- manifest com identificação, scope, idioma e ícones;
- foco visível;
- associação entre labels e inputs;
- mensagens de erro acessíveis;
- modais com semântica de diálogo;
- navegação por teclado;
- `aria-current` na navegação;
- respeito a `prefers-reduced-motion`;
- targets de toque adequados nos controles críticos.

Mudanças de layout devem ser revisadas em desktop e mobile e não podem depender apenas de mouse/touch.

---

## Segurança

Princípios relevantes já adotados no projeto:

- senhas armazenadas com hash, nunca em texto puro;
- sessão baseada em JWT;
- validação de autenticação nas APIs protegidas;
- recursos financeiros sempre isolados pelo usuário autenticado;
- rate limiting para login e recuperação/reset de senha;
- tokens de recuperação com expiração;
- respostas e logs não devem expor secrets;
- exportação de usuário não deve incluir senha, JWT, reset token ou outros campos sensíveis;
- CSV exportado deve neutralizar células que possam ser interpretadas como fórmula;
- headers de download usam política defensiva de cache e content sniffing;
- arquivos `.env` reais não são versionados.

Ao criar ou editar relações (`accountId`, `categoryId`, etc.), o backend deve validar se o recurso de destino pertence ao usuário autenticado. Não confie apenas no ID recebido do frontend.

---

## Observabilidade

### Health check

```http
GET /api/health
```

Comportamento esperado:

- `200`: aplicação e consulta mínima ao PostgreSQL estão disponíveis;
- `503`: a aplicação respondeu, mas o banco não passou no readiness check;
- `cache-control: no-store`;
- `x-request-id` para correlação.

Smoke de produção:

```bash
curl -i https://controle-gastos-pessoal.vercel.app/api/health
```

### Logs estruturados

Eventos de servidor usam estrutura JSON com informações como:

- timestamp;
- nível;
- serviço/ambiente;
- evento;
- request ID;
- rota;
- status;
- duração quando aplicável.

Não registrar:

- senha;
- JWT;
- reset token;
- connection string;
- e-mail/IP bruto;
- payload financeiro sensível.

O runbook completo está em [docs/operations/runbook.md](docs/operations/runbook.md).

---

## Deploy

### Vercel

A aplicação é hospedada na Vercel.

Produção:

```text
https://controle-gastos-pessoal.vercel.app/
```

O `vercel.json` fixa a instalação em:

```bash
pnpm install --frozen-lockfile
```

Isso evita o uso acidental de outro package manager e mantém o deploy alinhado ao lockfile.

### Build

O build definido no projeto é:

```bash
prisma generate && next build
```

Ele **não aplica migrations em produção**.

### Deploy com alteração de schema

Para mudanças de schema, a ordem depende da compatibilidade da migration.

Em migrations aditivas compatíveis com a versão atual da aplicação, o fluxo seguro é:

1. CI e review do PR;
2. confirmar que apenas a migration esperada está pendente;
3. criar checkpoint/estratégia de recuperação quando necessário;
4. aplicar `prisma migrate deploy` ao banco de produção;
5. confirmar `prisma migrate status`;
6. validar a estrutura esperada;
7. mergear/promover o código que usa o novo schema;
8. aguardar deployment `READY`;
9. executar smoke de `/api/health` e dos fluxos afetados;
10. verificar logs 5xx.

Para migrations destrutivas ou incompatíveis, planeje rollout específico. Não reutilize automaticamente o fluxo acima.

### Rollback

Rollback de código só é seguro quando o schema atual continua compatível com o deployment anterior. Consulte o [runbook de produção](docs/operations/runbook.md) antes de rollback envolvendo migrations.

---

## Fluxo de desenvolvimento

O fluxo recomendado para cada atividade é:

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
Correções dos findings
  ↓
Nova rodada dos gates
  ↓
Merge
  ↓
Smoke / observabilidade
```

### Convenção de branches

Use nomes descritivos, por exemplo:

```text
feature/nome-da-feature
bugfix/nome-do-bug
security/nome-da-correcao
refactor/nome-do-refactor
test/nome-do-gate
docs/nome-da-documentacao
ux/nome-do-redesign
```

### Pull requests

Um PR não deve ser mergeado apenas porque compila. Antes do merge, confirme:

- escopo da issue respeitado;
- nenhum segredo ou dado sensível no diff;
- CI verde;
- Lighthouse verde quando aplicável;
- budget verde;
- migrations revisadas quando existirem;
- acessibilidade/responsividade revisadas para mudanças visuais;
- auto code review final sem finding bloqueante.

---

## Estrutura do repositório

```text
.
├── .github/
│   └── workflows/          # CI e Lighthouse
├── app/
│   ├── (pages)/            # Rotas da aplicação
│   ├── api/                # APIs do App Router
│   ├── components/         # UI, layouts e componentes de domínio
│   ├── context/            # Auth, tema e UI global
│   ├── hooks/              # Hooks de páginas/domínio
│   ├── lib/                # Regras, CRUD e infraestrutura
│   ├── schemas/            # Schemas Zod
│   ├── services/           # Clientes e serviços
│   ├── stylesheets/        # CSS global/design tokens
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Utilitários
├── docs/
│   ├── design/             # Protótipos e especificação do redesign
│   ├── operations/         # Runbook de produção
│   └── quality/            # Baselines e auditorias de qualidade
├── prisma/
│   ├── migrations/         # Histórico imutável de schema
│   └── schema.prisma       # Modelo de dados
├── public/                 # Manifest, ícones e assets públicos
├── scripts/                # Budget e automações de Lighthouse
├── package.json
├── pnpm-lock.yaml
├── prisma.config.ts
├── next.config.ts
└── vercel.json
```

---

## Documentação adicional

### Design

- [Redesign v2 — especificação visual](docs/design/redesign-v2-spec.md)
- [Protótipo 2 aprovado](docs/design/redesign-prototype-2-approved.jpg)
- [Roadmap #163](https://github.com/felipe-urgal/controle-gastos/issues/163)

### Operação

- [Runbook de produção](docs/operations/runbook.md)

### Qualidade

- documentação de baseline e auditoria em `docs/quality/`;
- workflow de CI em `.github/workflows/ci.yml`;
- workflow Lighthouse em `.github/workflows/lighthouse.yml`;
- orçamento de frontend em `scripts/check-frontend-budget.mjs`.

---

## Checklist rápido para começar

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
# preencher .env.local sem versionar segredos
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Abra:

```text
http://localhost:5100
```

Antes de enviar um PR:

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
