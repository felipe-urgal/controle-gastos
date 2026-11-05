import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";

export type AuthSessionItem = {
  id: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export type SecurityEventType =
  | "LOGIN"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "TWO_FACTOR_ENABLED"
  | "TWO_FACTOR_DISABLED"
  | "SESSIONS_REVOKED";

export type SecurityEventItem = {
  id: string;
  type: SecurityEventType;
  device: string | null;
  createdAt: string;
};

export const securityService = {
  listSessions(): Promise<ApiResponse<{ items: AuthSessionItem[] }>> {
    return apiClient("/api/auth/sessions", { method: "GET" });
  },
  revokeSession(id: string): Promise<ApiResponse<{ id: string; revokedCurrent: boolean }>> {
    return apiClient(`/api/auth/sessions/${id}`, { method: "DELETE" });
  },
  revokeOtherSessions(): Promise<ApiResponse<{ revoked: number }>> {
    return apiClient("/api/auth/sessions/revoke-others", { method: "POST" });
  },
  listEvents(): Promise<ApiResponse<{ items: SecurityEventItem[] }>> {
    return apiClient("/api/auth/events", { method: "GET" });
  },
};
