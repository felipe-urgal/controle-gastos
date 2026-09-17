# Rate limiter transaction retry hotfix

## Contexto

Após o merge do hardening de segurança (#539), o CI integrado expôs uma diferença entre os formatos de erro usados pelo Prisma Client e pelo adapter PostgreSQL em conflitos transacionais serializáveis.

O limiter já fazia retry para `PrismaClientKnownRequestError` com código `P2034`, mas o adapter pode propagar conflitos como `DriverAdapterError` com `originalCode` PostgreSQL:

- `40001` — serialization failure;
- `40P01` — deadlock detected.

## Contrato

O retry deve permanecer limitado a conflitos transacionais transitórios conhecidos. Erros não transitórios, como `23505` (unique violation), devem continuar propagando imediatamente.

A regressão está coberta em `app/lib/security/__tests__/rate-limit-retry.test.ts`.
