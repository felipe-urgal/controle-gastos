import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { prisma } from "@/app/lib/prisma";
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanup: Array<{ userId: string; email: string; ips: string[] }> = [];

afterEach(async () => {
  for (const { userId, email, ips } of cleanup.splice(0)) {
    await prisma.user.deleteMany({ where: { id: userId } });
    await clearRateLimit("login-principal", email);
    for (const ip of ips) {
      await clearRateLimit("login-ip", ip);
      await clearRateLimit("login-pair", `${ip}|${email}`);
    }
  }
});

async function createUser(ips: string[]) {
  const email = `login-rl-${randomUUID()}@example.test`;
  const user = await prisma.user.create({
    data: {
      name: "Usuário login",
      email,
      password: await bcrypt.hash("SenhaCorreta-123", 4),
      emailVerifiedAt: new Date(),
    },
  });
  cleanup.push({ userId: user.id, email, ips });
  return email;
}

function loginRequest(ip: string, email: string, password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email, password }),
  });
}

describe("login rate limit", () => {
  it("does not let failures from attacker IP A lock the victim on IP B", async () => {
    const ipA = `atk-${randomUUID()}`;
    const ipB = `vic-${randomUUID()}`;
    const email = await createUser([ipA, ipB]);

    for (let i = 0; i < 5; i += 1) {
      expect((await login(loginRequest(ipA, email, "errada-123"))).status).toBe(401);
    }
    const blocked = await login(loginRequest(ipA, email, "errada-123"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();

    const victim = await login(loginRequest(ipB, email, "SenhaCorreta-123"));
    expect(victim.status).toBe(200);
  });

  it("still limits distributed brute force against one e-mail", async () => {
    const ips = Array.from({ length: 51 }, () => `dist-${randomUUID()}`);
    const email = await createUser(ips);

    for (const ip of ips.slice(0, 50)) {
      expect((await login(loginRequest(ip, email, "errada-123"))).status).toBe(401);
    }
    const next = await login(loginRequest(ips[50], email, "errada-123"));
    expect(next.status).toBe(429);
  }, 60_000);

  it("clears pair and principal buckets on success", async () => {
    const ip = `ok-${randomUUID()}`;
    const email = await createUser([ip]);

    for (let i = 0; i < 4; i += 1) {
      await login(loginRequest(ip, email, "errada-123"));
    }
    expect((await login(loginRequest(ip, email, "SenhaCorreta-123"))).status).toBe(200);
    for (let i = 0; i < 5; i += 1) {
      expect((await login(loginRequest(ip, email, "errada-123"))).status).toBe(401);
    }
  });

  it("does not exhaust the IP bucket with many valid logins behind one NAT", async () => {
    const ip = `nat-${randomUUID()}`;
    const email = await createUser([ip]);

    for (let i = 0; i < 40; i += 1) {
      expect((await login(loginRequest(ip, email, "SenhaCorreta-123"))).status).toBe(200);
    }
  }, 60_000);
});
