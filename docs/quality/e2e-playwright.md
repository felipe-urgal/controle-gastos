# E2E mínimo com Playwright

## Objetivo

O E2E de navegador complementa Vitest, CI e Lighthouse com uma verificação de integração real entre interface, autenticação, APIs, Prisma e PostgreSQL.

A cobertura inicial foi introduzida pela #206 como parte da etapa avançada de DX/CI da #133.

## Escopo inicial

O spec `tests/e2e/financial-flow.spec.mjs` cobre em Chromium:

1. criação de um usuário isolado pela API de signup;
2. login pela interface em `/login`;
3. criação de conta e categoria de apoio pelas APIs autenticadas do próprio app;
4. criação de uma transação `COMPLETED` pela interface em `/transacoes/nova`;
5. confirmação de que a movimentação criada aparece na listagem;
6. invalidação da sessão pela remoção do cookie e confirmação do redirect de rota protegida para `/login`;
7. novo login, logout pela interface e nova confirmação de bloqueio da rota protegida.

A transação usa valor em centavos e categoria `EXPENSE`; nenhuma conversão de moeda ou regra financeira paralela é introduzida pelo teste.

## Isolamento e segurança

- o workflow usa PostgreSQL efêmero do GitHub Actions;
- produção nunca é usada pelo E2E;
- usuário, conta, categoria e transação são criados exclusivamente para a execução;
- credenciais são placeholders de teste e não correspondem a segredos reais;
- o teste usa a autenticação/cookie real da aplicação para preparar relações financeiras;
- ownership continua sendo validado pelos endpoints existentes;
- nenhum payload financeiro real é persistido fora do banco efêmero.

## Execução local

Pré-requisitos: dependências do projeto instaladas, PostgreSQL de desenvolvimento configurado em `DATABASE_URL` e migrations aplicadas.

```bash
pnpm test:e2e:install
pnpm build
pnpm test:e2e
```

`playwright.config.mjs` inicia `next start` na porta `5100` e aguarda `/api/health`. Se já houver um servidor local compatível em execução, ele pode ser reutilizado fora de CI.

O runner é executado com `@playwright/test@1.51.1` explicitamente pinado via `pnpm dlx`, seguindo o mesmo princípio usado pelo projeto para o Lighthouse: tooling de automação não vira dependência do runtime da aplicação.

## GitHub Actions

`.github/workflows/e2e.yml` roda em mudanças que podem afetar o fluxo autenticado ou a infraestrutura E2E. O job:

1. instala dependências com lockfile congelado;
2. sobe PostgreSQL 17 efêmero;
3. aplica migrations;
4. gera o build de produção;
5. instala Chromium do Playwright;
6. executa `pnpm test:e2e` com um worker;
7. publica `playwright-report` e `test-results` quando existirem.

Em falhas, trace, screenshot e vídeo são retidos pelo Playwright para diagnóstico. O workflow não substitui Vitest, Lighthouse, frontend budget nem o smoke manual PWA da #148.

## Critério de evolução

Adicionar novos E2Es somente quando trouxerem cobertura de integração que não seja mais barata/confiável em teste unitário ou de API. Fluxos prioritários continuam sendo autenticação, integridade financeira e regressões que dependam de navegador real.

Refs #133, #148, #206 e `AGENTS.md`.
