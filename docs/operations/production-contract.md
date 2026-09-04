# Contrato operacional de produção

O Controle Gastos expõe um contrato padronizado para integração com o Dev Dashboard sem substituir o fluxo git-managed da Vercel. A receita operacional canônica fica em [`../PRODUCTION.md`](../PRODUCTION.md); este documento detalha o contrato técnico consumido pelo dashboard.

O manifesto versionado fica em:

```text
.dev-dashboard/production.json
```

Diagnóstico, rollback e recuperação continuam documentados em [`runbook.md`](runbook.md).

## Estratégia

```text
main / Git
   ↓
Vercel deployment
```

A integração Git da Vercel é **main-only** para build/deploy efetivo. `vercel.json` mantém `git.deploymentEnabled` como política principal e um `ignoreCommand` defensivo que ignora qualquer build cujo `VERCEL_GIT_COMMIT_REF` não seja `main`. A Vercel ainda pode registrar um deployment de branch como `CANCELED`, mas o Ignored Build Step encerra o fluxo antes do build da aplicação; portanto esse registro não é um Preview Deployment efetivo. Comentários automáticos do bot Vercel ficam silenciados nos PRs. O CI do GitHub continua sendo o gate de branches de trabalho; a Vercel só avança automaticamente para build/deploy quando a `main` muda.

A validação pós-hardening está registrada em [`vercel-main-only-255.md`](vercel-main-only-255.md). Depois do PR #258, branches recentes foram canceladas no `ignoreCommand`, enquanto merges subsequentes da `main` continuaram gerando Production Deployments `READY`.

Quando código novo depende de schema novo, a ordem segura continua sendo:

```text
prod:check
   ↓
checkpoint/recuperação quando necessário
   ↓
prod:migrate
   ↓
confirmar schema saudável
   ↓
merge/promover código
   ↓
Vercel READY
   ↓
prod:verify
```

`READY` da Vercel não substitui migration, health ou smoke funcional.

## Comandos locais canônicos

```bash
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
```

| Comando | Responsabilidade | Mutação |
| --- | --- | --- |
| `prod:check` | migrations no banco isolado de check + `pnpm check` (`lint`, `typecheck`, testes e build) | pode alterar somente o banco de teste; nunca produção |
| `prod:migrate` | `pnpm db:migrate` / `prisma migrate deploy` usando o ambiente explicitamente configurado | altera schema de produção; usar somente com contexto confirmado |
| `prod:verify` | consulta `GET /api/health` no domínio de produção | somente leitura |

Frontend budget, Lighthouse, E2E e bundle analysis são checks direcionados por risco e não fazem parte de `prod:check` por padrão.

Não existe `prod:deploy` local neste projeto. O manifesto declara `strategy: git-managed`; o adapter Vercel do Dev Dashboard acompanha revision/deployment e provider status sem esconder um `git push` ou `vercel --prod` dentro de um alias genérico.

## Ambiente isolado de check

`prod:check` exige uma conexão **não produtiva** recebida como:

```dotenv
CHECK_DATABASE_URL=postgresql://...
```

No fluxo pelo Dev Dashboard, essa variável fica somente em:

```text
.dev-dashboard/.env.check.local
```

O runner de `prod:check` valida `CHECK_DATABASE_URL`, aguarda de forma limitada por até 60 segundos o host/porta do banco ficar acessível, converte a conexão em `DATABASE_URL` apenas para os subprocessos do check, aplica `pnpm db:migrate` nesse banco e então executa `pnpm check`. A espera tolera a inicialização normal do PostgreSQL, mas não provisiona infraestrutura ausente. Em timeout, a mensagem informa somente host/porta e nunca inclui credenciais ou a connection string completa.

A conexão de produção permanece separada em:

```text
.dev-dashboard/.env.production.local
```

com `DATABASE_URL` usada por `prod:migrate`. Os dois arquivos são locais, ignorados pelo Git e nunca devem apontar para o mesmo banco.

O banco de check deve ser descartável e dedicado ao projeto. Não use uma cópia com dados reais quando um banco limpo puder ser provisionado. O runner também substitui JWT/Resend por placeholders locais e remove credenciais Vercel conhecidas do ambiente entregue aos subprocessos do check.

No CI, o mesmo contrato é exercitado com PostgreSQL efêmero `controle_gastos_test`: `pnpm db:migrate` prepara o schema e `pnpm check` executa o gate de código usado também no desenvolvimento local.

## Backup e rollback

Backup/checkpoint é responsabilidade do provider de banco e permanece `external` no contrato. Para migration destrutiva, siga o runbook do Neon antes de aplicar a mudança.

Rollback de aplicação pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior. Se o schema avançou de forma incompatível, não faça rollback cego.

## Segurança

O manifesto não contém token da Vercel, connection string, JWT, segredo de aplicação ou qualquer credencial. O nome público do projeto e a URL de health são metadados não sensíveis.

Nenhum CI/PR deve executar `prod:migrate` contra produção apenas para validar este contrato. O preflight de produção é `prod:check`, sempre com banco de check isolado; `prod:verify` consulta somente o health público.
