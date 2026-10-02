import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { revokeMcpAccessTokenForUser } from "@/app/lib/mcp/mcp-token";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;

    await revokeMcpAccessTokenForUser(userId, id);
    return success({ id }, "Token MCP revogado");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Não foi possível revogar o token MCP",
    });
  }
}
