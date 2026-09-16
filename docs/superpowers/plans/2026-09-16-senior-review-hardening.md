# Senior Review Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir em um único PR os findings materiais do code review sênior sobre autenticação, recuperação de senha, identidade de e-mail, rate limiting, paginação e observabilidade.

**Architecture:** Manter handlers HTTP finos e concentrar regras novas em primitives pequenas de `app/lib/auth` e `app/lib/security`. Preservar ownership server-side e os contratos financeiros atuais. E-mail passa a ter prova de posse para novos cadastros e alterações; usuários existentes são migrados como já verificados para evitar lockout.

**Tech Stack:** Next.js 16, TypeScript 6, Prisma 7/PostgreSQL, Vitest, bcryptjs, Resend.

**Spec:** Findings registrados no code review da conversa de 2026-09-16.

## Global Constraints

- KISS/YAGNI; não criar framework genérico de segurança.
- `app/api` permanece borda HTTP e regras reutilizáveis ficam em `app/lib`.
- Nunca confiar em IDs do cliente para ownership.
- Novas senhas usam uma única política server-side e bcrypt cost 12.
- E-mail persistido continua limitado a 120 caracteres, igual ao Prisma.
- Falhas públicas de signup/forgot-password não revelam existência de conta.
- `pnpm check`/CI canônico deve ficar verde antes de considerar concluído.

---

### Task 1: Política canônica de senha e limites de identidade

**Files:**
- Create: `app/lib/auth/password-policy.ts`
- Modify: `app/lib/auth/auth-input.ts`
- Modify: `app/api/auth/signup/route.ts`
- Modify: `app/api/auth/reset-password/route.ts`
- Modify: `app/lib/users/user-schema.ts`
- Modify: `app/lib/users/user-crud.ts`
- Test: `app/api/auth/reset-password/__tests__/route.integration.test.ts`
- Test: `app/lib/users/__tests__/user-crud.test.ts`

**Interfaces:**
- Produces: `passwordSchema`, `validatePassword`, `hashPassword`, `PASSWORD_BCRYPT_ROUNDS`.
- E-mail HTTP máximo: 120 caracteres.

- [ ] **Step 1: Write the failing tests** para rejeitar senha fraca no reset/troca, exigir cost 12 e rejeitar e-mail >120.
- [ ] **Step 2: Run test to verify it fails** via CI do commit RED.
- [ ] **Step 3: Write minimal implementation** centralizando política e hash.
- [ ] **Step 4: Run tests to verify they pass** no CI do head.
- [ ] **Step 5: Commit** `fix(auth): centralize password and identity policy`.

### Task 2: Signup e verificação de posse do e-mail

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260916193000_add_email_verification/migration.sql`
- Create: `app/lib/auth/email-verification.ts`
- Create: `app/lib/auth/auth-email.ts`
- Create: `app/api/auth/verify-email/route.ts`
- Modify: `app/api/auth/signup/route.ts`
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/lib/users/user-crud.ts`
- Modify: `app/types/user.ts`
- Modify: `app/services/auth-service.ts`
- Test: `app/api/auth/__tests__/signup-security.test.ts`
- Test: new verification integration tests.

**Interfaces:**
- `User.emailVerifiedAt: DateTime?` e `User.pendingEmail: String?`.
- `EmailVerificationToken` armazena apenas SHA-256 do token raw, TTL 24h e e-mail alvo.
- Usuários existentes recebem `email_verified_at = created_at` na migration.
- Signup novo retorna sempre a mesma resposta `202` para e-mail disponível ou já existente.
- Alteração de e-mail mantém o endereço atual até confirmação do novo endereço.

- [ ] **Step 1: Write the failing tests** para resposta indistinguível, login bloqueado antes da confirmação e troca de e-mail pendente.
- [ ] **Step 2: Run test to verify it fails** via CI RED.
- [ ] **Step 3: Write minimal implementation** de token hash-only, emissão, confirmação atômica e atualização de identidade.
- [ ] **Step 4: Run tests to verify they pass**.
- [ ] **Step 5: Commit** `fix(auth): verify email ownership`.

### Task 3: Recuperação de senha e e-mail seguro

**Files:**
- Modify: `app/api/auth/forgot-password/route.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/e2e.yml`
- Modify: `.github/workflows/lighthouse.yml`
- Modify: `scripts/prod-check.mjs`
- Test: forgot-password security tests.

