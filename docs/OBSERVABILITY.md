# Observabilidade e operação

Contrato operacional mínimo. Sem APM próprio, sem tracing distribuído e sem dependência externa no request path: logs JSON estruturados na plataforma de deploy, health checks e smoke read-only.

## Health

| Endpoint | Papel | Dependências |
|---|---|---|
| `GET /api/health/live` | liveness barato | nenhuma (não consulta o banco) |
| `GET /api/health` | readiness | `SELECT 1` com timeout de 2 s (`HEALTH_DB_TIMEOUT_MS`) |

- Readiness lenta é indisponibilidade: timeout ou erro → `503` com `database: "unavailable"`. O timeout só abandona a espera do check; não cancela queries da aplicação.
- Contrato público mínimo: `status`, `checks.application`, `checks.database`, `requestId`, `timestamp`. Nunca adicionar versão/host/connection string/migrations/detalhes de provider. Erro interno vai só para o log (`health_check_failed`, `reason: timeout|error`).
- Compatibilidade de schema **não** é verificada pelo health. O gate é a migration no deploy/CI; o smoke autenticado exercita leituras reais do domínio (contas, transações, forecast).

## Request ID

- `x-request-id` é um **correlation ID**: o cliente pode fornecê-lo e reutilizá-lo (smoke/debug). Não é identificador de segurança, não deve ser usado para autorização nem como chave de auditoria. Eventos de auditoria críticos devem gerar ID próprio no servidor.
- Regra única em `app/lib/request-id.ts` (`/^[a-zA-Z0-9._:-]{8,128}$/`, senão UUID), usada pelo `proxy.ts` e por `app/lib/observability.ts`. O proxy propaga o ID para a request interna e a resposta.

## Logs

Formato: uma linha JSON por evento com `timestamp`, `level`, `service`, `environment`, `version` (commit curto) e `deploymentId` (valores do servidor, nunca do cliente), `event` e contexto.

Nunca logar: valores monetários, descrições, e-mails, tokens/segredos (bearer, `cgmcp_`, JWT, `re_`, CRON/BRAPI), documentos/OCR, payloads ou saída de tools, mensagem bruta de erro. Erros registram apenas `name` e stack sanitizada/truncada. IDs internos (ex.: `tokenId` do MCP) só quando necessários para operação.

Redaction por formato (postgres, Bearer, `re_`, `cgmcp_`, JWT) e por valor exato de `CRON_SECRET`, `BRAPI_TOKEN` e `RESEND_API_KEY` quando configurados. A proteção principal é não logar mensagens/payloads; redaction é rede de segurança.

Retenção: definida pela plataforma de logs do deploy; a aplicação não persiste logs e eles não são fonte de auditoria.

### Operações instrumentadas

Critério: jobs, providers externos, read models caros, importações e auth/security. CRUD trivial não é instrumentado.

| Área | Evento | Campos |
|---|---|---|
| Padrão de rota | `logServerOperation` | `event`, `requestId`, `route`, `status`, `durationMs` |
| Cron do resumo | `periodic_summary.cron`, `.partial_failure`, `.alert` | contagens, backlog, idade, duração |
| MCP | `mcp_request` | `requestId`, `method`, `tool`, `status`, `durationMs`, `tokenId`, `result` |
| Providers | `external_provider_call` | `provider`, `operation`, `outcome`, `retries`, `durationMs` |
| Client error | `frontend_unhandled_error` | `requestId`, `digest`, `surface`, `path` normalizado |

Providers cobertos: `brapi`, `bcb_sgs`, `bcb_ptax`, `resend`. `outcome` distingue `user_error` (entrada/ativo inexistente/configuração) de `upstream_unavailable` (timeout, 429, 5xx) e `upstream_error` (payload inválido). Nunca registram símbolo, moeda/data, destinatário ou conteúdo.

### Erros do browser

O browser envia apenas `digest`, `surface` (`route` | `global`, allowlist) e `pathname`. O servidor normaliza o pathname (sem query/hash; segmentos que não são estáticos viram `:id`) e descarta qualquer outro campo. Build/deployment vêm do próprio servidor (`version`, `deploymentId`), não do cliente. Source maps privados, se o provider os oferecer, são uma integração opcional: nada depende deles.

## Indicadores mínimos (metas iniciais)

| Indicador | Fonte | Meta inicial |
|---|---|---|
| Readiness | `/api/health` | 200 em < 2 s; 503 persistente = incidente |
| Taxa de 5xx | logs de plataforma | investigar acima de 1% em janela de 15 min |
| p95 de read models críticos | `durationMs` (forecast, dashboard) | acompanhar; investigar degradação sustentada |
| Cron do resumo | `periodic_summary.cron` | `backlogRemaining` caindo; sem `.alert` |
| Providers | `external_provider_call` | `upstream_unavailable` recorrente na janela |

Sem dashboard complexo antes de haver volume: use filtros nos logs da plataforma.

## Alertas

Alertar somente eventos acionáveis: health 503 persistente; `periodic_summary.alert` (falhas ≥ 3 no lote, marcador, deadline, cobertura em risco ou usuário parado > 9 dias — falha isolada gera apenas `.partial_failure`); provider degradado por janela; pico de 5xx. Não alertar cada client error. Canais de alerta não recebem dados financeiros.

## Smoke de produção

`pnpm prod:smoke` é não destrutivo e de timeout curto: health, `/login`, redirect de `/dashboard`, API privada 401 e, com credencial, login + leitura de contas, transações e forecast (read model composto). Nenhuma escrita. O workflow `Prod Smoke` (`.github/workflows/prod-smoke.yml`) roda diariamente e sob demanda; configure a variável `PROD_SMOKE_BASE_URL` e os secrets `PROD_SMOKE_EMAIL`/`PROD_SMOKE_PASSWORD` (sem credencial, executa só as checagens públicas).

A conta de smoke (`PROD_SMOKE_EMAIL`/`PROD_SMOKE_PASSWORD`) deve ser dedicada: sem MFA, sem dados financeiros reais, senha forte e rotacionável, nunca uma conta pessoal. É uma credencial permanente de produção: restrinja-a ao segredo do workflow e rotacione periodicamente. Alternativa futura (mecanismo read-only de smoke) só se reduzir risco.
