import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  fetchBcbSgsIndicator: vi.fn(),
}));

vi.mock(
  "@/app/lib/economic-indicators/bcb-sgs-client",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/app/lib/economic-indicators/bcb-sgs-client")
      >();
    return {
      ...actual,
      fetchBcbSgsIndicator: clientMocks.fetchBcbSgsIndicator,
    };
  },
);

import {
  BCB_SGS_INDICATORS,
  type EconomicIndicatorKey,
} from "@/app/lib/economic-indicators/bcb-sgs-client";
import { loadEconomicIndicatorSnapshot } from "@/app/lib/economic-indicators/economic-indicators";
import { prisma } from "@/app/lib/prisma";

afterEach(async () => {
  clientMocks.fetchBcbSgsIndicator.mockReset();
  await prisma.economicIndicatorObservation.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function externalIndicator(key: EconomicIndicatorKey) {
  const definition = BCB_SGS_INDICATORS[key];
  const values = {
    IPCA_12M: 3_700_000,
    SELIC_ANNUALIZED: 15_000_000,
    CDI_DAILY: 55_131,
  } as const;
  return {
    key,
    seriesCode: definition.seriesCode,
    valueMicros: values[key],
    unit: definition.unit,
    period: definition.period,
    referenceDate:
      key === "IPCA_12M"
        ? new Date("2026-08-01T00:00:00.000Z")
        : new Date("2026-10-02T00:00:00.000Z"),
    source: "BCB_SGS" as const,
  };
}

describe("economic indicator cache", () => {
  it("persiste as séries oficiais e reutiliza cache fresco", async () => {
    clientMocks.fetchBcbSgsIndicator.mockImplementation(
      async (key: EconomicIndicatorKey) => externalIndicator(key),
    );
    const now = new Date("2026-10-02T12:00:00.000Z");

    const first = await loadEconomicIndicatorSnapshot(now);

    expect(clientMocks.fetchBcbSgsIndicator).toHaveBeenCalledTimes(3);
    expect(first.indicators).toEqual([
      expect.objectContaining({
        key: "IPCA_12M",
        value: 3.7,
        unitLabel: "%",
        isStale: false,
      }),
      expect.objectContaining({
        key: "SELIC_ANNUALIZED",
        value: 15,
        unitLabel: "% a.a.",
        isStale: false,
      }),
      expect.objectContaining({
        key: "CDI_DAILY",
        value: 0.055131,
        unitLabel: "% a.d.",
        isStale: false,
      }),
    ]);
    expect(await prisma.economicIndicatorObservation.count()).toBe(3);

    clientMocks.fetchBcbSgsIndicator.mockClear();
    const cached = await loadEconomicIndicatorSnapshot(
      new Date("2026-10-02T13:00:00.000Z"),
    );

    expect(clientMocks.fetchBcbSgsIndicator).not.toHaveBeenCalled();
    expect(cached.indicators.every((item) => !item.isStale)).toBe(true);
  });

  it("preserva dado stale quando o BCB fica indisponível", async () => {
    await prisma.economicIndicatorObservation.create({
      data: {
        key: "IPCA_12M",
        seriesCode: 13522,
        valueMicros: 3_500_000,
        unit: "PERCENT",
        period: "TWELVE_MONTHS",
        referenceDate: new Date("2026-08-01T00:00:00.000Z"),
        source: "BCB_SGS",
        fetchedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });
    clientMocks.fetchBcbSgsIndicator.mockRejectedValue(
      new Error("BCB indisponível"),
    );

    const snapshot = await loadEconomicIndicatorSnapshot(
      new Date("2026-10-02T12:00:00.000Z"),
    );

    expect(snapshot.indicators[0]).toMatchObject({
      key: "IPCA_12M",
      value: 3.5,
      isStale: true,
    });
    expect(snapshot.indicators[1]).toMatchObject({
      key: "SELIC_ANNUALIZED",
      value: null,
    });
    expect(snapshot.indicators[2]).toMatchObject({
      key: "CDI_DAILY",
      value: null,
    });
    expect(await prisma.economicIndicatorObservation.count()).toBe(1);
  });

  it("atualiza a mesma data de referência sem duplicar observação", async () => {
    const now = new Date("2026-10-02T12:00:00.000Z");
    clientMocks.fetchBcbSgsIndicator.mockImplementation(
      async (key: EconomicIndicatorKey) => externalIndicator(key),
    );
    await loadEconomicIndicatorSnapshot(now);

    await prisma.economicIndicatorObservation.updateMany({
      data: { fetchedAt: new Date("2026-10-01T00:00:00.000Z") },
    });
    clientMocks.fetchBcbSgsIndicator.mockImplementation(
      async (key: EconomicIndicatorKey) => ({
        ...externalIndicator(key),
        valueMicros:
          key === "IPCA_12M" ? 3_800_000 : externalIndicator(key).valueMicros,
      }),
    );

    const refreshed = await loadEconomicIndicatorSnapshot(
      new Date("2026-10-03T12:00:00.000Z"),
    );

    expect(refreshed.indicators[0].value).toBe(3.8);
    expect(await prisma.economicIndicatorObservation.count()).toBe(3);
  });
});
