import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import {
  getRecoveryCodeStatus,
  regenerateRecoveryCodes,
} from "@/app/lib/security/totp-recovery";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";
import { verifyStepUpAuth } from "@/app/lib/security/step-up-auth";

const cleanupUserIds: string[] = [];
const password = "SenhaAtual123";

afterEach(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: cleanupUserIds.splice(0) } },
  });
});

async function createMfaUser() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Recovery Review",
      email: `recovery-review-${suffix}@example.test`,
      password: await bcrypt.hash(password, 10),
      totpEnabled: true,
      totpSecretEncrypted: "opaque-recovery-only-envelope",
      totpActivatedAt: new Date(),
    },
  });
  cleanupUserIds.push(user.id);
  return user;
}

function requestFor(label: string) {
  return new Request("http://localhost/api/auth/mfa/recovery-codes", {
    method: "POST",
    headers: {
      "x-forwarded-for": `${label}-${randomUUID()}`,
      "content-type": "application/json",
    },
  });
}

describe("TOTP recovery code regeneration", () => {
  it("reports only the remaining count", async () => {
    const user = await createMfaUser();
    await prisma.totpRecoveryCode.createMany({
      data: [
        {
          userId: user.id,
          codeHash: hashRecoveryCode("AAAA-BBBB-CCCC-DDDD-EEEE"),
        },
        {
          userId: user.id,
          codeHash: hashRecoveryCode("1111-2222-3333-4444-5555"),
          usedAt: new Date(),
        },
      ],
    });

    await expect(getRecoveryCodeStatus(user.id)).resolves.toEqual({
      enabled: true,
      remaining: 1,
    });
  });

  it("replaces every old code after step-up and never persists plaintext", async () => {
    const user = await createMfaUser();
    const oldRecoveryCode = "ABCD-EF01-2345-6789-ABCD";
    const anotherOldCode = "AAAA-BBBB-CCCC-DDDD-EEEE";
    const oldHashes = [
      hashRecoveryCode(oldRecoveryCode),
      hashRecoveryCode(anotherOldCode),
    ];

    await prisma.totpRecoveryCode.createMany({
      data: oldHashes.map((codeHash) => ({
        userId: user.id,
        codeHash,
      })),
    });

    const result = await regenerateRecoveryCodes({
      request: requestFor("regenerate"),
      userId: user.id,
      currentPassword: password,
      recoveryCode: oldRecoveryCode,
    });

    expect(result.recoveryCodes).toHaveLength(10);
    expect(new Set(result.recoveryCodes).size).toBe(10);
    expect(result.remaining).toBe(10);

    const stored = await prisma.totpRecoveryCode.findMany({
      where: { userId: user.id },
      select: { codeHash: true, usedAt: true },
    });

    expect(stored).toHaveLength(10);
    expect(stored.every((item) => item.usedAt === null)).toBe(true);
    expect(stored.some((item) => oldHashes.includes(item.codeHash))).toBe(false);

    for (const code of result.recoveryCodes) {
      expect(stored).toContainEqual({
        codeHash: hashRecoveryCode(code),
        usedAt: null,
      });
      expect(stored.some((item) => item.codeHash === code)).toBe(false);
    }

    await expect(
      verifyStepUpAuth({
        request: requestFor("old-code"),
        userId: user.id,
        currentPassword: password,
        recoveryCode: anotherOldCode,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_STEP_UP_CREDENTIALS",
    });

    await expect(getRecoveryCodeStatus(user.id)).resolves.toEqual({
      enabled: true,
      remaining: 10,
    });
  });
});
