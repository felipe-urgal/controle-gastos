import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  McpCreateTokenInput,
  McpCreatedAccessToken,
  McpTokenList,
} from "@/app/types/mcp";

export const mcpService = {
  async listTokens(): Promise<ApiResponse<McpTokenList>> {
    return apiClient<ApiResponse<McpTokenList>>(
      "/api/mcp/tokens",
      { method: "GET" },
    );
  },

  async createToken(
    input: McpCreateTokenInput,
  ): Promise<ApiResponse<McpCreatedAccessToken>> {
    return apiClient<ApiResponse<McpCreatedAccessToken>, McpCreateTokenInput>(
      "/api/mcp/tokens",
      {
        method: "POST",
        body: input,
      },
    );
  },

  async revokeToken(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient<ApiResponse<{ id: string }>>(
      `/api/mcp/tokens/${id}`,
      { method: "DELETE" },
    );
  },
};
