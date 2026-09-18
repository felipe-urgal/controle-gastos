# Rate limiter transaction retry hotfix

## Contexto

Após o merge do hardening de segurança (#539), o CI integrado expôs uma diferença entre os formatos de erro usados pelo Prisma Client e pelo adapter PostgreSQL em conflitos transacionais serializáveis.

O limiter já fazia retry para `PrismaClientKnownRequestError` com código `P2034`, mas o adapter pode propagar conflitos como `DriverAdapterError` com `originalCode` PostgreSQL:

- `40001` — serialization failure;
- `40P01` — deadlock detected.

## Contrato

O retry deve permanecer limitado a conflitos transacionais transitórios conhecidos. Erros não transitórios, como `23505` (unique violation), devem continuar propagando imediatamente.

A regressão está coberta em `app/lib/security/__tests__/rate-limit-retry.test.ts`.

## Validação final

O hotfix foi mergeado pelo PR #542 no commit `0c90a57d9fefac30e528e8264257a4a4c3f13898`.
O CI de `push` da `main` #1011 (run `35218781391`) concluiu com sucesso, fechando a regressão observada no run #1007.


## Follow-up #567 — contenção transitória prolongada

Em 2026-09-18, o CI de `push` da `main` #1038 falhou em `step-up-auth.integration.test.ts` mesmo com o hotfix anterior ativo.

O PostgreSQL retornou conflitos serializáveis suficientes para esgotar três tentativas imediatas. A falha não veio de erro lógico do step-up nem de mudança na política de bloqueio; foi contenção transitória no mesmo primitive compartilhado.

Ajuste:

- isolamento continua `Serializable`;
- `P2034`, `40001` e `40P01` continuam sendo os únicos conflitos retryable;
- budget máximo passa de 3 para 5 tentativas;
- backoff bounded entre retries: 5 ms, 10 ms, 20 ms e 40 ms;
- total máximo de espera adicional: 75 ms;
- caminho sem conflito não espera;
- erro não transitório continua propagando na primeira tentativa.

A regressão adiciona quatro conflitos `P2034` consecutivos seguidos de sucesso para provar que o quinto attempt pode recuperar sem loop ilimitado.
