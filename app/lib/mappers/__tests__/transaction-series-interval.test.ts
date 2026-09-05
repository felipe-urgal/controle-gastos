import { describe, expect, it } from "vitest";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";

describe("transaction series interval DTO", () => {
  it("exposes the persisted interval without changing the series date contract", () => {
    const createdAt = new Date("2026-09-05T10:00:00.000Z");
    const updatedAt = new Date("2026-09-05T11:00:00.000Z");

    const dto = toTransactionDTO({
      id: "transaction-1",
      amount: 1200,
      month: 9,
      year: 2026,
      day: 5,
      type: "EXPENSE",
      kind: "NORMAL",
      description: "Recorrente",
      status: "PENDING",
      accountId: "account-1",
      userId: "user-1",
      categoryId: "category-1",
      transferId: null,
      transferRole: null,
      seriesId: "series-1",
      seriesIndex: 2,
      importSource: null,
      importFingerprint: null,
      importExternalId: null,
      createdAt,
      updatedAt,
      series: {
        id: "series-1",
        type: "RECURRING",
        frequency: "MONTHLY",
        interval: 1,
        description: "Recorrente",
        anchorDay: 5,
        occurrenceCount: 3,
        startYear: 2026,
        startMonth: 8,
        startDay: 5,
        endYear: 2026,
        endMonth: 10,
        endDay: 5,
      },
    } as any);

    expect(dto.series).toEqual({
      id: "series-1",
      type: "RECURRING",
      frequency: "MONTHLY",
      interval: 1,
      description: "Recorrente",
      anchorDay: 5,
      occurrenceCount: 3,
      start: { year: 2026, month: 8, day: 5 },
      end: { year: 2026, month: 10, day: 5 },
    });
  });
});
