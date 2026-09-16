# Auth Policy Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar e fechar gaps materiais na política de autenticação, cookies e tokens da aplicação sem antecipar novas features de autenticação.

**Architecture:** Tratar a auditoria como recorte audit-first da #290: documentar a superfície atual, provar contratos já corretos e transformar apenas gaps materiais em follow-ups pequenos. Qualquer correção deve preservar `app/lib/auth.ts` como gateway server-side, manter rotas HTTP finas e usar testes de regressão focados antes da implementação.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, jsonwebtoken, bcryptjs, Vitest, GitHub Actions.

**Spec:** GitHub issue #514.

## Global Constraints

- KISS/YAGNI; sem framework interno de autenticação.
- Não implementar nova feature de MFA neste recorte.
- Não logar JWT, reset token, senha ou segredo MFA.
- Não enfraquecer atributos de cookie, rate limiting ou mensagens anti-enumeração.
- Antes de cada write remoto, refetch do head e arquivos afetados.
- Gate canônico final: `pnpm check` via CI no head exato quando execução local não estiver disponível.
- PR/merge somente com autorização do usuário e head final validado.

---

### Task 1: Inventário e evidência da política atual

**Files:**
- Create: `docs/quality/auth-policy-audit-514.md`
- Inspect: `app/lib/auth.ts`
- Inspect: `app/lib/auth/auth-cookie.ts`
- Inspect: `app/lib/auth/auth-token.ts`
- Inspect: `app/lib/auth/password-reset-token.ts`
- Inspect: `app/api/auth/login/route.ts`
- Inspect: `app/api/auth/logout/route.ts`
- Inspect: `app/api/auth/mfa/verify/route.ts`
- Inspect: `app/api/auth/forgot-password/route.ts`
- Inspect: `app/api/auth/reset-password/route.ts`
- Inspect: `app/lib/users/user-crud.ts`

**Interfaces:**
- Consumes: política da Fase 1 / item 3 da #290.
- Produces: matriz `controle -> evidência -> classificação -> follow-up`.

- [ ] **Step 1: Mapear sessão JWT**

Registrar algoritmo, issuer, audience, TTL, claims, pontos de emissão e verificação.

- [ ] **Step 2: Mapear cookie de sessão**

Registrar `HttpOnly`, `Secure`, `SameSite`, `Path`, `Max-Age`, `Priority` e simetria de limpeza.

- [ ] **Step 3: Mapear reset e mudança de senha**

Registrar entropia/hash/expiração/uso único de reset token e se sessões anteriores são invalidadas.

- [ ] **Step 4: Mapear enumeração e logs**

Confirmar mensagens públicas de login/forgot/reset e campos realmente emitidos em `logEvent`.

- [ ] **Step 5: Classificar findings**

Usar `conforme`, `gap material` ou `inconclusivo`; criar follow-up apenas para `gap material`.

### Task 2: Corrigir cada gap material com TDD

**Files:**
- Test: arquivo de teste mais próximo da responsabilidade afetada.
- Modify: somente arquivos diretamente necessários ao gap.

**Interfaces:**
- Consumes: findings materiais da Task 1.
- Produces: regressão automatizada + implementação mínima.

- [ ] **Step 1: Escrever teste RED focado**

O teste deve demonstrar o risco específico antes da correção, sem testar detalhe irrelevante de implementação.

- [ ] **Step 2: Confirmar RED no CI/head**

O motivo da falha deve corresponder ao contrato ausente.

- [ ] **Step 3: Implementar a menor correção**

Preservar contratos públicos existentes e evitar mudança de produto não requerida.

- [ ] **Step 4: Confirmar GREEN**

Executar CI canônico no head final e registrar job/step de quality gate.

- [ ] **Step 5: Revisar diff completo**

Confirmar ausência de vazamento de segredo, regressão de cookie, enumeração ou escopo extra.

### Task 3: Fechamento e integração

**Files:**
- Modify: descrição das issues/PRs e comentário de progresso da #290.

**Interfaces:**
- Consumes: audit document e PRs verdes.
- Produces: ciclo fechado com evidência rastreável.

- [ ] **Step 1: Abrir PR auditável por recorte**

Cada PR deve indicar head, diff, evidência RED/GREEN quando houver runtime change e relação com #290.

- [ ] **Step 2: Refetch antes do merge**

Confirmar `main`, head do PR, `mergeable=true` e CI `completed/success` no SHA exato.

- [ ] **Step 3: Merge sequencial**

Usar head esperado; depois de cada merge, recalcular o próximo PR contra o novo `main`.

- [ ] **Step 4: Validar CI pós-merge de main**

Não considerar o bloco encerrado antes do quality gate pós-merge.

- [ ] **Step 5: Atualizar #290**

Registrar findings corrigidos, itens já conformes, PRs/commits e estado final do backlog.
