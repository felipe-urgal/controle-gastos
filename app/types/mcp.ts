export type McpTokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type McpAccessTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: "finance:read";
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  status: McpTokenStatus;
};

export type McpCreatedAccessToken = Omit<
  McpAccessTokenSummary,
  "revokedAt" | "lastUsedAt" | "status"
> & {
  token: string;
};

export type McpCreateTokenInput = {
  name: string;
  expiresInDays: 30 | 90 | 180 | 365;
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
};
