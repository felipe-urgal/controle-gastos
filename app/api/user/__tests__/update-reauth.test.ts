import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/app/lib/users/user-crud", () => ({
  userCrud: {
    getById: mocks.getById,
    update: mocks.update,
  },
}));

import { PATCH } from "@/app/api/user/route";

function updateResponse(status = 200) {
  return new Response(
    JSON.stringify({
      success: status < 400,
      data: status < 400 ? { id: "user-1", name: "Usuário" } : undefined,
      ...(status >= 400
        ? { error: { code: "INVALID_UPDATE", message: "Falha" } }
        : {}),
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "private, no-store, max-age=0",
      },
    },
  );
}

describe("PATCH /api/user reauthentication contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not require reauthentication for a regular profile update", async () => {
    mocks.update.mockResolvedValue(updateResponse());

    const response = await PATCH(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Novo nome" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reauthRequired).toBeUndefined();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("requires reauthentication and expires the session cookie after a password change", async () => {
    mocks.update.mockResolvedValue(updateResponse());

    const response = await PATCH(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "SenhaAtual123",
          newPassword: "NovaSenha123",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reauthRequired).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("token=");
  });

  it("does not expire the session when the password update fails", async () => {
    mocks.update.mockResolvedValue(updateResponse(400));

    const response = await PATCH(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "SenhaAtual123",
          newPassword: "NovaSenha123",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.reauthRequired).toBeUndefined();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
