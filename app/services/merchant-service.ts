import { createBaseService } from "@/app/services/base-service";
import type { MerchantDTO } from "@/app/types/merchant";

type MerchantListResponse = {
  items: MerchantDTO[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

const baseMerchantService =
  createBaseService<MerchantDTO, MerchantListResponse>("merchants");

export const merchantService = {
  ...baseMerchantService,

  async getAllOptions() {
    const items: MerchantDTO[] = [];
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;

    do {
      const response = await baseMerchantService.getAll({ page, pageSize });
      const data = response.data;
      items.push(...(data?.items ?? []));
      totalPages = Math.max(1, data?.totalPages ?? 1);
      page += 1;
    } while (page <= totalPages);

    return items;
  },
};
