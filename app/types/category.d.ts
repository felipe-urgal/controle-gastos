import { Prisma } from "@prisma/client";

export type CategoryModel = Prisma.Category;

export interface CategoryResponse {
  status: string | number;
  success: boolean;
  message: string;
  data: {
    items: CategoryModel[];
  };
}

export type CategoryType = "INCOME" | "EXPENSE";
