# Produção

Este é o ponto de entrada canônico para preparar, promover e verificar o Controle de Gastos em produção.

A produção usa o contrato `git-managed` do Dev Dashboard com provider `vercel`. Neste projeto, **git-managed não significa deploy automático por push**: `vercel.json` mantém `git.deploymentEnabled=false`, então merge em `main` e promoção de produção são etapas distintas.

Não existe `prod:deploy` local. A promoção é explícita pelo Dev Dashboard/API, que executa a etapa `provider-deploy` para a revision confirmada de `origin/main`.

## Visão rápida

```text
branch/PR
  -> pnpm prod:check
  -> merge em main
  -> pnpm prod:migrate      # quando houver migration aplicável
  -> provider-deploy explícito pelo Dev Dashboard/API
  -> Vercel READY
  -> pnpm prod:verify
  -> smoke/observabilidade conforme risco
```

`READY` da Vercel confirma a etapa do provider, mas não substitui migration, health ou smoke funcional.

## 1. Preflight de produção

Antes de promover uma mudança relevante:

```bash
pnpm prod:check
```

`prod:check` é um preflight isolado. Ele:

1. exige `CHECK_DATABASE_URL` apontando para PostgreSQL descartável e não produtivo;
2. aguarda o banco ficar acessível;
3. aplica `pnpm db:migrate` nesse banco;
4. executa `pnpm check` com placeholders locais para JWT/Resend e sem credenciais Vercel conhecidas.

`pnpm check` cobre:

```text
lint -> typecheck -> test -> build
```

Frontend budget, Lighthouse, E2E e bundle analysis continuam checks direcionados por risco; não fazem parte de `prod:check` por padrão.

No Dev Dashboard, o banco isolado de check fica configurado localmente em:

```text
.dev-dashboard/.env.check.local
```

com:

```dotenv
CHECK_DATABASE_URL=postgresql://...
```

Nunca aponte esse gate para produção apenas para fazê-lo passar.

## 2. Merge e migration são independentes da promoção

O build executa `prisma generate && next build`; ele **não** executa migration automaticamente.

O merge em `main` também **não** cria deployment Vercel. Ele apenas torna a revision elegível para o fluxo operacional do Dev Dashboard.

Quando o runtime novo depende de schema novo:

1. revise a migration e o SQL gerado;
2. confirme compatibilidade da ordem de deploy;
3. crie checkpoint/snapshot/branch de recuperação quando o risco justificar;
4. configure explicitamente a `DATABASE_URL` de produção no contexto operacional correto;
5. execute `pnpm prod:migrate` pela etapa de migration do plano;
6. confirme o schema antes da promoção do provider.

`prod:migrate` usa a implementação canônica:

```text
pnpm db:migrate -> prisma migrate deploy
```

Depois confirme, quando aplicável:

```bash
pnpm db:status
```

Migrations aplicadas não são editadas; correções usam `forward-fix`.

## 3. Promotion / provider-deploy

A promoção canônica é iniciada explicitamente no Dev Dashboard/API para um plano confirmado.

O contrato versionado em `.dev-dashboard/production.json` declara:

- `strategy: git-managed`;
- `provider: vercel`;
- `branch: main`;
- `migrations: before-deploy`;
- `prod:check`, `prod:migrate` e `prod:verify` como comandos locais canônicos.

No planner do Dev Dashboard, o fluxo é:

```text
check -> migrate? -> provider-deploy -> verify
```

Antes de `provider-deploy`, o backend revalida a revision remota e promove exatamente o SHA confirmado. Não crie commits artificiais, `git push` oculto, `vercel --prod` ou aliases paralelos para disparar produção.

`vercel.json` deve continuar com:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Reativar a integração Git automática criaria um segundo caminho de promoção e quebraria este contrato.

## 4. Verificação pós-deploy

Depois que a etapa `provider-deploy` terminar em `READY`:

```bash
pnpm prod:verify
```

Esse comando consulta:

```text
GET https://controle-gastos-pessoal.vercel.app/api/health
```

Para mudanças relevantes, complete o smoke proporcional ao risco:

1. confirmar `/api/health` = 200;
2. validar a rota pública principal;
3. validar proteção de uma rota autenticada sem sessão;
4. validar o fluxo funcional diretamente afetado quando houver sessão de teste segura;
5. verificar 5xx e sinais operacionais do deployment novo.

## 5. Rollback e recuperação

Rollback de aplicação pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior.

Se uma migration avançou o schema de forma incompatível, não faça rollback cego. Siga o runbook e use `forward-fix` ou restauração coordenada conforme o incidente.

Detalhes de incidentes, logs, request IDs, Neon, restore drill e rollback:

- [`operations/runbook.md`](operations/runbook.md).

## 6. Cotas externas

Limitações de quota do provider são dependências externas, não erro de build/código.

Não crie commits artificiais nem altere o produto para tentar contornar a cota. Continue usando CI e checks como evidência e retome a promoção explícita quando a plataforma permitir.

## Contratos e referências

- [`.dev-dashboard/production.json`](../.dev-dashboard/production.json): contrato consumido pelo Dev Dashboard;
- [`operations/production-contract.md`](operations/production-contract.md): detalhes técnicos do contrato `git-managed` + `provider-deploy`;
- [`operations/vercel-main-only-255.md`](operations/vercel-main-only-255.md): registro histórico do fluxo automático anterior, supersedido pelo PR #315;
- [`operations/runbook.md`](operations/runbook.md): incidentes, rollback e recuperação;
- [`DEVELOPMENT.md`](DEVELOPMENT.md): setup local e gate antes do PR.
