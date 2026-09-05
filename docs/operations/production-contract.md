# Contrato operacional de produção

O Controle de Gastos usa o `Production Contract v1` do Dev Dashboard. A receita operacional canônica fica em [`../PRODUCTION.md`](../PRODUCTION.md); este documento detalha o contrato técnico.

O manifesto versionado fica em `.dev-dashboard/production.json` e declara `strategy: git-managed`, `provider: vercel` e `branch: main`.

## Semântica de `git-managed`

Neste contrato, `git-managed` significa que a revision promovida é uma revision Git conhecida e confirmada. **Não significa que um push dispara produção.**

Desde o PR #315, `vercel.json` mantém:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Portanto:

- merge/push em `main` não cria deployment Vercel automaticamente;
- a promoção é explícita pelo Dev Dashboard/API;
- o planner usa a etapa `provider-deploy` para o provider Vercel;
- imediatamente antes da promoção, o backend deve provar novamente `origin/main` e o SHA confirmado;
- `READY` conclui a etapa do provider, mas `prod:verify` permanece separado.

O fluxo canônico é:

```text
branch/PR
  -> quality / prod:check
  -> merge em main
  -> prod:migrate quando aplicável
  -> provider-deploy explícito
  -> Vercel READY
  -> prod:verify
  -> smoke/QA conforme risco
```

## Comandos locais canônicos

```bash
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
```

| Comando | Responsabilidade | Mutação |
| --- | --- | --- |
| `prod:check` | migrations no banco isolado de check + `pnpm check` | pode alterar somente o banco de teste; nunca produção |
| `prod:migrate` | `prisma migrate deploy` no ambiente explicitamente configurado | altera schema de produção |
| `prod:verify` | consulta `GET /api/health` no domínio de produção | somente leitura |

Não existe `prod:deploy` local neste projeto. `provider-deploy` pertence ao domínio de deployment do Dev Dashboard e não deve ser reproduzido por script, `git push`, `vercel --prod` ou outro caminho paralelo.

## Ambiente isolado de check

`prod:check` exige `CHECK_DATABASE_URL` não produtiva. No Dev Dashboard ela fica somente em `.dev-dashboard/.env.check.local`.

A conexão usada por migration de produção permanece separada em `.dev-dashboard/.env.production.local`. Ambos os arquivos são locais/ignorados e nunca devem apontar para o mesmo banco.

O CI exerce o mesmo princípio com PostgreSQL efêmero antes de `pnpm check`.

## Migration, provider e verify são sinais distintos

Migration é uma mutação explícita e independente do deploy. O provider não deve inferir nem executar migration por conta própria.

Da mesma forma, Vercel `READY` prova o estado do deployment específico no provider, mas não prova health funcional. O sucesso só é operacionalmente completo depois de `prod:verify` e do smoke proporcional ao risco.

## Backup, rollback e recovery

Backup/checkpoint é responsabilidade do provider de banco e permanece `external` no contrato.

Rollback de aplicação pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior. Depois de migration incompatível, não há rollback cego: usar `forward-fix` ou recuperação coordenada conforme [`runbook.md`](runbook.md).

## Segurança

O manifesto não contém token da Vercel, connection string, JWT ou segredo de aplicação. Credenciais permanecem somente no ambiente local dos adapters.

O browser não escolhe token, owner, repo, ref ou SHA. O backend deriva e revalida esses dados antes da mutação.

## Histórico

[`vercel-main-only-255.md`](vercel-main-only-255.md) documenta o contrato anterior em que a integração Git automática da Vercel era usada para `main`. Esse documento é histórico e foi supersedido operacionalmente pelo PR #315; ele não deve ser usado como runbook vigente.
