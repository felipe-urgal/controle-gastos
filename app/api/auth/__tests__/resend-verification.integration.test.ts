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

import { POST } from "@/app/api/auth/resend-verification/route";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanup: Array<{ email: string; ips: string[] }> = [];

beforeAll(() => {
  process.env.RESEND_FROM_EMAIL = "auth@example.test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:5100";
});

afterEach(async () => {
  mocks.sendEmail.mockReset();
  for (const { email, ips } of cleanup.splice(0)) {
    await prisma.user.deleteMany({ where: { email } });
    await clearRateLimit("verification-email", email);
    for (const ip of ips) {
      await clearRateLimit("resend-verification-ip", ip);
      await clearRateLimit("resend-verification-pair", `${ip}|${email}`);
    }
  }
});

function resendRequest(email: string, ip: string) {
  return new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email }),
  });
}

async function createUser(overrides: { emailVerifiedAt: Date | null; isActive?: boolean }) {
  const email = `resend-${randomUUID()}@example.test`;
  await prisma.user.create({
    data: { name: "Pendente", email, password: "hash", ...overrides },
  });
  return email;
}

describe("POST /api/auth/resend-verification", () => {
  it("answers identically for pending, verified and unknown accounts, sending only for pending", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "ok" }, error: null });
    const ip = `ip-${randomUUID()}`;
    const pending = await createUser({ emailVerifiedAt: null });
    const verified = await createUser({ emailVerifiedAt: new Date() });
    const inactive = await createUser({ emailVerifiedAt: null, isActive: false });
    const unknown = `unknown-${randomUUID()}@example.test`;
    cleanup.push(
      { email: pending, ips: [ip] },
      { email: verified, ips: [ip] },
      { email: inactive, ips: [ip] },
      { email: unknown, ips: [ip] },
    );

    const bodies: unknown[] = [];
    for (const email of [pending, verified, inactive, unknown]) {
      const response = await POST(resendRequest(email, ip));
      expect(response.status).toBe(202);
      bodies.push(await response.json());
    }

    expect(new Set(bodies.map((body) => JSON.stringify(body))).size).toBe(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe(pending);
  });

  it("keeps the public response generic when delivery fails", async () => {
    mocks.sendEmail.mockResolvedValue({ data: null, error: new Error("down") });
    const ip = `ip-${randomUUID()}`;
    const email = await createUser({ emailVerifiedAt: null });
    cleanup.push({ email, ips: [ip] });

    const response = await POST(resendRequest(email, ip));
    expect(response.status).toBe(202);
  });

  it("limits repeated requests per IP + e-mail with 429 and Retry-After", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "ok" }, error: null });
    const ip = `ip-${randomUUID()}`;
    const email = await createUser({ emailVerifiedAt: null });
    cleanup.push({ email, ips: [ip] });

    for (let i = 0; i < 3; i += 1) {
      expect((await POST(resendRequest(email, ip))).status).toBe(202);
    }
    const limited = await POST(resendRequest(email, ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });

  it("caps verification e-mails per destination even across distributed IPs", async () => {
    mocks.sendEmail.mockResolvedValue({ data: { id: "ok" }, error: null });
    const ips = Array.from({ length: 6 }, () => `ip-${randomUUID()}`);
    const email = await createUser({ emailVerifiedAt: null });
    cleanup.push({ email, ips });

    for (const ip of ips) {
      expect((await POST(resendRequest(email, ip))).status).toBe(202);
    }

    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
  });

  it("ignores invalid payloads without revealing anything", async () => {
    const response = await POST(resendRequest("not-an-email", `ip-${randomUUID()}`));
    expect(response.status).toBe(202);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
