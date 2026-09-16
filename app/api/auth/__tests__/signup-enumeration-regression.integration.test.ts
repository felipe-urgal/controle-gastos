import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.sendEmail };
  },
}));

import { POST } from "@/app/api/auth/signup/route";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanup: Array<{ email: string; ip: string }> = [];

beforeAll(() => {
  process.env.RESEND_FROM_EMAIL = "auth@example.test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:5100";
});

afterEach(async () => {
  mocks.sendEmail.mockReset();
  const entries = cleanup.splice(0);
  await Promise.all(
    entries.flatMap(({ email, ip }) => [
      prisma.user.deleteMany({ where: { email } }),
      clearRateLimit("signup-ip", ip),
    ]),
  );
});

function requestFor(email: string, ip: string) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      name: "Usuário Review",
      email,
      password: "SenhaReview123",
    }),
  });
}

describe("signup enumeration regression", () => {
  it("returns the same public status and body for new and existing email", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "mail-1" }, error: null });

    const suffix = randomUUID();
    const email = `review-${suffix}@example.test`;
    const ip = `review-${suffix}`;
    cleanup.push({ email, ip });

    const first = await POST(requestFor(email, ip));
    const firstBody = await first.json();
    const second = await POST(requestFor(email, ip));
    const secondBody = await second.json();

    expect(first.status).toBe(202);
    expect(second.status).toBe(first.status);
    expect(secondBody).toEqual(firstBody);
    expect(firstBody).toEqual({
      success: true,
      message:
        "Se os dados puderem ser cadastrados, enviaremos um link de verificação para o e-mail informado.",
    });
  });
});
