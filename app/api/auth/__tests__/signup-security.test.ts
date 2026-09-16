import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bcryptHash: vi.fn(),
  userCreate: vi.fn(),
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

import { POST } from "@/app/api/auth/signup/route";

const REQUEST_ID = "signup-security-test-123";

function signupRequest() {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": REQUEST_ID,
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
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
