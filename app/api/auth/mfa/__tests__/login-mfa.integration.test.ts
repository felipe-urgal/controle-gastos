import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { generate } from "otplib";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as verifyMfa } from "@/app/api/auth/mfa/verify/route";
import { clearRateLimit } from "@/app/lib/auth-rate-limit";
import { prisma } from "@/app/lib/prisma";
import {
  encryptTotpSecret,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";
import { generateTotpSecret } from "@/app/lib/security/totp";

const PASSWORD = "senha-segura";
const TEST_JWT_SECRET = "test-jwt-secret-with-enough-length-for-mfa-login";
const TEST_TOTP_KEY = "22".repeat(32);
const createdUserIds: string[] = [];
const rateLimitKeys: Array<{ action: string; identifier: string }> = [];

const previousJwtSecret = process.env.JWT_SECRET;
const previousTotpKey = process.env.TOTP_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.TOTP_ENCRYPTION_KEY = TEST_TOTP_KEY;
});

afterEach(async () => {
  await Promise.all(
    rateLimitKeys.splice(0).map(({ action, identifier }) =>
      clearRateLimit(action, identifier)
    )
  );

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }

  if (previousTotpKey === undefined) {
    delete process.env.TOTP_ENCRYPTION_KEY;
  } else {
    process.env.TOTP_ENCRYPTION_KEY = previousTotpKey;
  }

  await prisma.$disconnect();
});

function registerLoginRateLimits(ip: string, email: string, userId?: string) {
  rateLimitKeys.push(
    { action: "login-ip", identifier: ip },
    { action: "login-principal", identifier: `${ip}:${email}` }
  );

  if (userId) {
    rateLimitKeys.push(
      { action: "mfa-login-ip", identifier: ip },
      { action: "mfa-login-principal", identifier: userId }
    );
  }
}

async function createPasswordUser(label: string) {
  const email = `login-${label}-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      name: `Login ${label}`,
      email,
      password: await bcrypt.hash(PASSWORD, 10),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createMfaUser() {
  const secret = generateTotpSecret();
  const currentStep = BigInt(Math.floor(Date.now() / 1000 / 30));
  const email = `login-mfa-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      name: "Login MFA",
      email,
      password: await bcrypt.hash(PASSWORD, 10),
      totpEnabled: true,
      totpSecretEncrypted: encryptTotpSecret(
        secret,
        parseTotpEncryptionKey(TEST_TOTP_KEY)
      ),
      totpActivatedAt: new Date(),
      totpLastUsedStep: currentStep - BigInt(1),
    },
  });
  createdUserIds.push(user.id);
  return { user, secret };
}

function loginRequest(email: string, ip: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
}

function hasNonEmptyAuthCookie(response: Response) {
  return /(?:^|,\s*)token=[^;,]+/.test(response.headers.get("set-cookie") ?? "");
}

describe("login MFA integration", () => {
  it("preserves the existing final-session login for users without 2FA", async () => {
    const user = await createPasswordUser("no-mfa");
    const ip = `test-${randomUUID()}`;
    registerLoginRateLimits(ip, user.email);

    const response = await login(loginRequest(user.email, ip));
    const body = (await response.json()) as {
      success: boolean;
      user?: { id: string };
      mfaRequired?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user?.id).toBe(user.id);
    expect(body.mfaRequired).toBeUndefined();
    expect(hasNonEmptyAuthCookie(response)).toBe(true);
  });

  it("does not issue a final session before a valid TOTP and rejects replay", async () => {
    const { user, secret } = await createMfaUser();
    const ip = `test-${randomUUID()}`;
    registerLoginRateLimits(ip, user.email, user.id);

    const passwordResponse = await login(loginRequest(user.email, ip));
    const passwordBody = (await passwordResponse.json()) as {
      success: boolean;
      user?: unknown;
      mfaRequired?: boolean;
      mfaChallenge?: string;
      expiresInSeconds?: number;
    };

    expect(passwordResponse.status).toBe(200);
    expect(passwordBody.success).toBe(true);
    expect(passwordBody.mfaRequired).toBe(true);
    expect(passwordBody.user).toBeUndefined();
    expect(passwordBody.mfaChallenge).toBeTruthy();
    expect(passwordBody.expiresInSeconds).toBe(300);
    expect(hasNonEmptyAuthCookie(passwordResponse)).toBe(false);

    const beforeMfa = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { lastLogin: true, totpLastUsedStep: true },
    });
    expect(beforeMfa.lastLogin).toBeNull();

    const token = await generate({
      strategy: "totp",
      secret,
      algorithm: "sha1",
      digits: 6,
      period: 30,
    });

    const mfaRequest = () =>
      new Request("http://localhost/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          challenge: passwordBody.mfaChallenge,
          token,
        }),
      });

    const mfaResponse = await verifyMfa(mfaRequest());
    const mfaBody = (await mfaResponse.json()) as {
      success: boolean;
      user?: { id: string };
    };

    expect(mfaResponse.status).toBe(200);
    expect(mfaBody.success).toBe(true);
    expect(mfaBody.user?.id).toBe(user.id);
    expect(hasNonEmptyAuthCookie(mfaResponse)).toBe(true);

    const afterMfa = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { lastLogin: true, totpLastUsedStep: true },
    });
    expect(afterMfa.lastLogin).not.toBeNull();
    expect(afterMfa.totpLastUsedStep).not.toBeNull();
    expect(afterMfa.totpLastUsedStep! > beforeMfa.totpLastUsedStep!).toBe(true);

    const consumedChallenges = await prisma.mfaLoginChallenge.count({
      where: { userId: user.id, consumedAt: { not: null } },
    });
    expect(consumedChallenges).toBe(1);

    const replayResponse = await verifyMfa(mfaRequest());
    expect(replayResponse.status).toBe(401);
    expect(hasNonEmptyAuthCookie(replayResponse)).toBe(false);
  });
});
