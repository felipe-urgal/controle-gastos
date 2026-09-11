import crypto from 'node:crypto';

const periodSeconds = 30;

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error(`Invalid Base32 character: ${character}`);
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

export function currentTotp(secret, now = Date.now()) {
  const step = Math.floor(now / 1000 / periodSeconds);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return { step, token: String(binary % 1_000_000).padStart(6, '0') };
}

export async function waitForNextTotpStep(previousStep) {
  const current = Math.floor(Date.now() / 1000 / periodSeconds);
  if (current > previousStep) return;
  const nextBoundaryMs = (previousStep + 1) * periodSeconds * 1000;
  await new Promise((resolve) => setTimeout(resolve, Math.max(250, nextBoundaryMs - Date.now() + 500)));
}