**Interfaces:**
- `RESEND_FROM_EMAIL` passa a ser o único remetente configurável; sem hardcode `onboarding@resend.dev`.
- Falha de provider é logada internamente, token emitido é invalidado e a resposta pública continua genérica 200.
- Templates escapam conteúdo do usuário antes de interpolar HTML.

- [ ] **Step 1: Write the failing tests** para provider failure não virar oracle e para escape de nome.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement** remetente configurável, compensação e HTML escaping.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `fix(auth): harden transactional email delivery`.

### Task 4: Step-up auth para operações destrutivas/sensíveis

**Files:**
- Create: `app/lib/security/step-up-auth.ts`
- Create: `app/lib/users/delete-user.ts`
- Modify: `app/api/user/route.ts`
- Modify: `app/lib/api/base-crud-handler.ts`
- Modify: `app/lib/users/user-crud.ts`
- Modify: `app/api/auth/mfa/enrollment/start/route.ts`
- Modify: `app/services/user-service.ts`
- Modify: `app/hooks/users/user-show.ts`
- Modify: `app/components/overlays/confirmation-modal/index.tsx`
- Modify: `app/components/pages/user/show/index.tsx`
- Test: user deletion/step-up tests.

**Interfaces:**
- Buckets `step-up-ip` e `step-up-user`, janela 15min, máximo 30/IP e 5/usuário.
- Delete exige senha atual e, quando 2FA está ativo, exatamente um TOTP ou recovery code; fator é consumido contra replay.
- Troca de senha/e-mail e início de enrollment também usam o limiter antes de bcrypt.

- [ ] **Step 1: Write failing tests** para DELETE sem credencial, brute force autenticado e MFA obrigatório.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement** primitive e adaptar UI/API.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `fix(security): require step-up auth for sensitive actions`.

### Task 5: Rate limiter lifecycle e login por principal real

**Files:**
- Modify: `app/lib/security/rate-limit.ts`
- Modify: `app/api/auth/login/route.ts`
- Modify: `prisma/schema.prisma`
- Create: migration de índice de limpeza se necessário.
- Test: `app/lib/auth/__tests__/auth-rate-limit.integration.test.ts`
- Test: login/MFA integration tests.

**Interfaces:**
- Bucket `login-principal` passa a usar e-mail normalizado, independente do IP.
- Limiter faz GC oportunístico de buckets inativos vencidos, sem remover bloqueios ativos.

- [ ] **Step 1: Write failing tests** para mesmo e-mail em IPs diferentes compartilhar limite e bucket expirado ser purgado.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement** principal real + GC com retenção conservadora.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `fix(security): harden auth rate limiter lifecycle`.

### Task 6: Query hardening do CRUD genérico

**Files:**
- Modify: `app/lib/api/base-crud-handler.ts`
- Modify: `app/lib/transactions/transaction-crud.ts`
- Test: new `base-crud-handler` query tests.

**Interfaces:**
- `pageSize` e `limit` no máximo 100.
- `page`, `pageSize`, `limit` precisam ser inteiros positivos quando informados.
- Conversão numérica só ocorre em `numericFilterFields`; enums/IDs permanecem strings.

- [ ] **Step 1: Write failing tests** para teto de paginação e `status=1` continuar string.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement** parser estrito e atualizar transactions para `year/month` numéricos.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `fix(api): bound generic list queries`.

### Task 7: Observabilidade pública sem amplificação

**Files:**
- Modify: `app/api/observability/client-error/route.ts`
- Modify: `app/api/health/route.ts`
- Create: `app/api/health/live/route.ts`
- Test: route tests.

**Interfaces:**
- Client-error recebe bucket por IP e deixa de gerar logs depois do limite; resposta continua 204 para não criar retry storm no cliente.
- Health readiness mantém DB check mas não gera `info` a cada sucesso.
- `/api/health/live` é liveness barato sem acesso ao banco.

- [ ] **Step 1: Write failing tests** para suppress de log e liveness sem Prisma.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement** rate limit/sampling e liveness.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `fix(observability): bound public telemetry amplification`.

### Task 8: Validação final e PR

**Files:**
- Update: este plano com checklist concluído se necessário.
- Update: descrição do PR com findings, mudanças e evidências.

- [ ] **Step 1:** rodar CI canônico do head e inspecionar jobs `Apply migrations`, `Quality gate`, testes e build.
- [ ] **Step 2:** corrigir qualquer regressão até o mesmo head ficar verde.
- [ ] **Step 3:** revisar diff final procurando segredo, token raw persistido, bypass de ownership ou alteração não relacionada.
- [ ] **Step 4:** abrir/manter um único PR para review, sem merge automático.
