CREATE TABLE "mcp_access_tokens" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "token_prefix" VARCHAR(20) NOT NULL,
    "scope" VARCHAR(40) NOT NULL DEFAULT 'finance:read',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_access_tokens_token_hash_key"
ON "mcp_access_tokens"("token_hash");

CREATE INDEX "mcp_access_tokens_userId_revoked_at_expires_at_idx"
ON "mcp_access_tokens"("userId", "revoked_at", "expires_at");

CREATE INDEX "mcp_access_tokens_expires_at_idx"
ON "mcp_access_tokens"("expires_at");

ALTER TABLE "mcp_access_tokens"
ADD CONSTRAINT "mcp_access_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
