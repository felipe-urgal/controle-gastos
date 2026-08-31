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
| `prod:check` | lint + typecheck + testes + build + frontend budget | não altera produção |
| `prod:migrate` | `prisma migrate deploy` usando o ambiente explicitamente configurado | altera schema; usar somente com contexto de produção confirmado |
| `prod:verify` | consulta `GET /api/health` no domínio de produção | somente leitura |

Não existe `prod:deploy` local neste projeto. O manifesto declara `strategy: git-managed`; o futuro adapter Vercel do Dev Dashboard deverá acompanhar revision/deployment e provider status sem esconder um `git push` ou `vercel --prod` dentro de um alias genérico.

## Backup e rollback

Backup/checkpoint é responsabilidade do provider de banco e permanece `external` no contrato. Para migration destrutiva, siga o runbook do Neon antes de aplicar a mudança.

Rollback de aplicação pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior. Se o schema avançou de forma incompatível, não faça rollback cego.

## Segurança

O manifesto não contém token da Vercel, connection string, JWT, segredo de aplicação ou qualquer credencial. O nome público do projeto e a URL de health são metadados não sensíveis.

Nenhum CI/PR deve executar `prod:migrate` contra produção apenas para validar este contrato. O gate de código é `prod:check`; `prod:verify` consulta somente o health público.
