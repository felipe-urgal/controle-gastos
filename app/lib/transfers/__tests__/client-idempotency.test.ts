import { describe, expect, it, vi } from "vitest";

import {
  fingerprintTransferInput,
  getTransferIdempotencyAttempt,
} from "@/app/lib/transfers/client-idempotency";
import type { CreateTransferInput } from "@/app/types/transfer";

const input: CreateTransferInput = {
  sourceAccountId: "11111111-1111-4111-8111-111111111111",
  destinationAccountId: "22222222-2222-4222-8222-222222222222",
  amountCents: 12345,
  year: 2026,
  month: 9,
  day: 10,
  description: "Reserva mensal",
  status: "COMPLETED",
};

describe("transfer client idempotency", () => {
  it("reutiliza a chave para retry do mesmo payload", () => {
    const generateKey = vi.fn(() => "attempt-1");
    const first = getTransferIdempotencyAttempt(null, input, generateKey);
    const retry = getTransferIdempotencyAttempt(first, { ...input }, generateKey);

    expect(retry).toEqual(first);
    expect(generateKey).toHaveBeenCalledTimes(1);
  });

  it("gera nova chave quando a tentativa muda de payload", () => {
    const keys = ["attempt-1", "attempt-2"];
    const generateKey = vi.fn(() => keys.shift() ?? "unexpected-attempt");
    const first = getTransferIdempotencyAttempt(null, input, generateKey);
    const changed = getTransferIdempotencyAttempt(
      first,
      { ...input, amountCents: input.amountCents + 1 },
      generateKey,
    );

    expect(changed.key).toBe("attempt-2");
    expect(changed.fingerprint).not.toBe(first.fingerprint);
    expect(generateKey).toHaveBeenCalledTimes(2);
  });

  it("usa somente os campos do contrato de criação no fingerprint", () => {
    expect(fingerprintTransferInput(input)).toBe(
      JSON.stringify({
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amountCents: input.amountCents,
        year: input.year,
        month: input.month,
        day: input.day,
        description: input.description,
        status: input.status,
      }),
    );
  });
});
