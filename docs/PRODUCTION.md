# Produção

Este é o ponto de entrada canônico para preparar, promover e verificar o Controle de Gastos em produção.

A produção é **git-managed pela Vercel** a partir da branch `main`. Não existe `prod:deploy` local neste projeto.

## Visão rápida

```text
pnpm prod:check
  -> checkpoint/recuperação quando necessário
  -> pnpm prod:migrate      # quando houver migration aplicável
  -> confirmar schema saudável
  -> merge em main
  -> Vercel cria o deployment
  -> confirmar READY
  -> pnpm prod:verify
  -> smoke/observabilidade conforme risco
```

`READY` da Vercel não substitui migration, health ou smoke funcional.

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

## 2. Migration de produção

O build executa `prisma generate && next build`; ele **não** executa migration automaticamente.

Quando o runtime novo depende de schema novo:

1. revise a migration e o SQL gerado;
2. confirme compatibilidade da ordem de deploy;
3. crie checkpoint/snapshot/branch de recuperação quando o risco justificar;
4. configure explicitamente a `DATABASE_URL` de produção no contexto operacional correto;
5. execute:

```bash
pnpm prod:migrate
```

`prod:migrate` usa a mesma implementação canônica de migration:

```text
pnpm db:migrate -> prisma migrate deploy
```

Depois confirme:

```bash
pnpm db:status
```

Esperado: schema atualizado e sem migration pendente.

Migrations aplicadas não são editadas; correções usam `forward-fix`.

## 3. Deployment

Não existe comando local de deploy.

A promoção é:

```text
merge/push em main
  -> integração Git da Vercel
  -> Production Deployment
```

A política de `vercel.json` mantém build/deploy efetivo restrito a `main`.

Não crie aliases que escondam `git push`, `vercel --prod` ou outra promoção fora do contrato git-managed.

## 4. Verificação pós-deploy

Depois que a Vercel marcar o deployment como `READY`:

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

A mensagem da Vercel:

```text
api-deployments-free-per-day
Resource is limited - try again in 24 hours
```

é limitação externa, não erro de build/código.

Não crie commits artificiais nem altere o produto para tentar contornar a cota. Continue usando CI e checks locais como evidência e retome a validação real de deployment quando a plataforma permitir.

## Contratos e referências

- [`.dev-dashboard/production.json`](../.dev-dashboard/production.json): contrato consumido pelo Dev Dashboard;
- [`operations/production-contract.md`](operations/production-contract.md): detalhes técnicos do contrato git-managed;
- [`operations/runbook.md`](operations/runbook.md): incidentes, rollback e recuperação;
- [`DEVELOPMENT.md`](DEVELOPMENT.md): setup local e gate antes do PR.
