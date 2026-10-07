import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/services/api-client", () => ({
  apiClient: apiClientMock,
}));

import { merchantService } from "@/app/services/merchant-service";

function merchant(index: number) {
  return {
    id: `merchant-${index}`,
    name: `Merchant ${index}`,
    isActive: true,
    transactionsCount: 0,
    aliasesCount: 0,
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
  };
}

describe("merchantService.getAllOptions", () => {
  beforeEach(() => {
    apiClientMock.mockReset();
  });

  it("loads pages beyond the first 100 merchants", async () => {
    apiClientMock.mockImplementation(async (url: string) => {
      if (url === "/api/merchants?page=1&pageSize=100") {
        return {
          success: true,
          data: {
            items: Array.from({ length: 100 }, (_, index) => merchant(index + 1)),
            total: 101,
            page: 1,
            pageSize: 100,
            totalPages: 2,
          },
        };
      }

      if (url === "/api/merchants?page=2&pageSize=100") {
        return {
          success: true,
          data: {
            items: [merchant(101)],
            total: 101,
            page: 2,
            pageSize: 100,
            totalPages: 2,
          },
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await merchantService.getAllOptions();

    expect(result).toHaveLength(101);
    expect(result.at(-1)?.id).toBe("merchant-101");
    expect(apiClientMock).toHaveBeenCalledTimes(2);
  });
  it("searches active merchant options server-side with a small page", async () => {
    apiClientMock.mockResolvedValue({
      success: true,
      data: {
        items: [merchant(42)],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    const result = await merchantService.searchOptions("  uber  ");

    expect(result).toEqual([merchant(42)]);
    expect(apiClientMock).toHaveBeenCalledWith(
      "/api/merchants?search=uber&isActive=true&page=1&pageSize=20",
      { method: "GET" },
    );
  });

});
