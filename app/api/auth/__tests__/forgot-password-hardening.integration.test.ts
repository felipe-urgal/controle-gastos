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

import { POST } from "@/app/api/auth/forgot-password/route";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanup: Array<{ userId?: string; email: string; ip: string }> = [];

beforeAll(() => {
  process.env.RESEND_FROM_EMAIL = "auth@example.test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:5100";
});

afterEach(async () => {
  const entries = cleanup.splice(0);
  mocks.sendEmail.mockReset();

  await Promise.all(
    entries.flatMap(({ userId, email, ip }) => [
      ...(userId ? [prisma.user.deleteMany({ where: { id: userId } })] : []),
      clearRateLimit("forgot-ip", ip),
      clearRateLimit("forgot-email", email),
    ]),
  );
});

function forgotRequest(email: string, ip: string) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email }),
  });
}

describe("forgot-password hardening", () => {
  it("keeps the same public response when delivery fails for an existing account", async () => {
    mocks.sendEmail.mockResolvedValue({
      data: null,
      error: new Error("provider unavailable"),
    });

    const suffix = randomUUID();
    const existingEmail = `existing-${suffix}@example.test`;
    const missingEmail = `missing-${suffix}@example.test`;
    const existingIp = `existing-${suffix}`;
    const missingIp = `missing-${suffix}`;

    const user = await prisma.user.create({
      data: {
        name: "Usuário existente",
        email: existingEmail,
        password: await bcrypt.hash("SenhaAtual123", 10),
      },
    });

    cleanup.push(
      { userId: user.id, email: existingEmail, ip: existingIp },
      { email: missingEmail, ip: missingIp },
    );

    const existing = await POST(forgotRequest(existingEmail, existingIp));
    const existingBody = await existing.json();
    const missing = await POST(forgotRequest(missingEmail, missingIp));
    const missingBody = await missing.json();

    expect(existing.status).toBe(200);
    expect(missing.status).toBe(existing.status);
    expect(missingBody).toEqual(existingBody);
  });

  it("escapes the account name before interpolating transactional email HTML", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "mail-1" }, error: null });

    const suffix = randomUUID();
    const email = `html-${suffix}@example.test`;
    const ip = `html-${suffix}`;
    const user = await prisma.user.create({
      data: {
        name: '<img src=x onerror="alert(1)">',
        email,
        password: await bcrypt.hash("SenhaAtual123", 10),
      },
    });
    cleanup.push({ userId: user.id, email, ip });

    const response = await POST(forgotRequest(email, ip));
    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    const [{ html }] = mocks.sendEmail.mock.calls[0] ?? [];
    expect(String(html)).not.toContain("<img");
    expect(String(html)).toContain("&lt;img");
  });
});
