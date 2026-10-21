import { describe, expect, it } from "vitest";

import {
  AuthEmailDeliveryError,
  emailDeliveryFailureContext,
} from "@/app/lib/auth/auth-email";

describe("emailDeliveryFailureContext", () => {
  it("expõe nome e status do erro do provedor, sem mensagem nem destinatário", () => {
    const error = new AuthEmailDeliveryError("validation_error", 403);

    expect(emailDeliveryFailureContext(error)).toEqual({
      reason: "AUTH_EMAIL_DELIVERY_FAILED",
      providerError: "validation_error",
      providerStatus: 403,
    });
    expect(error.message).toBe("AUTH_EMAIL_DELIVERY_FAILED");
  });

  it.each([
    "RESEND_FROM_EMAIL_NOT_CONFIGURED",
    "NEXT_PUBLIC_SITE_URL_NOT_CONFIGURED",
  ])("identifica configuração ausente: %s", (message) => {
    expect(emailDeliveryFailureContext(new Error(message))).toEqual({
      reason: message,
    });
  });

  it("identifica chave do Resend ausente", () => {
    expect(
      emailDeliveryFailureContext(new Error("Missing API key. Pass it to the constructor")),
    ).toEqual({ reason: "RESEND_API_KEY_NOT_CONFIGURED" });
  });

  it("nunca repassa texto livre do erro (pode conter e-mail)", () => {
    const context = emailDeliveryFailureContext(new Error("falha ao enviar para pessoa@example.com"));

    expect(context).toEqual({ reason: "UNKNOWN" });
    expect(JSON.stringify(context)).not.toContain("@");
    expect(emailDeliveryFailureContext("string solta")).toEqual({ reason: "UNKNOWN" });
  });
});
