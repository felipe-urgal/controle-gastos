# Desenvolvimento local

Este é o ponto de entrada canônico para instalar o projeto, subir a aplicação, validar uma mudança e preparar um PR.

## Pré-requisitos

- Node.js `24.x`;
- Corepack;
- pnpm `10.34.5` (fonte de verdade: `package.json#packageManager`);
- PostgreSQL de desenvolvimento;
- variáveis locais baseadas em `.env.example`.

## Preparação inicial

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

Preencha `.env` somente com credenciais de desenvolvimento. Nunca use segredos de produção em setup local, teste, issue, PR ou log compartilhado.

O Prisma carrega `.env` por `prisma.config.ts`; `DATABASE_URL` também pode ser fornecida diretamente no ambiente do processo.

## Banco local

Verifique o estado e aplique as migrations versionadas:

```bash
pnpm db:status
pnpm db:migrate
```

Quando precisar apenas regenerar o Prisma Client:

```bash
pnpm db:generate
```

Migrations já aplicadas são imutáveis. Correções usam `forward-fix` e mudanças destrutivas exigem plano de recuperação.

## Subir a aplicação

```bash
pnpm dev
```

Aplicação local:

```text
http://localhost:5100
```

Antes do PR, valide manualmente o fluxo alterado quando isso fizer sentido para a mudança.

## Gate canônico antes do PR

Depois de preparar/migrar o banco quando aplicável, execute:

```bash
pnpm check
```

`pnpm check` executa, nesta ordem:

```text
lint -> typecheck -> test -> build
```

Esse é o gate obrigatório de código. O CI usa a mesma interface depois de aplicar migrations em PostgreSQL efêmero:

```text
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm check
```

Isso evita listas diferentes de comandos entre máquina local, documentação e GitHub Actions.

## Checks direcionados

Não transforme diagnósticos caros em custo fixo de todo PR.

### E2E

Use quando a mudança afetar fluxo integrado de navegador, autenticação ou interação crítica:

```bash
pnpm test:e2e:install
pnpm test:e2e
```

Detalhes: [`quality/e2e-playwright.md`](quality/e2e-playwright.md).

### Frontend budget

Use quando houver mudança relevante de dependência, asset, chunk/bundle, suspeita concreta de regressão ou requisito explícito:

```bash
pnpm check:frontend-budget
```

Para investigação de bundle:

```bash
pnpm analyze
```

Lighthouse e demais diagnósticos seguem a mesma regra proporcional ao risco.

## Fluxo esperado de uma issue

```text
issue
  -> branch dedicada
  -> implementação + testes
  -> pnpm db:migrate quando aplicável
  -> pnpm dev + validação manual do fluxo alterado
  -> pnpm check
  -> PR
  -> CI do head atual
  -> auto code review completo
  -> correções
  -> CI/check do head final
  -> merge
  -> produção conforme docs/PRODUCTION.md quando aplicável
```

Qualquer push novo invalida a validação final anterior.

## Documentação relacionada

- [`../AGENTS.md`](../AGENTS.md): contrato completo para agentes;
- [`quality/testing-strategy.md`](quality/testing-strategy.md): estratégia de testes;
- [`PRODUCTION.md`](PRODUCTION.md): promoção e verificação em produção;
- [`operations/runbook.md`](operations/runbook.md): incidentes, rollback e recuperação.
