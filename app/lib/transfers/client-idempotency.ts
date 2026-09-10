import type { CreateTransferInput } from "@/app/types/transfer";

export interface TransferIdempotencyAttempt {
  fingerprint: string;
  key: string;
}

type KeyGenerator = () => string;

export function fingerprintTransferInput(input: CreateTransferInput) {
  return JSON.stringify({
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    amountCents: input.amountCents,
    year: input.year,
    month: input.month,
    day: input.day,
    description: input.description,
    status: input.status,
  });
}

function defaultKeyGenerator() {
  return globalThis.crypto.randomUUID();
}

export function getTransferIdempotencyAttempt(
  current: TransferIdempotencyAttempt | null,
  input: CreateTransferInput,
  generateKey: KeyGenerator = defaultKeyGenerator,
): TransferIdempotencyAttempt {
  const fingerprint = fingerprintTransferInput(input);

  if (current?.fingerprint === fingerprint) {
    return current;
  }

  return {
    fingerprint,
    key: generateKey(),
  };
}
