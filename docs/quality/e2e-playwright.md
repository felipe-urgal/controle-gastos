# E2E com Playwright

## Objetivo

O E2E de navegador complementa Vitest, CI e Lighthouse com uma verificação de integração real entre interface, autenticação, APIs, Prisma e PostgreSQL.

A cobertura inicial foi introduzida pela #206 como parte da etapa avançada de DX/CI da #133 e passou a compor a matriz determinística do QA final do Redesign v3 na #253.

## Escopo atual

O spec `tests/e2e/financial-flow.spec.mjs` cobre o fluxo autenticado e regressões transversais em navegador real do runner:

1. criação de um usuário isolado pela API de signup;
2. login pela interface em `/login`;
3. criação de conta e categoria de apoio pelas APIs autenticadas do próprio app;
4. criação de uma transação `COMPLETED` pela interface em `/transacoes/nova`;
5. confirmação de que a movimentação criada aparece na listagem;
6. invalidação da sessão pela remoção do cookie e confirmação do redirect de rota protegida para `/login`;
7. novo login, logout pela interface e nova confirmação de bloqueio da rota protegida;
8. regressões determinísticas de shell/mobile, touch targets, foco, filtros, reflow e importação nas viewports cobertas pelo spec.

A transação usa valor em centavos e categoria `EXPENSE`; nenhuma conversão de moeda ou regra financeira paralela é introduzida pelo teste.

## Matriz de browsers

`playwright.config.mjs` define três projetos:

- `chromium`;
- `firefox`;
- `webkit`.

A mesma suíte é executada nos três engines. Os checks de viewport já existentes no spec usam `page.setViewportSize(...)`, incluindo 320px e 390px em fluxos críticos, de modo que o Chromium continua cobrindo desktop e viewport mobile emulado sem criar uma segunda suíte duplicada apenas para layout.

O projeto `webkit` fornece evidência de compatibilidade com a engine usada pelo Safari, mas **não substitui Safari real, iOS, teclado virtual, safe-area física, password manager ou tecnologia assistiva em dispositivo**. Essas validações permanecem manuais na #253.

## Regressão encontrada durante a implantação

O primeiro ciclo completo do E2E revelou que `/dashboard` não fazia parte de `PROTECTED_PREFIXES` no `proxy.ts`. Sem o cookie de sessão, a rota chegava a ser carregada e uma camada cliente redirecionava para `/`, enquanto as demais áreas autenticadas eram bloqueadas no servidor e direcionadas para `/login`.

A correção incluiu `/dashboard` no proxy de autenticação. O E2E passou a exercer essa garantia explicitamente: após remover o cookie, acessar `/dashboard` deve resultar em `/login` antes de o conteúdo autenticado ser disponibilizado.

Esse finding é um exemplo do tipo de regressão para o qual o E2E deve ser usado: comportamento que atravessa navegador, cookie, proxy, autenticação e navegação e que não é completamente representado por um teste unitário isolado.

## Isolamento e segurança

- cada job do workflow usa PostgreSQL efêmero do GitHub Actions;
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

`pnpm test:e2e:install` instala as dependências E2E pelo lockfile isolado e baixa Chromium, Firefox e WebKit. `playwright.config.mjs` inicia `next start` na porta `5100` e aguarda `/api/health`. Se já houver um servidor local compatível em execução, ele pode ser reutilizado fora de CI.

Para executar apenas um engine:

```bash
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
pnpm test:e2e -- --project=webkit
```

## GitHub Actions

`.github/workflows/e2e.yml` roda em mudanças que podem afetar o fluxo autenticado ou a infraestrutura E2E. O job usa matriz com `fail-fast: false` para `chromium`, `firefox` e `webkit`. Cada engine executa isoladamente:

1. instala as dependências da aplicação com o lockfile raiz congelado;
2. instala as dependências do runner com `tests/e2e/pnpm-lock.yaml` congelado;
3. sobe PostgreSQL 17 efêmero;
4. aplica migrations;
5. gera o build de produção;
6. instala somente o browser do job e suas dependências de sistema;
7. executa `pnpm test:e2e -- --project=<browser>` com um worker;
8. publica `playwright-report` e `test-results` com nome de artefato específico do browser quando existirem.

Em falhas, trace, screenshot e vídeo são retidos pelo Playwright para diagnóstico. O workflow não substitui Vitest, Lighthouse, frontend budget, Safari/iPhone real, smoke com tecnologia assistiva nem o smoke manual PWA da #148.

## Critério de evolução

Adicionar novos E2Es somente quando trouxerem cobertura de integração que não seja mais barata/confiável em teste unitário ou de API. Fluxos prioritários continuam sendo autenticação, integridade financeira, acessibilidade determinística e regressões que dependam de navegador real.

A matriz multi-engine deve ser tratada como gate técnico: incompatibilidade real encontrada em Firefox/WebKit deve ser corrigida ou registrada explicitamente; não se deve desabilitar um projeto apenas para manter o workflow verde.

Refs #133, #148, #206, #253 e `AGENTS.md`.
