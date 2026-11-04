// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { financialCommitmentsService } from "@/app/services/financial-commitments-service";

afterEach(() => vi.unstubAllGlobals());

describe("financialCommitmentsService.exportIcs", () => {
  it("pede o arquivo com moeda, horizonte e sem valores quando ocultos, e baixa com o nome do servidor", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n", {
        status: 200,
        headers: {
          "content-type": "text/calendar",
          "content-disposition": 'attachment; filename="compromissos-60-dias.ics"',
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    const downloaded: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloaded.push(this.download);
    });

    await financialCommitmentsService.exportIcs("BRL", 60, false);

    expect(fetchMock).toHaveBeenCalledWith("/api/commitments/ics?currency=BRL&days=60&values=0", { credentials: "include" });
    expect(downloaded).toEqual(["compromissos-60-dias.ics"]);
    click.mockRestore();
  });

  it("com valores visíveis não manda values; erro da API vira mensagem", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ success: false, error: { message: "Horizonte inválido" } }, { status: 400 }))
      .mockResolvedValueOnce(new Response("não é json", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(financialCommitmentsService.exportIcs("USD", 30, true)).rejects.toThrow("Horizonte inválido");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/commitments/ics?currency=USD&days=30");
    await expect(financialCommitmentsService.exportIcs("USD", 30, true)).rejects.toThrow("Não foi possível exportar os compromissos.");
  });
});
