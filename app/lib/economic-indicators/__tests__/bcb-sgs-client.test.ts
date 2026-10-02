import { describe, expect, it, vi } from "vitest";

import {
  BCB_SGS_INDICATORS,
  fetchBcbSgsIndicator,
  type EconomicIndicatorKey,
} from "@/app/lib/economic-indicators/bcb-sgs-client";

function sgsResponse(value = "3.25", date = "01/08/2026", status = 200) {
  return new Response(JSON.stringify([{ data: date, valor: value }]), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BCB SGS client", () => {
  it.each([
    ["IPCA_12M", 13522, "PERCENT", "TWELVE_MONTHS"],
    ["SELIC_ANNUALIZED", 1178, "PERCENT_PER_YEAR", "DAILY"],
    ["CDI_DAILY", 12, "PERCENT_PER_DAY", "DAILY"],
  ] as const)(
    "consulta a série oficial de %s preservando unidade e período",
    async (key, seriesCode, unit, period) => {
      const fetchMock = vi.fn(\n        async (_input: RequestInfo | URL, _init?: RequestInit) => {\n          void _input;\n          void _init;\n          return sgsResponse("3,251234");\n        },\n      );

      const result = await fetchBcbSgsIndicator(
        key,
        fetchMock as unknown as typeof fetch,
      );

      expect(result).toEqual({
        key,
        seriesCode,
        valueMicros: 3_251_234,
        unit,
        period,
        referenceDate: new Date("2026-08-01T00:00:00.000Z"),
        source: "BCB_SGS",
      });
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
        "bcdata.sgs." + seriesCode + "/dados/ultimos/1",
      );
    },
  );

  it("mantém metadados semânticos centralizados", () => {
    expect(BCB_SGS_INDICATORS.IPCA_12M).toMatchObject({
      unitLabel: "%",
      periodLabel: "acumulado em 12 meses",
    });
    expect(BCB_SGS_INDICATORS.SELIC_ANNUALIZED).toMatchObject({
      unitLabel: "% a.a.",
      periodLabel: "taxa diária anualizada (base 252)",
    });
    expect(BCB_SGS_INDICATORS.CDI_DAILY).toMatchObject({
      unitLabel: "% a.d.",
      periodLabel: "taxa diária",
    });
  });

  it("rejeita série sem dado e payload inválido sem depender de rede", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(
      fetchBcbSgsIndicator("IPCA_12M", fetchMock),
    ).rejects.toThrow("Resposta inválida");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("repete uma única vez falha transitória", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(sgsResponse()) as unknown as typeof fetch;

    await expect(
      fetchBcbSgsIndicator("SELIC_ANNUALIZED", fetchMock),
    ).resolves.toMatchObject({ seriesCode: 1178 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não repete erro HTTP definitivo", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("", { status: 400 }),
    ) as unknown as typeof fetch;

    await expect(
      fetchBcbSgsIndicator("CDI_DAILY", fetchMock),
    ).rejects.toThrow("HTTP 400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aplica timeout explícito", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          void resolve;
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      fetchBcbSgsIndicator(
        "IPCA_12M" as EconomicIndicatorKey,
        fetchMock,
        5,
      ),
    ).rejects.toThrow("Tempo limite excedido");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
