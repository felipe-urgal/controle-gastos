import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bcryptHash: vi.fn(),
  userCreate: vi.fn(),
  consumeRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
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
    },
  },
}));

vi.mock("@/app/lib/auth/auth-rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  getRequestIp: mocks.getRequestIp,
}));

import { POST } from "@/app/api/auth/signup/route";

const REQUEST_ID = "signup-security-test-123";
const SIGNUP_IP = "203.0.113.10";

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
    mocks.userCreate.mockResolvedValue({
      id: "user-should-not-be-created",
      name: "Novo Usuário",
      email: "novo@example.com",
      showValues: true,
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

  it("keeps the successful public response and propagates the request id", async () => {
    mocks.userCreate.mockResolvedValue({
      id: "user-123",
      name: "Novo Usuário",
      email: "novo@example.com",
      showValues: true,
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(body).toEqual({
      success: true,
      message: "Usuário criado com sucesso!",
      data: {
        id: "user-123",
        name: "Novo Usuário",
        email: "novo@example.com",
        showValues: true,
      },
    });
  });

  it("does not reveal that an email already belongs to an account", async () => {
    mocks.userCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expect(body.message).toBe(
      "Não foi possível concluir o cadastro com os dados informados"
    );
    expect(body.message).not.toMatch(/e-mail.*uso/i);
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
