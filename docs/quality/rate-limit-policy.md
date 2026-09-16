# Política de rate limiting por classe de risco

Issue: #536  
Roadmap: #290 — Fase 2, Segurança, item 15  
Baseline inicial: `ed8be385147804ae662696b01af67818e4641400`

## Objetivo

Usar o limiter PostgreSQL existente de forma proporcional ao risco, sem Redis obrigatório, sem armazenar identificadores em claro e sem transformar toda leitura autenticada em write de controle.

O primitive canônico vive em `app/lib/security/rate-limit.ts` e mantém:

- chave SHA-256 derivada de `action:identifier`;
- estado compartilhado no PostgreSQL (`AuthRateLimit`);
- transação `Serializable`;
- retry limitado para conflito `P2034`;
- `Retry-After` calculado a partir do bloqueio.

Rate limiting complementa — e nunca substitui — validação, ownership, idempotência, atomicidade e limites de payload.

## Matriz

| Classe | Fluxo | Identificador | Política atual/alvo | Estado |
| --- | --- | --- | --- | --- |
| auth estrito | login | IP + `IP:e-mail` | 30/IP e 5/principal em 15 min; bloqueio 15 min | existente |
| auth estrito | MFA login/desativação | IP + user ID | 30/IP e 5/principal em 15 min; bloqueio 15 min | existente |
| auth recovery | forgot-password | IP + e-mail | 10/IP e 3/e-mail em 1 h; bloqueio 1 h | existente |
| auth recovery | reset-password | IP + hash do token | 20/IP e 5/token em 1 h; bloqueio 1 h | existente |
| auth recovery | verificar reset token | IP | 30/IP em 15 min; bloqueio 15 min | existente |
| auth criação | signup | IP | 10/IP em 1 h; bloqueio 1 h | #537 |
| operação cara | preview/confirmação de importação | user ID autenticado | follow-up de #536; manter limites de arquivo/itens | pendente |
| mutation financeira | transactions e ações correlatas | user ID autenticado | follow-up de #536; política comum sem mover IP/Request para regras puras | pendente |
| leitura comum | GETs autenticados | — | sem contador PostgreSQL por padrão | decisão explícita |

## Por que leitura comum não usa o limiter persistido

`consumeRateLimit` grava/atualiza uma linha no PostgreSQL a cada consumo. Aplicá-lo indiscriminadamente a GETs converteria tráfego de leitura em writes serializáveis, aumentando contensão e custo justamente para proteger endpoints de menor risco.

Leituras comuns permanecem protegidas por:

- autenticação e ownership;
- paginação e limites máximos de contrato;
- filtros/horizontes bounded;
- limites adicionais dos itens 16 e 23 da roadmap quando necessários.

Endpoints de leitura excepcionalmente caros podem receber política própria após medição; isso não transforma `common-read` em classe persistida global.

## Regras de implementação

1. políticas de auth existentes não mudam de threshold sem finding específico;
2. classes autenticadas preferem user ID a IP quando o handler já possui `userId`;
3. não duplicar autenticação só para obter identificador de rate limit;
4. não importar `Request`/IP em funções puras de domínio;
5. retornar 429 com `Retry-After` quando houver bloqueio;
6. logs de rate limiting não incluem e-mail, token, payload financeiro ou identificador bruto;
7. identificadores permanecem hashados no banco;
8. novos limiters devem ter regressão direta de bloqueio e de ausência de efeito colateral quando bloqueados.

## Evolução

- #537 consolida o primitive genérico no namespace `security` e protege signup;
- os próximos recortes de #536 aplicam a classe de operação cara à importação e a classe de mutation financeira aos fluxos prioritários de transactions;
- o item 15 só deve ser encerrado após esses recortes e CI integrado final verde.
