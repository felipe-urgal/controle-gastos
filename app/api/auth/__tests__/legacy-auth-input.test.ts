import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  clearRateLimit: vi.fn(),
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  resendSend: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  passwordResetTokenFindUnique: vi.fn(),
  passwordResetTokenDeleteMany: vi.fn(),
  passwordResetTokenCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/app/lib/auth/auth-rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  getRequestIp: mocks.getRequestIp,
  clearRateLimit: mocks.clearRateLimit,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  },
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    passwordResetToken: {
      findUnique: mocks.passwordResetTokenFindUnique,
      deleteMany: mocks.passwordResetTokenDeleteMany,
      create: mocks.passwordResetTokenCreate,
    },
    $transaction: mocks.transaction,
  },
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("legacy auth input boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.consumeRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
    mocks.bcryptCompare.mockResolvedValue(false);
    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callbackOrOperations: unknown) => {
      if (typeof callbackOrOperations === "function") {
        return callbackOrOperations({
          passwordResetToken: {
            deleteMany: mocks.passwordResetTokenDeleteMany,
          },
          user: { update: mocks.userUpdate },
        });
      }
      return callbackOrOperations;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("handles null, array, and scalar JSON bodies without 500s", async () => {
    for (const body of [null, [], "invalid"]) {
      expect((await login(jsonRequest("/api/auth/login", body))).status).toBe(400);
      expect((await signup(jsonRequest("/api/auth/signup", body))).status).toBe(400);
      expect(
        (await forgotPassword(jsonRequest("/api/auth/forgot-password", body))).status,
      ).toBe(200);
      expect(
        (await resetPassword(jsonRequest("/api/auth/reset-password", body))).status,
      ).toBe(400);
    }
  });

  it("returns 400 instead of 500 when login fields have unexpected types", async () => {
    const response = await login(
      jsonRequest("/api/auth/login", { email: 123, password: ["secret"] }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects oversized login credentials before lookup or bcrypt", async () => {
    const passwordResponse = await login(
      jsonRequest("/api/auth/login", {
        email: "user@example.com",
        password: "A1" + "x".repeat(99),
      }),
    );
    const emailResponse = await login(
      jsonRequest("/api/auth/login", {
        email: `${"x".repeat(250)}@example.com`,
        password: "Senha123",
      }),
    );

    expect(passwordResponse.status).toBe(400);
    expect(emailResponse.status).toBe(400);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
  });

  it("returns 400 instead of 500 when signup fields have unexpected types", async () => {
    const response = await signup(
      jsonRequest("/api/auth/signup", {
        name: 123,
        email: "user@example.com",
        password: "Senha123",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects oversized signup text fields", async () => {
    const response = await signup(
      jsonRequest("/api/auth/signup", {
        name: "x".repeat(101),
        email: `${"x".repeat(250)}@example.com`,
        password: "Senha123",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("keeps forgot-password generic for invalid or oversized email input", async () => {
    const wrongType = await forgotPassword(
      jsonRequest("/api/auth/forgot-password", { email: { value: "user@example.com" } }),
    );
    const oversized = await forgotPassword(
      jsonRequest("/api/auth/forgot-password", {
        email: `${"x".repeat(250)}@example.com`,
      }),
    );

    expect(wrongType.status).toBe(200);
    expect((await wrongType.json()).success).toBe(true);
    expect(oversized.status).toBe(200);
    expect((await oversized.json()).success).toBe(true);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 instead of 500 when reset token/password types are invalid", async () => {
    const response = await resetPassword(
      jsonRequest("/api/auth/reset-password", {
        token: 123,
        novaSenha: ["Senha123"],
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.passwordResetTokenFindUnique).not.toHaveBeenCalled();
  });

  it("rejects oversized reset inputs before hashing or lookup", async () => {
    const tokenResponse = await resetPassword(
      jsonRequest("/api/auth/reset-password", {
        token: "x".repeat(65),
        novaSenha: "Senha123",
      }),
    );
    const passwordResponse = await resetPassword(
      jsonRequest("/api/auth/reset-password", {
        token: "x".repeat(64),
        novaSenha: "A1" + "x".repeat(99),
      }),
    );

    expect(tokenResponse.status).toBe(400);
    expect(passwordResponse.status).toBe(400);
    expect(mocks.passwordResetTokenFindUnique).not.toHaveBeenCalled();
    expect(mocks.bcryptHash).not.toHaveBeenCalled();
  });
});
