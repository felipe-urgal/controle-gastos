-- Sessões de login por aparelho e histórico de eventos de segurança da conta.
-- Tokens emitidos antes desta migration não têm `sid` e continuam válidos até expirar.

-- CreateEnum
CREATE TYPE "AccountSecurityEventType" AS ENUM (
  'LOGIN',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'TWO_FACTOR_ENABLED',
  'TWO_FACTOR_DISABLED',
  'SESSIONS_REVOKED'
);

-- CreateTable
CREATE TABLE "auth_sessions" (
  "id" TEXT NOT NULL,
  "user_agent" VARCHAR(200),
  "auth_version" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "userId" TEXT NOT NULL,

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_security_events" (
  "id" TEXT NOT NULL,
  "type" "AccountSecurityEventType" NOT NULL,
  "user_agent" VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,

  CONSTRAINT "account_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revoked_at_expires_at_idx" ON "auth_sessions"("userId", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "account_security_events_userId_created_at_idx" ON "account_security_events"("userId", "created_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_security_events" ADD CONSTRAINT "account_security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
