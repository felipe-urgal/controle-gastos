import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bcryptHash: vi.fn(),
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
  consumeRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  signEmailVerificationToken: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: {
      create: mocks.userCreate,
      findUnique: mocks.userFindUnique,
    },
  },
}));

vi.mock("@/app/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  getRequestIp: mocks.getRequestIp,
}));

vi.mock("@/app/lib/auth/email-verification-token", () => ({
  signEmailVerificationToken: mocks.signEmailVerificationToken,
}));

vi.mock("@/app/lib/auth/auth-email", () => ({
  sendEmailVerification: mocks.sendEmailVerification,
}));

import { POST } from "@/app/api/auth/signup/route";

const REQUEST_ID = "signup-security-test-123";
const SIGNUP_IP = "203.0.113.10";
const ACCEPTED_MESSAGE =
  "Se os dados puderem ser cadastrados, enviaremos um link de verificação para o e-mail informado.";

function signupRequest() {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": REQUEST_ID,
      "x-forwarded-for": SIGNUP_IP,
    },
    body: JSON.stringify({
      name: "Novo Usuário",
      email: "novo@example.com",
      password: "Senha123",
    }),
  });
}

describe("POST /api/auth/signup security policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.consumeRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
    mocks.getRequestIp.mockReturnValue(SIGNUP_IP);
    mocks.signEmailVerificationToken.mockReturnValue("verification-token");
    mocks.sendEmailVerification.mockResolvedValue(undefined);
    mocks.userFindUnique.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rate limits signup by IP before bcrypt or database writes", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 3_600,
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(body).toEqual({
      success: false,
      message: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
    });
    expect(mocks.getRequestIp).toHaveBeenCalledTimes(1);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      action: "signup-ip",
      identifier: SIGNUP_IP,
      maxAttempts: 10,
      windowMs: 3_600_000,
      blockMs: 3_600_000,
    });
    expect(mocks.bcryptHash).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("keeps the successful public response generic and sends verification", async () => {
    mocks.userCreate.mockResolvedValue({
      id: "user-123",
      name: "Novo Usuário",
      email: "novo@example.com",
      authVersion: 0,
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(body).toEqual({ success: true, message: ACCEPTED_MESSAGE });
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        name: "Novo Usuário",
        email: "novo@example.com",
        password: "hashed-password",
        emailVerifiedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        authVersion: true,
      },
    });
    expect(mocks.signEmailVerificationToken).toHaveBeenCalledWith({
      userId: "user-123",
      email: "novo@example.com",
      kind: "signup",
      authVersion: 0,
    });
    expect(mocks.sendEmailVerification).toHaveBeenCalledWith({
      to: "novo@example.com",
      name: "Novo Usuário",
      token: "verification-token",
    });
  });

  it("does not reveal that an email already belongs to an account", async () => {
    mocks.userCreate.mockRejectedValue({ code: "P2002" });
    mocks.userFindUnique.mockResolvedValue({
      id: "existing-user",
      name: "Usuário existente",
      email: "novo@example.com",
      authVersion: 2,
      emailVerifiedAt: new Date(),
      isActive: true,
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(body).toEqual({ success: true, message: ACCEPTED_MESSAGE });
    expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("uses structured sanitized observability for unexpected failures", async () => {
    mocks.userCreate.mockRejectedValue(new Error("database exploded"));

    const response = await POST(signupRequest());

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(console.error).toHaveBeenCalledTimes(1);

    const [line] = vi.mocked(console.error).mock.calls[0] ?? [];
    expect(typeof line).toBe("string");

    const entry = JSON.parse(String(line));
    expect(entry).toMatchObject({
      level: "error",
      event: "auth_signup_failed",
      requestId: REQUEST_ID,
      route: "/api/auth/signup",
      status: 500,
    });
    expect(JSON.stringify(entry)).not.toContain("novo@example.com");
    expect(JSON.stringify(entry)).not.toContain("Senha123");
    expect(JSON.stringify(entry)).not.toContain("database exploded");
  });
});
