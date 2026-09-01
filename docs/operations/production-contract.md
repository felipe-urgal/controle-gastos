# Contrato operacional de produção

O Controle Gastos expõe um contrato padronizado para integração futura com o Dev Dashboard sem substituir o fluxo atual de produção. O deployment é **Git-managed pela Vercel** e as migrations Prisma continuam sendo uma etapa separada.

O manifesto versionado fica em:

```text
.dev-dashboard/production.json
```

A operação completa continua documentada em [`runbook.md`](runbook.md).

## Estratégia

```text
main / Git
   ↓
Vercel deployment
```

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
| `prod:check` | lint + typecheck + migrations no banco isolado de check + testes + build + frontend budget | pode alterar somente o banco de teste; nunca produção |
| `prod:migrate` | `prisma migrate deploy` usando o ambiente explicitamente configurado | altera schema de produção; usar somente com contexto confirmado |
| `prod:verify` | consulta `GET /api/health` no domínio de produção | somente leitura |

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

O runner de `prod:check` valida `CHECK_DATABASE_URL`, converte-a em `DATABASE_URL` apenas para os subprocessos do check e aplica `prisma migrate deploy` nesse banco antes da suíte. Assim, migrations e testes de integração usam um schema compatível sem acessar produção.

A conexão de produção permanece separada em:

```text
.dev-dashboard/.env.production.local
```

com `DATABASE_URL` usada por `prod:migrate`. Os dois arquivos são locais, ignorados pelo Git e nunca devem apontar para o mesmo banco.

O banco de check deve ser descartável e dedicado ao projeto. Não use uma cópia com dados reais quando um banco limpo puder ser provisionado. O runner também substitui JWT/Resend por placeholders locais e remove credenciais Vercel conhecidas do ambiente entregue aos subprocessos do check.

No CI, o mesmo contrato é exercitado com PostgreSQL efêmero `controle_gastos_test` e `CHECK_DATABASE_URL`, para que o comando validado pelo PR seja o mesmo usado antes do deployment.

## Backup e rollback

Backup/checkpoint é responsabilidade do provider de banco e permanece `external` no contrato. Para migration destrutiva, siga o runbook do Neon antes de aplicar a mudança.

Rollback de aplicação pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior. Se o schema avançou de forma incompatível, não faça rollback cego.

## Segurança

O manifesto não contém token da Vercel, connection string, JWT, segredo de aplicação ou qualquer credencial. O nome público do projeto e a URL de health são metadados não sensíveis.

Nenhum CI/PR deve executar `prod:migrate` contra produção apenas para validar este contrato. O gate de código é `prod:check`, sempre com banco de check isolado; `prod:verify` consulta somente o health público.
