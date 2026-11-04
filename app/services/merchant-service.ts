import { createBaseService } from "@/app/services/base-service";
import type { MerchantDTO, MerchantMonthSummary } from "@/app/types/merchant";

type MerchantListResponse = {
  items: MerchantDTO[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: MerchantMonthSummary;
};

const baseMerchantService =
  createBaseService<MerchantDTO, MerchantListResponse>("merchants");

export const merchantService = {
  ...baseMerchantService,

  async searchOptions(search = "") {
    const normalizedSearch = search.trim();
    const response = await baseMerchantService.getAll({
      ...(normalizedSearch ? { search: normalizedSearch } : {}),
      isActive: true,
      page: 1,
      pageSize: 20,
    });

    return response.data?.items ?? [];
  },

  async getAllOptions() {
    const pageSize = 100;
    const first = await baseMerchantService.getAll({ page: 1, pageSize });
    const totalPages = Math.max(1, first.data?.totalPages ?? 1);
    // As páginas seguintes saem em paralelo em vez de uma depois da outra.
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        baseMerchantService.getAll({ page: index + 2, pageSize }),
      ),
    );

    return [first, ...rest].flatMap((response) => response.data?.items ?? []);
  },
};
