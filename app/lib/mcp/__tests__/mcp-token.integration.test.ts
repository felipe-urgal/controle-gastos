import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  authenticateMcpBearerToken,
  createMcpAccessTokenForUser,
  listMcpAccessTokensForUser,
  revokeAllMcpAccessTokensForUser,
  revokeMcpAccessTokenForUser,
} from "@/app/lib/mcp/mcp-token";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

async function createUser(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: `MCP ${label}`,
      email: `mcp-${label}-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("MCP access tokens", () => {
  it("persiste apenas hash e autentica o bearer válido", async () => {
    const user = await createUser("owner");
    const now = new Date("2026-10-02T12:00:00.000Z");

    const created = await createMcpAccessTokenForUser(
      user.id,
      { name: "Claude", expiresInDays: 90 },
      now,
    );

    expect(created.token).toMatch(/^cgmcp_/);
    const stored = await prisma.mcpAccessToken.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.tokenHash).not.toContain(created.token);
    expect(stored.scope).toBe("finance:read");

    const principal = await authenticateMcpBearerToken(
      `Bearer ${created.token}`,
      new Date("2026-10-02T12:01:00.000Z"),
    );

    expect(principal).toEqual({
      userId: user.id,
      tokenId: created.id,
      scope: "finance:read",
    });
  });

  it("revoga somente token pertencente ao usuário", async () => {
    const [owner, other] = await Promise.all([
      createUser("owner"),
      createUser("other"),
    ]);
    const created = await createMcpAccessTokenForUser(owner.id, {
      name: "Desktop",
      expiresInDays: 30,
    });

    await expect(
      revokeMcpAccessTokenForUser(other.id, created.id),
    ).rejects.toMatchObject({
      status: 404,
      code: "MCP_TOKEN_NOT_FOUND",
    });

    await revokeMcpAccessTokenForUser(owner.id, created.id);

    await expect(
      authenticateMcpBearerToken(`Bearer ${created.token}`),
    ).resolves.toBeNull();

    const listed = await listMcpAccessTokensForUser(owner.id);
    expect(listed.totalActive).toBe(0);
    expect(listed.items[0]).toMatchObject({
      id: created.id,
      status: "REVOKED",
    });
  });

  it("respeita o limite de 5 tokens ativos sob concorrência", async () => {
    const user = await createUser("race");
    for (let i = 0; i < 4; i += 1) {
      await createMcpAccessTokenForUser(user.id, {
        name: `T${i}`,
        expiresInDays: 30,
      });
    }

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) =>
        createMcpAccessTokenForUser(user.id, {
          name: `Race ${i}`,
          expiresInDays: 30,
        }),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toMatchObject({
          status: 409,
          code: "MCP_TOKEN_LIMIT_REACHED",
        });
      }
    }
    await expect(
      prisma.mcpAccessToken.count({ where: { userId: user.id } }),
    ).resolves.toBe(5);
  });

  it("sempre lista tokens ativos antigos, mesmo com muito histórico", async () => {
    const user = await createUser("list");
    const old = await createMcpAccessTokenForUser(
      user.id,
      { name: "Antigo ativo", expiresInDays: 365 },
      new Date(),
    );
    await prisma.mcpAccessToken.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        userId: user.id,
        name: `Revogado ${i}`,
        tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
        tokenPrefix: "cgmcp_revoked",
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: new Date(),
        createdAt: new Date(Date.now() + 1_000 + i),
      })),
    });

    const listed = await listMcpAccessTokensForUser(user.id);
    expect(listed.totalActive).toBe(1);
    expect(listed.items.find((item) => item.id === old.id)?.status).toBe("ACTIVE");
    expect(listed.items).toHaveLength(21);
  });

  it("revoga todos os tokens ativos do usuário", async () => {
    const user = await createUser("revoke-all");
    const created = await createMcpAccessTokenForUser(user.id, {
      name: "Um",
      expiresInDays: 30,
    });

    await expect(revokeAllMcpAccessTokensForUser(user.id)).resolves.toBe(1);
    await expect(
      authenticateMcpBearerToken(`Bearer ${created.token}`),
    ).resolves.toBeNull();
  });

  it("rejeita token expirado e usuário inativo", async () => {
    const user = await createUser("expiry");
    const created = await createMcpAccessTokenForUser(
      user.id,
      { name: "Short", expiresInDays: 30 },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    await expect(
      authenticateMcpBearerToken(
        `Bearer ${created.token}`,
        new Date("2026-02-01T00:00:00.000Z"),
      ),
    ).resolves.toBeNull();

    const active = await createMcpAccessTokenForUser(
      user.id,
      { name: "Active", expiresInDays: 365 },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    await expect(
      authenticateMcpBearerToken(
        `Bearer ${active.token}`,
        new Date("2026-02-01T00:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });
});
