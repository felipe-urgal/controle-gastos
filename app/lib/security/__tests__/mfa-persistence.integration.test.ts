import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import {
  consumeMfaLoginChallenge,
  consumeTotpRecoveryCode,
  hashMfaChallengeId,
  persistMfaLoginChallenge,
} from "@/app/lib/security/mfa-persistence";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

const createdUserIds: string[] = [];

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

async function createUsers() {
  const suffix = randomUUID();
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "MFA Owner",
        email: `mfa-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "MFA Other",
        email: `mfa-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(...users.map((user) => user.id));
  return users;
}

describe("MFA persistence consumption", () => {
  it("stores only the challenge hash and allows exactly one valid consumption", async () => {
    const [owner, otherUser] = await createUsers();
    const challengeId = randomUUID();
    const now = new Date("2026-09-05T15:00:00.000Z");

    await persistMfaLoginChallenge({
      userId: owner.id,
      challengeId,
      expiresAt: new Date("2026-09-05T15:05:00.000Z"),
    });

    const stored = await prisma.mfaLoginChallenge.findFirstOrThrow({
      where: { userId: owner.id },
    });
    expect(stored.jtiHash).toBe(hashMfaChallengeId(challengeId));
    expect(stored.jtiHash).not.toContain(challengeId);
    expect(stored.jtiHash).toHaveLength(64);

    expect(
      await consumeMfaLoginChallenge({
        userId: otherUser.id,
        challengeId,
        now,
      })
    ).toBe(false);

    const results = await Promise.all([
      consumeMfaLoginChallenge({ userId: owner.id, challengeId, now }),
      consumeMfaLoginChallenge({ userId: owner.id, challengeId, now }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);

    expect(
      await consumeMfaLoginChallenge({ userId: owner.id, challengeId, now })
    ).toBe(false);

    const consumed = await prisma.mfaLoginChallenge.findUniqueOrThrow({
      where: { id: stored.id },
    });
    expect(consumed.consumedAt?.toISOString()).toBe(now.toISOString());
  });

  it("rejects an expired challenge without changing its state", async () => {
    const [owner] = await createUsers();
    const challengeId = randomUUID();

    const challenge = await persistMfaLoginChallenge({
      userId: owner.id,
      challengeId,
      expiresAt: new Date("2026-09-05T14:59:59.000Z"),
    });

    expect(
      await consumeMfaLoginChallenge({
        userId: owner.id,
        challengeId,
        now: new Date("2026-09-05T15:00:00.000Z"),
      })
    ).toBe(false);

    const persisted = await prisma.mfaLoginChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
    });
    expect(persisted.consumedAt).toBeNull();
  });

  it("consumes a recovery code once without trusting another user's lookup", async () => {
    const [owner, otherUser] = await createUsers();
    const code = "A1B2-C3D4-E5F6-0123-4567";
    const now = new Date("2026-09-05T15:00:00.000Z");

    const recovery = await prisma.totpRecoveryCode.create({
      data: {
        userId: owner.id,
        codeHash: hashRecoveryCode(code),
      },
    });

    expect(
      await consumeTotpRecoveryCode({ userId: otherUser.id, code, now })
    ).toBe(false);

    const results = await Promise.all([
      consumeTotpRecoveryCode({ userId: owner.id, code, now }),
      consumeTotpRecoveryCode({ userId: owner.id, code, now }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);

    expect(await consumeTotpRecoveryCode({ userId: owner.id, code, now })).toBe(
      false
    );

    const consumed = await prisma.totpRecoveryCode.findUniqueOrThrow({
      where: { id: recovery.id },
    });
    expect(consumed.usedAt?.toISOString()).toBe(now.toISOString());
  });
});
