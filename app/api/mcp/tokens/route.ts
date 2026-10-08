import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  createMcpAccessTokenForUser,
  createMcpTokenSchema,
  listMcpAccessTokensForUser,
} from "@/app/lib/mcp/mcp-token";
import { SENSITIVE_ACTIONS } from "@/app/lib/security/sensitive-actions";
import { verifyStepUpAuth } from "@/app/lib/security/step-up-auth";

const requestSchema = createMcpTokenSchema.extend({
  currentPassword: z.string().min(1),
  token: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await listMcpAccessTokensForUser(userId));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Não foi possível carregar os tokens MCP",
    });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = requestSchema.parse(await parseJsonBody(request));

    await verifyStepUpAuth({
      request,
      userId,
      currentPassword: input.currentPassword,
      token: input.token,
      recoveryCode: input.recoveryCode,
      action: SENSITIVE_ACTIONS.MCP_TOKEN_CREATE,
    });

    const created = await createMcpAccessTokenForUser(userId, {
      name: input.name,
      expiresInDays: input.expiresInDays,
    });

    return success(created, "Token MCP criado. Copie agora; ele não será exibido novamente.", 201);
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Não foi possível criar o token MCP",
      zodMessage: "Dados inválidos",
    });
  }
}
