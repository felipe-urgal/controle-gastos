import { prisma } from "../app/lib/prisma.ts";
import {
  decryptTotpSecretWithKeyring,
  encryptTotpSecretWithKeyring,
  getTotpEncryptionKeyring,
  getTotpEnvelopeKeyVersion,
} from "../app/lib/security/totp-secrets.ts";

const HELP = `Uso:
  pnpm security:rotate-totp-key
  pnpm security:rotate-totp-key --apply

Sem --apply, executa somente preflight/dry-run.
O ambiente deve fornecer TOTP_ENCRYPTION_KEY, TOTP_ENCRYPTION_KEY_VERSION
e, durante rotação, TOTP_ENCRYPTION_PREVIOUS_KEYS.
`;

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}

for (const arg of args) {
  if (arg !== "--apply") {
    process.stderr.write(`Argumento desconhecido: ${arg}\n`);
    process.exit(1);
  }
}

const apply = args.has("--apply");
const keyring = getTotpEncryptionKeyring();
const BATCH_SIZE = 100;

async function forEachTotpEnvelope(visitor) {
  let cursor;

  while (true) {
    const users = await prisma.user.findMany({
      where: {
        totpEnabled: true,
        totpSecretEncrypted: { not: null },
      },
      select: {
        id: true,
        totpSecretEncrypted: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (users.length === 0) return;

    for (const user of users) {
      if (user.totpSecretEncrypted) {
        await visitor(user.id, user.totpSecretEncrypted);
      }
    }

    cursor = users.at(-1).id;
  }
}

const summary = {
  activeVersion: keyring.activeVersion,
  scanned: 0,
  alreadyActive: 0,
  wouldRotate: 0,
  rotated: 0,
  conflicts: 0,
  mode: apply ? "apply" : "dry-run",
};

try {
  // Preflight: prove every non-active envelope can be decrypted before any write.
  await forEachTotpEnvelope(async (_userId, envelope) => {
    summary.scanned += 1;
    const version = getTotpEnvelopeKeyVersion(envelope);

    if (version === keyring.activeVersion) {
      summary.alreadyActive += 1;
      return;
    }

    decryptTotpSecretWithKeyring(envelope, keyring);
    summary.wouldRotate += 1;
  });

  if (apply && summary.wouldRotate > 0) {
    await forEachTotpEnvelope(async (userId, envelope) => {
      if (getTotpEnvelopeKeyVersion(envelope) === keyring.activeVersion) {
        return;
      }

      const secret = decryptTotpSecretWithKeyring(envelope, keyring);
      const replacement = encryptTotpSecretWithKeyring(secret, keyring);
      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          totpEnabled: true,
          totpSecretEncrypted: envelope,
        },
        data: {
          totpSecretEncrypted: replacement,
        },
      });

      if (updated.count === 1) {
        summary.rotated += 1;
      } else {
        summary.conflicts += 1;
      }
    });
  }

  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (summary.conflicts > 0) {
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ROTATION_ERROR",
    })}\n`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
