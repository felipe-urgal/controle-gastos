# Runbook de produção

Este documento cobre diagnóstico, health/readiness, rollback de aplicação e recuperação do banco sem registrar ou expor segredos.

## 1. Sinais e correlação

Todas as requisições passam a receber um `x-request-id`. Em respostas 5xx críticas de autenticação/reset, o mesmo identificador também é devolvido no JSON para facilitar suporte.

Os eventos de servidor são emitidos em JSON para os Runtime Logs/Observability da Vercel com estes campos mínimos:

- `timestamp`
- `level`
- `service`
- `environment`
- `event`
- `requestId`
- `route`
- `status`
- `durationMs` quando aplicável

Nunca incluir senha, JWT, reset token, connection string, e-mail/IP bruto ou payload financeiro em contexto de log.

Eventos operacionais relevantes:

- `health_check_ok`
- `health_check_failed`
- `auth_login_succeeded`
- `auth_login_rejected`
- `auth_login_rate_limited`
- `auth_login_failed`
- `password_reset_requested`
- `password_reset_request_rate_limited`
- `password_reset_request_failed`
- `password_reset_succeeded`
- `password_reset_rejected`
- `password_reset_failed`
- `password_reset_token_verify_rate_limited`
- `password_reset_token_verify_failed`
- `frontend_unhandled_error`

## 2. Health/readiness

Endpoint: `GET /api/health`

- `200`: aplicação e consulta mínima ao PostgreSQL disponíveis.
- `503`: aplicação respondeu, mas a consulta mínima ao banco falhou.
- `cache-control: no-store` evita mascarar indisponibilidade.
- A resposta não expõe host, database, role, stack ou mensagem do driver.

Smoke test:

```bash
curl -i https://controle-gastos-pessoal.vercel.app/api/health
```

Esperado em operação normal: HTTP 200, `status=ok` e um `x-request-id`.

## 3. Diagnóstico de incidente

1. Capture o `x-request-id` apresentado na resposta ou informado pelo usuário.
2. Abra Vercel > projeto `controle-gastos` > Logs/Observability.
3. Pesquise pelo `requestId`.
4. Correlacione o evento com status HTTP e duração da rota.
5. Para regressões gerais, agrupe por status 5xx e rota.
6. Para autenticação/reset, filtre pelos eventos listados acima.
7. Não copie dados sensíveis de logs para issue/PR/ticket.

Baseline operacional recomendado:

- taxa de 5xx por rota;
- p95 de latência das APIs;
- quantidade de `auth_login_failed`;
- quantidade de rate limits de login/reset;
- quantidade de `password_reset_request_failed` e `password_reset_failed`;
- disponibilidade e latência de `/api/health`.

## 4. Rollback de deploy Vercel

Use rollback quando a falha for causada por código/configuração de aplicação e o schema atual continuar compatível com o deployment anterior.

1. Identifique o último deployment de produção conhecido como saudável.
2. Confirme que ele usa variáveis de ambiente válidas e schema compatível.
3. Faça rollback/promote desse deployment pela Vercel.
4. Valide `/api/health`, login, contas, categorias e transações.
5. Registre o deployment restaurado e o `request-id` de um health check pós-rollback.

Não faça rollback cego de código se houve migration incompatível após o deployment anterior.

## 5. Política de banco Neon

Para alterações destrutivas:

1. Criar checkpoint/snapshot ou branch de recuperação antes da migration.
2. Registrar migration alvo e horário.
3. Aplicar a migration apenas após backup/checkpoint disponível.
4. Preferir `forward-fix` para migrations já aplicadas.
5. Nunca editar uma migration já aplicada em produção.
6. Para perda/corrupção de dados, restaurar para uma branch não produtiva primeiro e validar antes de qualquer troca de produção.

## 6. Teste de restauração em ambiente não produtivo

O drill deve usar uma branch/snapshot derivado da produção, nunca o banco de produção diretamente.

Checklist:

1. Criar branch de restore no Neon a partir de um checkpoint/snapshot conhecido.
2. Obter uma connection string temporária sem publicá-la em terminal compartilhado, issue ou PR.
3. Executar `prisma migrate status` contra a branch restaurada.
4. Validar contagens básicas das tabelas `users`, `accounts`, `categories` e `transactions` sem exportar dados pessoais.
5. Executar smoke test da aplicação em Preview apontando para a branch restaurada.
6. Confirmar `/api/health` = 200, login e leitura de contas/transações.
7. Excluir a branch temporária após o drill.
8. Registrar apenas data, duração, resultado e eventuais gaps; nunca registrar a connection string.

## 7. Estratégia para migration com falha

- Migration não aplicada: corrigir e reenviar normalmente.
- Migration parcialmente aplicada: inspecionar estado real antes de marcar como resolvida.
- Migration aplicada com bug lógico e sem perda de dados: criar migration de correção (`forward-fix`).
- Migration destrutiva com perda/corrupção: interromper escrita, restaurar snapshot/branch validado e coordenar retorno da aplicação.

## 8. Pós-incidente

Antes de encerrar:

- causa raiz registrada;
- janela de impacto estimada;
- request IDs representativos preservados;
- nenhum segredo em logs/tickets;
- health normalizado;
- ação preventiva convertida em issue/teste quando aplicável.
