import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.sendEmail };
  },
}));

import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";
import { hashPasswordResetToken } from "@/app/lib/auth/password-reset-token";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanup: Array<{ userId: string; email: string; ip: string }> = [];

beforeAll(() => {
  process.env.RESEND_FROM_EMAIL = "auth@example.test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:5100";
});

afterEach(async () => {
  const entries = cleanup.splice(0);
  mocks.sendEmail.mockReset();

  await Promise.all(
    entries.flatMap(({ userId, email, ip }) => [
      prisma.user.deleteMany({ where: { id: userId } }),
      clearRateLimit("forgot-ip", ip),
      clearRateLimit("forgot-email", email),
      clearRateLimit("reset-ip", ip),
    ]),
  );
});

async function createUser() {
  const suffix = randomUUID();
  const email = `lifecycle-${suffix}@example.test`;
  const ip = `lifecycle-${suffix}`;
  const user = await prisma.user.create({
    data: {
      name: "Usuário ciclo",
      email,
      password: await bcrypt.hash("senha-antiga", 10),
      emailVerifiedAt: new Date(),
    },
  });
  cleanup.push({ userId: user.id, email, ip });
  return { user, email, ip };
}

function jsonRequest(path: string, ip: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("password reset lifecycle", () => {
  it("leaves exactly one token after concurrent forgot-password requests", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "ok" }, error: null });
    const { user, email, ip } = await createUser();

    // Rate limit por e-mail permite 3; usamos 3 requisições simultâneas.
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        forgot(jsonRequest("/api/auth/forgot-password", ip, { email })),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it("keeps the previous link when delivery of a new one fails", async () => {
    mocks.sendEmail.mockResolvedValue({
      data: null,
      error: new Error("provider unavailable"),
    });
    const { user, email, ip } = await createUser();
    const previousHash = hashPasswordResetToken(`prev-${randomUUID()}`);
    const previousExpiry = new Date(Date.now() + 30 * 60_000);
    await prisma.passwordResetToken.create({
      data: { token: previousHash, userId: user.id, expiresAt: previousExpiry },
    });

    const response = await forgot(
      jsonRequest("/api/auth/forgot-password", ip, { email }),
    );

    expect(response.status).toBe(200);
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).toBe(previousHash);
    expect(tokens[0].expiresAt.getTime()).toBe(previousExpiry.getTime());
  });

  it("lets only one of two concurrent resets with the same token succeed", async () => {
    const { user, ip } = await createUser();
    const rawToken = `reset-${randomUUID()}`;
    await prisma.passwordResetToken.create({
      data: {
        token: hashPasswordResetToken(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const responses = await Promise.all(
      ["NovaSenha-123456", "OutraSenha-654321"].map((novaSenha) =>
        reset(
          jsonRequest("/api/auth/reset-password", ip, {
            token: rawToken,
            novaSenha,
          }),
        ),
      ),
    );

    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } }),
    ).toBe(0);
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { authVersion: true },
    });
    expect(updated.authVersion).toBe(user.authVersion + 1);
  });
});
