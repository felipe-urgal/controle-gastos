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

## Regressão encontrada durante a implantação

O primeiro ciclo completo do E2E revelou que `/dashboard` não fazia parte de `PROTECTED_PREFIXES` no `proxy.ts`. Sem o cookie de sessão, a rota chegava a ser carregada e uma camada cliente redirecionava para `/`, enquanto as demais áreas autenticadas eram bloqueadas no servidor e direcionadas para `/login`.

A correção incluiu `/dashboard` no proxy de autenticação. O E2E passou a exercer essa garantia explicitamente: após remover o cookie, acessar `/dashboard` deve resultar em `/login` antes de o conteúdo autenticado ser disponibilizado.

Esse finding é um exemplo do tipo de regressão para o qual o E2E deve ser usado: comportamento que atravessa navegador, cookie, proxy, autenticação e navegação e que não é completamente representado por um teste unitário isolado.

## Isolamento e segurança

- o workflow usa PostgreSQL efêmero do GitHub Actions;
- produção nunca é usada pelo E2E;
- usuário, conta, categoria e transação são criados exclusivamente para a execução;
- credenciais são placeholders de teste e não correspondem a segredos reais;
- o teste usa a autenticação/cookie real da aplicação para preparar relações financeiras;
- ownership continua sendo validado pelos endpoints existentes;
- nenhum payload financeiro real é persistido fora do banco efêmero.

## Dependências do runner

O Playwright fica isolado em `tests/e2e/package.json` com `@playwright/test@1.62.1` pinado exatamente e lockfile próprio em `tests/e2e/pnpm-lock.yaml`.

A instalação usa o mesmo pnpm do projeto com `--ignore-workspace`, evitando que a dependência exclusiva do navegador seja misturada ao lockfile da aplicação. O lockfile E2E continua congelado no CI, portanto a resolução do runner é reproduzível.

O `vitest.config.ts` exclui explicitamente `tests/e2e/**`; assim os specs de navegador pertencem somente ao Playwright e não são coletados pelo gate unitário/de integração do Vitest.

## Execução local

Pré-requisitos: dependências do projeto instaladas, PostgreSQL de desenvolvimento configurado em `DATABASE_URL` e migrations aplicadas.

```bash
pnpm test:e2e:install
pnpm build
pnpm test:e2e
```

`pnpm test:e2e:install` instala as dependências E2E pelo lockfile isolado e baixa o Chromium. `playwright.config.mjs` inicia `next start` na porta `5100` e aguarda `/api/health`. Se já houver um servidor local compatível em execução, ele pode ser reutilizado fora de CI.

## GitHub Actions

`.github/workflows/e2e.yml` roda em mudanças que podem afetar o fluxo autenticado ou a infraestrutura E2E. O job:

1. instala as dependências da aplicação com o lockfile raiz congelado;
2. instala as dependências do runner com `tests/e2e/pnpm-lock.yaml` congelado;
3. sobe PostgreSQL 17 efêmero;
4. aplica migrations;
5. gera o build de produção;
6. instala Chromium e dependências de sistema pelo Playwright;
7. executa `pnpm test:e2e` com um worker;
8. publica `playwright-report` e `test-results` quando existirem.

Em falhas, trace, screenshot e vídeo são retidos pelo Playwright para diagnóstico. O workflow não substitui Vitest, Lighthouse, frontend budget nem o smoke manual PWA da #148.

## Critério de evolução

Adicionar novos E2Es somente quando trouxerem cobertura de integração que não seja mais barata/confiável em teste unitário ou de API. Fluxos prioritários continuam sendo autenticação, integridade financeira e regressões que dependam de navegador real.

Refs #133, #148, #206 e `AGENTS.md`.
