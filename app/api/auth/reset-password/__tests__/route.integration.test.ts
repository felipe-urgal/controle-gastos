import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/auth-rate-limit";
import { hashPasswordResetToken } from "@/app/lib/password-reset-token";
import { POST } from "../route";

const cleanup: Array<{
  userId: string;
  ip: string;
  tokenHash: string;
}> = [];

describe("POST /api/auth/reset-password", () => {
  afterEach(async () => {
    const entries = cleanup.splice(0);

    await Promise.all(
      entries.flatMap(({ userId, ip, tokenHash }) => [
        prisma.user.deleteMany({ where: { id: userId } }),
        clearRateLimit("reset-ip", ip),
        clearRateLimit("reset-token", tokenHash),
      ])
    );
  });

  it("consumes a reset token once and updates the password atomically", async () => {
    const suffix = randomUUID();
    const rawToken = `reset-${suffix}`;
    const tokenHash = hashPasswordResetToken(rawToken);
    const ip = `test-${suffix}`;

    const user = await prisma.user.create({
      data: {
        name: "Usuário reset",
        email: `reset-${suffix}@example.com`,
        password: await bcrypt.hash("senha-antiga", 10),
      },
    });

    cleanup.push({ userId: user.id, ip, tokenHash });

    await prisma.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const firstResponse = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          token: rawToken,
          novaSenha: "senha-nova",
        }),
      })
    );

    expect(firstResponse.status).toBe(200);
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } })
    ).toBe(0);

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { password: true },
    });
    expect(await bcrypt.compare("senha-nova", updatedUser.password)).toBe(true);

    const secondResponse = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          token: rawToken,
          novaSenha: "outra-senha",
        }),
      })
    );

    expect(secondResponse.status).toBe(400);
    expect(await bcrypt.compare("outra-senha", updatedUser.password)).toBe(false);
  });
});
