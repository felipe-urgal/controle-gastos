import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { verifyStepUpAuth } from "@/app/lib/security/step-up-auth";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

const cleanupUserIds: string[] = [];

afterEach(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: cleanupUserIds.splice(0) } },
  });
});

function requestFor(identifier: string) {
  return new Request("http://localhost/api/user", {
    method: "DELETE",
    headers: { "x-forwarded-for": identifier },
  });
}

async function createUser(args: { mfa?: boolean } = {}) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Step Up Review",
      email: `step-up-${suffix}@example.test`,
      password: await bcrypt.hash("SenhaAtual123", 10),
      ...(args.mfa
        ? {
            totpEnabled: true,
            totpSecretEncrypted: "opaque-enrollment-envelope",
            totpActivatedAt: new Date(),
          }
        : {}),
    },
  });
  cleanupUserIds.push(user.id);
  return user;
}

describe("step-up auth", () => {
  it("consumes a recovery code exactly once", async () => {
    const user = await createUser({ mfa: true });
    const recoveryCode = "ABCD-EF01-2345-6789-ABCD";
    await prisma.totpRecoveryCode.create({
      data: {
        userId: user.id,
        codeHash: hashRecoveryCode(recoveryCode),
      },
    });

    await verifyStepUpAuth({
      request: requestFor(`recovery-${randomUUID()}`),
      userId: user.id,
      currentPassword: "SenhaAtual123",
      recoveryCode,
    });

    const consumed = await prisma.totpRecoveryCode.findFirst({
      where: { userId: user.id },
      select: { usedAt: true },
    });
    expect(consumed?.usedAt).toBeInstanceOf(Date);

    await expect(
      verifyStepUpAuth({
        request: requestFor(`replay-${randomUUID()}`),
        userId: user.id,
        currentPassword: "SenhaAtual123",
        recoveryCode,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_STEP_UP_CREDENTIALS",
    });
  });

  it("blocks the user bucket before repeated bcrypt attempts can continue", async () => {
    const user = await createUser();
    const request = requestFor(`bruteforce-${randomUUID()}`);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        verifyStepUpAuth({
          request,
          userId: user.id,
          currentPassword: "senha-incorreta",
        }),
      ).rejects.toMatchObject({ status: 401 });
    }

    await expect(
      verifyStepUpAuth({
        request,
        userId: user.id,
        currentPassword: "senha-incorreta",
      }),
    ).rejects.toMatchObject({
      status: 429,
      code: "STEP_UP_RATE_LIMITED",
    });
  });
});
